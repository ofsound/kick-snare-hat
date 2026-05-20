autowatch = 0;
inlets = 1;
outlets = 1;

// Load shared limits. In Node, require resolves ksh_constants.js relative to
// this file. In Max js, include() reads the sibling file and exposes
// `ksh_constants` as a global.
var KSH_CONSTANTS = (function () {
  function fail(error) {
    var message = error && error.message ? error.message : String(error || "unknown error");

    if (typeof post === "function") {
      try {
        post("[ksh] Could not load ksh_constants.js; device cannot initialize safely. " + message + "\n");
      } catch (postError) {
        // Keep the original loader failure as the visible failure path.
      }
    }

    throw new Error("ksh_constants.js is required");
  }

  if (typeof require === "function" && typeof module !== "undefined" && module.exports !== undefined) {
    try {
      return require("./ksh_constants");
    } catch (error) {
      // fall through to Max include
    }
  }
  if (typeof include === "function") {
    try {
      include("ksh_constants.js");
      if (typeof ksh_constants !== "undefined") {
        return ksh_constants;
      }
    } catch (error) {
      fail(error);
    }
  }
  fail("no require() or include() loader available");
}());

var KSH_EngineClass = null;

(function (root) {
  var MAX_STEPS = KSH_CONSTANTS.MAX_STEPS;
  var MAX_LANES = KSH_CONSTANTS.MAX_LANES;
  var SOURCE_COUNT = KSH_CONSTANTS.SOURCE_COUNT;

  function clamp(value, min, max) {
    value = parseInt(value, 10);
    if (isNaN(value)) {
      return min;
    }
    return Math.max(min, Math.min(max, value));
  }

  function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function normalizeGenerationMode(mode) {
    mode = String(mode || "").toLowerCase();
    if (mode === "perchannel" || mode === "per_channel" || mode === "per-channel") {
      return "per_channel";
    }
    return "stack";
  }

  function normalizeRate(rate) {
    return KSH_CONSTANTS.normalizeRate(rate);
  }

  function normalizeIncomingState(state) {
    var normalized;

    if (!state) {
      return null;
    }

    normalized = state.state && state.state.sources ? state.state : state;

    if (normalized.laneCount !== undefined && normalized.channelCount === undefined) {
      normalized.channelCount = normalized.laneCount;
    }

    if (normalized.lanes && !normalized.channels) {
      normalized.channels = normalized.lanes;
    }

    return normalized;
  }

  function cloneCell(cell) {
    return KSH_CONSTANTS.cloneCell(cell);
  }

  function defaultCell() {
    return KSH_CONSTANTS.defaultCell();
  }

  function makePattern() {
    var channels = [];
    var ch;
    var st;

    for (ch = 0; ch < MAX_LANES; ch += 1) {
      channels[ch] = [];
      for (st = 0; st < MAX_STEPS; st += 1) {
        channels[ch][st] = defaultCell();
      }
    }

    return channels;
  }

  function KickSnareHatEngine(options) {
    options = options || {};

    this.rng = options.rng || Math.random;
    this.emitNote = options.emitNote || function () {};
    this.emitPreview = options.emitPreview || function () {};
    this.emitStatus = options.emitStatus || function () {};
    this.emitCurrentStep = options.emitCurrentStep || function () {};
    // requestPreviewFlush is invoked when a preview becomes dirty without
    // forceEmit; the Max runtime uses it to coalesce many edits into one
    // JSON-serialize-and-send per scheduler tick. In Node tests the default
    // flushes synchronously so existing assertions continue to work.
    this.requestPreviewFlush = options.requestPreviewFlush || function () {
      this.flushPreview();
    };
    this.previewDirty = false;
    this.playingStepOneBased = 0;

    this.stepCount = 16;
    this.channelCount = 3;
    this.refreshSteps = 1;
    this.generationMode = "stack";
    this.rate = "16n";
    this.tempo = 120;
    this.stepIntervalMs = 125;
    this.swing = 0;
    this.midiChannel = 1;
    this.noteDurationMs = 100;
    this.currentStep = 0;
    this.lastFiredGlobalStep = null;
    this.phaseOffsetBeats = 0;
    this.transportPlaying = 0;
    this.editorActive = false;

    this.channels = [];
    this.sources = [];
    this.generated = makePattern();
    this.cycleCounters = {};

    this.initChannels();
    this.initSources();
    this.generateWindow(0, this.stepCount);
  }

  KickSnareHatEngine.prototype.initChannels = function () {
    var i;
    var defaultNotes = KSH_CONSTANTS.DEFAULT_CHANNEL_NOTES;
    var defaultLabels = KSH_CONSTANTS.DEFAULT_CHANNEL_LABELS;

    this.channels = [];
    for (i = 0; i < MAX_LANES; i += 1) {
      this.channels[i] = {
        label: defaultLabels[i],
        note: defaultNotes[i],
        lock: -1
      };
    }
  };

  KickSnareHatEngine.prototype.initSources = function () {
    var s;

    this.sources = [];
    for (s = 0; s < SOURCE_COUNT; s += 1) {
      this.sources[s] = makePattern();
    }
  };

  KickSnareHatEngine.prototype.status = function (message) {
    this.emitStatus(message);
  };

  KickSnareHatEngine.prototype.reportPlayingStep = function () {
    if (this.editorActive) {
      this.emitCurrentStep(this.playingStepOneBased);
    }
  };

  KickSnareHatEngine.prototype.setStepCount = function (count) {
    this.stepCount = clamp(count, 1, MAX_STEPS);
    this.currentStep = this.currentStep % this.stepCount;
    this.refreshSteps = clamp(this.refreshSteps, 1, this.stepCount);
    this.recomposeWindow(0, this.stepCount, true);
    this.status("steps " + this.stepCount);
  };

  KickSnareHatEngine.prototype.setChannelCount = function (count) {
    this.channelCount = clamp(count, 1, MAX_LANES);
    this.recomposeWindow(0, this.stepCount, true);
    this.status("channels " + this.channelCount);
  };

  KickSnareHatEngine.prototype.setRefreshSteps = function (count) {
    this.refreshSteps = clamp(count, 1, this.stepCount);
    this.status("refresh_steps " + this.refreshSteps);
  };

  KickSnareHatEngine.prototype.setGenerationMode = function (mode) {
    this.generationMode = normalizeGenerationMode(mode);
    this.recomposeWindow(0, this.stepCount, true);
    this.status("mode " + this.generationMode);
  };

  KickSnareHatEngine.prototype.setRate = function (rate) {
    this.rate = normalizeRate(rate);
    this.updateStepIntervalMs();
    this.status("rate " + this.rate);
  };

  KickSnareHatEngine.prototype.setTempo = function (tempo) {
    tempo = parseFloat(tempo);
    if (isNaN(tempo)) {
      tempo = 120;
    }
    this.tempo = Math.max(20, Math.min(300, tempo));
    this.updateStepIntervalMs();
    this.status("tempo " + this.tempo);
  };

  KickSnareHatEngine.prototype.updateStepIntervalMs = function () {
    var quarterMs = 60000 / this.tempo;
    this.stepIntervalMs = quarterMs * this.beatsPerStep();
  };

  KickSnareHatEngine.prototype.beatsPerStep = function () {
    var ratios = {
      "4n": 1,
      "4nt": 2 / 3,
      "8n": 1 / 2,
      "8nt": 1 / 3,
      "16n": 1 / 4,
      "16nt": 1 / 6,
      "32n": 1 / 8,
      "32nt": 1 / 12
    };

    return ratios[this.rate] || ratios["16n"];
  };

  KickSnareHatEngine.prototype.setSwing = function (amount) {
    this.swing = clamp(amount, 0, 100);
    this.status("swing " + this.swing);
  };

  KickSnareHatEngine.prototype.setMidiChannel = function (channel) {
    this.midiChannel = clamp(channel, 1, 16);
    this.status("midi_channel " + this.midiChannel);
  };

  KickSnareHatEngine.prototype.setNoteDurationMs = function (duration) {
    this.noteDurationMs = clamp(duration, 10, 5000);
    this.status("duration_ms " + this.noteDurationMs);
  };

  KickSnareHatEngine.prototype.setPhaseOffsetBeats = function (offset) {
    offset = parseFloat(offset);
    if (isNaN(offset)) {
      offset = 0;
    }
    this.phaseOffsetBeats = offset;
    this.lastFiredGlobalStep = null;
    this.status("phase_offset_beats " + this.phaseOffsetBeats);
  };

  KickSnareHatEngine.prototype.setChannelLabel = function (channel, label) {
    channel = clamp(channel, 0, MAX_LANES - 1);
    this.channels[channel].label = String(label || "");
    this.status("channel_label " + (channel + 1) + " " + this.channels[channel].label);
  };

  KickSnareHatEngine.prototype.setChannelNote = function (channel, note) {
    channel = clamp(channel, 0, MAX_LANES - 1);
    this.channels[channel].note = clamp(note, 0, 127);
    this.status("channel_note " + (channel + 1) + " " + this.channels[channel].note);
  };

  KickSnareHatEngine.prototype.setChannelLock = function (channel, lock) {
    channel = clamp(channel, 0, MAX_LANES - 1);
    this.channels[channel].lock = clamp(lock, -1, SOURCE_COUNT - 1);
    this.recomposeWindow(0, this.stepCount, true);
    this.status(
      "channel_lock " +
      (channel + 1) +
      " " +
      (this.channels[channel].lock < 0 ? "random" : this.channels[channel].lock + 1)
    );
  };

  // Returns the generated cell at (channel, step) if that cell is currently
  // sourced from `source` (or the channel is locked to `source`). Otherwise
  // returns null, meaning a source edit at (source, channel, step) has no
  // effect on the visible generated grid and the preview can be skipped
  // entirely. This is the hot-path optimization for velocity / paint drags:
  // we mutate exactly one cell instead of recomposing channelCount × stepCount.
  function clampSource(source) { return clamp(source, 0, SOURCE_COUNT - 1); }
  function clampChannel(channel) { return clamp(channel, 0, MAX_LANES - 1); }
  function clampStep(step) { return clamp(step, 0, MAX_STEPS - 1); }

  KickSnareHatEngine.prototype.generatedCellForSourceEdit = function (source, channel, step) {
    var generatedRow;
    var generatedCell;

    if (channel >= this.channelCount || step >= this.stepCount) {
      return null;
    }

    generatedRow = this.generated[channel];
    if (!generatedRow) {
      return null;
    }

    generatedCell = generatedRow[step];
    if (!generatedCell) {
      return null;
    }

    if (this.channels[channel].lock >= 0) {
      return this.channels[channel].lock === source ? generatedCell : null;
    }

    return generatedCell.source === source ? generatedCell : null;
  };

  KickSnareHatEngine.prototype.setCell = function (source, channel, step, enabled, velocity, gateMode, value) {
    var cell;
    var generatedCell;

    source = clampSource(source);
    channel = clampChannel(channel);
    step = clampStep(step);

    cell = this.sources[source][channel][step];
    cell.enabled = enabled ? 1 : 0;
    cell.velocity = clamp(velocity, 1, 127);
    cell.gateMode = this.normalizeGateMode(gateMode);

    if (cell.gateMode === "random") {
      cell.random = clamp(value, 0, 100);
    } else if (cell.gateMode === "cycle") {
      cell.cycle = clamp(value, 1, 64);
    }

    generatedCell = this.generatedCellForSourceEdit(source, channel, step);
    if (generatedCell) {
      generatedCell.enabled = cell.enabled;
      generatedCell.velocity = cell.velocity;
      generatedCell.gateMode = cell.gateMode;
      generatedCell.random = cell.random;
      generatedCell.cycle = cell.cycle;
      this.markPreviewDirty(false);
    }
  };

  KickSnareHatEngine.prototype.setCellEnabled = function (source, channel, step, enabled) {
    var generatedCell;

    source = clampSource(source);
    channel = clampChannel(channel);
    step = clampStep(step);
    enabled = enabled ? 1 : 0;
    this.sources[source][channel][step].enabled = enabled;

    generatedCell = this.generatedCellForSourceEdit(source, channel, step);
    if (generatedCell) {
      generatedCell.enabled = enabled;
      this.markPreviewDirty(false);
    }
  };

  KickSnareHatEngine.prototype.setCellVelocity = function (source, channel, step, velocity) {
    var generatedCell;

    source = clampSource(source);
    channel = clampChannel(channel);
    step = clampStep(step);
    velocity = clamp(velocity, 1, 127);
    this.sources[source][channel][step].velocity = velocity;

    generatedCell = this.generatedCellForSourceEdit(source, channel, step);
    if (generatedCell) {
      generatedCell.velocity = velocity;
      this.markPreviewDirty(false);
    }
  };

  KickSnareHatEngine.prototype.setCellGate = function (source, channel, step, gateMode, value) {
    var cell;
    var generatedCell;

    source = clampSource(source);
    channel = clampChannel(channel);
    step = clampStep(step);
    cell = this.sources[source][channel][step];
    cell.gateMode = this.normalizeGateMode(gateMode);

    if (cell.gateMode === "random") {
      cell.random = clamp(value, 0, 100);
    } else if (cell.gateMode === "cycle") {
      cell.cycle = clamp(value, 1, 64);
    }

    generatedCell = this.generatedCellForSourceEdit(source, channel, step);
    if (generatedCell) {
      generatedCell.gateMode = cell.gateMode;
      generatedCell.random = cell.random;
      generatedCell.cycle = cell.cycle;
      this.markPreviewDirty(false);
    }
  };

  KickSnareHatEngine.prototype.normalizeGateMode = function (gateMode) {
    return KSH_CONSTANTS.normalizeGateMode(gateMode);
  };

  KickSnareHatEngine.prototype.resetPlayback = function (emitStatus) {
    if (typeof cancelPendingNoteTasks === "function") {
      cancelPendingNoteTasks();
    }
    this.currentStep = 0;
    this.playingStepOneBased = 0;
    this.cycleCounters = {};
    this.lastFiredGlobalStep = null;
    this.transportPlaying = 0;
    this.generateWindow(0, this.stepCount, true);
    this.reportPlayingStep();
    if (emitStatus !== false) {
      this.status("reset");
    }
  };

  KickSnareHatEngine.prototype.reset = function () {
    this.resetPlayback(true);
  };

  KickSnareHatEngine.prototype.isSourceEmpty = function (sourceIndex) {
    var channel;
    var step;
    var cell;

    sourceIndex = clampSource(sourceIndex);
    for (channel = 0; channel < this.channelCount; channel += 1) {
      for (step = 0; step < this.stepCount; step += 1) {
        cell = this.sources[sourceIndex][channel][step];
        if (cell.enabled) {
          return false;
        }
      }
    }
    return true;
  };

  KickSnareHatEngine.prototype.activeSourceIndices = function () {
    var indices = [];
    var source;

    for (source = 0; source < SOURCE_COUNT; source += 1) {
      if (!this.isSourceEmpty(source)) {
        indices.push(source);
      }
    }
    return indices;
  };

  KickSnareHatEngine.prototype.pickRandomSource = function (active) {
    var pick;

    if (!active) {
      active = this.activeSourceIndices();
    }
    if (active.length === 0) {
      return 0;
    }
    pick = clamp(Math.floor(this.rng() * active.length), 0, active.length - 1);
    return active[pick];
  };

  // Re-roll source choices across the window. Used at transport refresh
  // boundaries and by reset(); not called from interactive cell edits.
  KickSnareHatEngine.prototype.generateWindow = function (startStep, length, forceEmit) {
    var offset;
    var step;
    var channel;
    var source;
    var stackSource;
    var cell;
    var activeSources;

    if (forceEmit === undefined) {
      forceEmit = false;
    }

    startStep = clamp(startStep, 0, this.stepCount - 1);
    length = clamp(length, 1, this.stepCount);

    activeSources = this.activeSourceIndices();
    stackSource = -1;
    if (this.generationMode !== "per_channel") {
      stackSource = this.pickRandomSource(activeSources);
    }

    for (offset = 0; offset < length; offset += 1) {
      step = (startStep + offset) % this.stepCount;

      for (channel = 0; channel < this.channelCount; channel += 1) {
        if (this.channels[channel].lock >= 0) {
          source = this.channels[channel].lock;
        } else if (this.generationMode === "per_channel") {
          source = this.pickRandomSource(activeSources);
        } else {
          source = stackSource;
        }

        cell = cloneCell(this.sources[source][channel][step]);
        cell.source = source;
        this.generated[channel][step] = cell;
      }
    }

    this.markPreviewDirty(forceEmit);
  };

  // Re-derive generated cells from their existing per-cell source choices.
  // Cells with no prior source choice (initial state, freshly-grown
  // stepCount/channelCount, etc.) fall back to a roll; in stack mode that
  // fallback roll is shared across the whole window so first-time output
  // still matches stack semantics.
  KickSnareHatEngine.prototype.recomposeWindow = function (startStep, length, forceEmit) {
    var offset;
    var step;
    var channel;
    var source;
    var existing;
    var cell;
    var fallbackStack = -1;
    var activeSources;

    if (forceEmit === undefined) {
      forceEmit = false;
    }

    startStep = clamp(startStep, 0, this.stepCount - 1);
    length = clamp(length, 1, this.stepCount);

    activeSources = this.activeSourceIndices();

    for (offset = 0; offset < length; offset += 1) {
      step = (startStep + offset) % this.stepCount;

      for (channel = 0; channel < this.channelCount; channel += 1) {
        if (this.channels[channel].lock >= 0) {
          source = this.channels[channel].lock;
        } else {
          existing = this.generated[channel] && this.generated[channel][step]
            ? this.generated[channel][step].source
            : -1;
          if (existing >= 0 && existing < SOURCE_COUNT) {
            source = existing;
          } else if (this.generationMode === "per_channel") {
            source = this.pickRandomSource(activeSources);
          } else {
            if (fallbackStack < 0) {
              fallbackStack = this.pickRandomSource(activeSources);
            }
            source = fallbackStack;
          }
        }

        cell = cloneCell(this.sources[source][channel][step]);
        cell.source = source;
        this.generated[channel][step] = cell;
      }
    }

    this.markPreviewDirty(forceEmit);
  };

  KickSnareHatEngine.prototype.markPreviewDirty = function (forceEmit) {
    this.previewDirty = true;
    if (forceEmit) {
      this.flushPreview();
    } else if (this.editorActive) {
      this.requestPreviewFlush();
    }
  };

  KickSnareHatEngine.prototype.flushPreview = function () {
    if (!this.previewDirty) {
      return;
    }
    this.previewDirty = false;
    this.emitPreview(this.snapshot());
  };

  KickSnareHatEngine.prototype.cycleKey = function (source, channel, step) {
    return source + ":" + channel + ":" + step;
  };

  KickSnareHatEngine.prototype.shouldFire = function (cell, channel, step) {
    var key;
    var count;

    if (!cell.enabled) {
      return false;
    }

    if (cell.gateMode === "random") {
      return this.rng() * 100 < cell.random;
    }

    if (cell.gateMode === "cycle") {
      key = this.cycleKey(cell.source, channel, step);
      count = this.cycleCounters[key] || 0;
      this.cycleCounters[key] = count + 1;
      return count % clamp(cell.cycle, 1, 64) === 0;
    }

    return true;
  };

  KickSnareHatEngine.prototype.fireStep = function (step, globalStep) {
    var channel;
    var cell;
    var notes = [];
    var note;

    step = mod(step, this.stepCount);
    this.currentStep = step;
    this.playingStepOneBased = step + 1;
    this.reportPlayingStep();

    if (step % this.refreshSteps === 0) {
      this.generateWindow(step, this.refreshSteps, true);
    }

    for (channel = 0; channel < this.channelCount; channel += 1) {
      cell = this.generated[channel][step];
      if (this.shouldFire(cell, channel, step)) {
        note = {
          lane: channel + 1,
          step: step + 1,
          globalStep: typeof globalStep === "number" ? globalStep : null,
          pitch: this.channels[channel].note,
          velocity: cell.velocity,
          channel: this.midiChannel,
          durationMs: this.noteDurationMs,
          delayMs: step % 2 === 1 ? this.stepIntervalMs * 0.5 * (this.swing / 100) : 0,
          label: this.channels[channel].label,
          source: cell.source + 1
        };
        notes.push(note);
        this.emitNote(note);
      }
    }

    return notes;
  };

  KickSnareHatEngine.prototype.globalStepForBeats = function (songBeats) {
    var beatsPerStep = this.beatsPerStep();

    songBeats = parseFloat(songBeats);
    if (isNaN(songBeats)) {
      songBeats = 0;
    }

    return Math.floor((songBeats - this.phaseOffsetBeats + 0.000000001) / beatsPerStep);
  };

  KickSnareHatEngine.prototype.transportPosition = function (songBeats, isPlaying) {
    var globalStep;
    var step;
    var discontinuity;

    songBeats = parseFloat(songBeats);
    if (isNaN(songBeats)) {
      return [];
    }

    isPlaying = parseInt(isPlaying, 10) ? 1 : 0;
    this.transportPlaying = isPlaying;

    if (!isPlaying) {
      this.lastFiredGlobalStep = null;
      return [];
    }

    globalStep = this.globalStepForBeats(songBeats);
    step = mod(globalStep, this.stepCount);

    if (this.lastFiredGlobalStep === globalStep) {
      return [];
    }

    discontinuity = this.lastFiredGlobalStep !== null && globalStep !== this.lastFiredGlobalStep + 1;
    this.lastFiredGlobalStep = globalStep;
    if (discontinuity) {
      this.status("transport_jump " + songBeats + " step " + (step + 1));
    }

    return this.fireStep(step, globalStep);
  };

  KickSnareHatEngine.prototype.snapshot = function () {
    var channels = [];
    var generated = [];
    var ch;
    var st;
    var cell;

    for (ch = 0; ch < this.channelCount; ch += 1) {
      channels.push({
        label: this.channels[ch].label,
        note: this.channels[ch].note,
        lock: this.channels[ch].lock
      });
      generated[ch] = [];
      for (st = 0; st < this.stepCount; st += 1) {
        cell = this.generated[ch][st];
        generated[ch][st] = {
          enabled: cell.enabled,
          velocity: cell.velocity,
          gateMode: cell.gateMode,
          random: cell.random,
          cycle: cell.cycle,
          source: cell.source + 1
        };
      }
    }

    return {
      stepCount: this.stepCount,
      channelCount: this.channelCount,
      refreshSteps: this.refreshSteps,
      generationMode: this.generationMode,
      rate: this.rate,
      tempo: this.tempo,
      swing: this.swing,
      midiChannel: this.midiChannel,
      phaseOffsetBeats: this.phaseOffsetBeats,
      currentStep: this.currentStep + 1,
      channels: channels,
      generated: generated
    };
  };

  KickSnareHatEngine.prototype.serialize = function () {
    return {
      stepCount: this.stepCount,
      channelCount: this.channelCount,
      refreshSteps: this.refreshSteps,
      generationMode: this.generationMode,
      rate: this.rate,
      tempo: this.tempo,
      swing: this.swing,
      midiChannel: this.midiChannel,
      noteDurationMs: this.noteDurationMs,
      phaseOffsetBeats: this.phaseOffsetBeats,
      channels: this.channels,
      sources: this.sources
    };
  };

  KickSnareHatEngine.prototype.deserialize = function (state) {
    var source;
    var channel;
    var step;
    var incomingChannel;
    var incomingSource;
    var incomingRow;

    state = normalizeIncomingState(state);
    if (!state) {
      return;
    }

    if (state.stepCount !== undefined) {
      this.stepCount = clamp(state.stepCount, 1, MAX_STEPS);
    }
    if (state.channelCount !== undefined) {
      this.channelCount = clamp(state.channelCount, 1, MAX_LANES);
    }
    if (state.refreshSteps !== undefined) {
      this.refreshSteps = clamp(state.refreshSteps, 1, this.stepCount);
    }
    this.refreshSteps = clamp(this.refreshSteps, 1, this.stepCount);
    if (state.generationMode !== undefined) {
      this.generationMode = normalizeGenerationMode(state.generationMode);
    }
    if (state.rate !== undefined) {
      this.rate = normalizeRate(state.rate);
      this.updateStepIntervalMs();
    }
    if (state.tempo !== undefined) {
      state.tempo = parseFloat(state.tempo);
      this.tempo = isNaN(state.tempo) ? this.tempo : Math.max(20, Math.min(300, state.tempo));
      this.updateStepIntervalMs();
    }
    if (state.swing !== undefined) {
      this.swing = clamp(state.swing, 0, 100);
    }
    if (state.midiChannel !== undefined) {
      this.midiChannel = clamp(state.midiChannel, 1, 16);
    }
    if (state.noteDurationMs !== undefined) {
      this.noteDurationMs = clamp(state.noteDurationMs, 10, 5000);
    }
    this.phaseOffsetBeats = parseFloat(state.phaseOffsetBeats) || 0;

    if (state.channels) {
      for (channel = 0; channel < Math.min(MAX_LANES, state.channels.length); channel += 1) {
        incomingChannel = state.channels[channel] || {};
        if (incomingChannel.label !== undefined) {
          this.channels[channel].label = String(incomingChannel.label);
        }
        if (incomingChannel.note !== undefined) {
          this.channels[channel].note = clamp(incomingChannel.note, 0, 127);
        }
        if (incomingChannel.lock !== undefined) {
          this.channels[channel].lock = clamp(incomingChannel.lock, -1, SOURCE_COUNT - 1);
        }
      }
    }

    if (state.sources) {
      for (source = 0; source < Math.min(SOURCE_COUNT, state.sources.length); source += 1) {
        incomingSource = state.sources[source] || [];
        for (channel = 0; channel < Math.min(MAX_LANES, incomingSource.length); channel += 1) {
          incomingRow = incomingSource[channel] || [];
          for (step = 0; step < Math.min(MAX_STEPS, incomingRow.length); step += 1) {
            this.sources[source][channel][step] = cloneCell(incomingRow[step]);
          }
        }
      }
    }

    this.resetPlayback(false);
  };

  KickSnareHatEngine.normalizeIncomingState = normalizeIncomingState;
  KSH_EngineClass = KickSnareHatEngine;
  root.KickSnareHatEngine = KickSnareHatEngine;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = KickSnareHatEngine;
  }
}(this));

var kshEngine = null;
var kshPendingPreviewTask = null;

function postPersistenceError(error) {
  var message;

  if (typeof post !== "function") {
    return;
  }

  message = error && error.message ? error.message : String(error || "unknown error");
  try {
    post("[ksh] Could not restore saved state; keeping current pattern. " + message + "\n");
  } catch (postError) {
    // Avoid making persistence recovery depend on Max console output.
  }
}

function cancelPendingNoteTasks() {
  safeMessnamed("ksh_scheduler_commands", "clear");
}

function safeMessnamed() {
  // Wrapper used by all engine_events emitters. messnamed can throw during
  // device reload/recompile while Max is rewiring named buses; swallowing
  // the error keeps the engine alive across those transient windows.
  if (typeof messnamed !== "function") {
    return;
  }
  try {
    messnamed.apply(this, arguments);
  } catch (error) {
    KSH_CONSTANTS.debugPost("messnamed failed", error);
    // transient — see comment above
  }
}

function emitFullState() {
  if (typeof JSON === "undefined") {
    return;
  }
  safeMessnamed("ksh_engine_events", "engine_state", JSON.stringify(ensureEngine().serialize()));
}

if (typeof module === "undefined" || !module.exports) {
  function safeOutlet(index) {
    var args;

    if (typeof outlet !== "function") {
      return;
    }

    args = arrayfromargs(arguments);
    args.shift();

    try {
      outlet.apply(this, [index].concat(args));
    } catch (error) {
      KSH_CONSTANTS.debugPost("outlet failed", error);
      // Keep the Live audio thread clear of transient JS outlet errors while
      // Max recompiles or reloads the device.
    }
  }

  kshEngine = new KSH_EngineClass({
    emitNote: function (note) {
      safeOutlet(0, note.pitch, note.velocity, note.durationMs, note.channel, note.delayMs || 0);
    },
    emitPreview: function (snapshot) {
      if (typeof JSON !== "undefined") {
        safeMessnamed("ksh_engine_events", "preview", JSON.stringify(snapshot));
      }
    },
    requestPreviewFlush: function () {
      // Coalesce many cell edits within the same scheduler tick into a
      // single flushPreview() so we serialize/stringify/send at most once
      // per tick instead of per-edit.
      if (kshPendingPreviewTask) {
        return;
      }
      if (typeof Task !== "function") {
        if (kshEngine) {
          kshEngine.flushPreview();
        }
        return;
      }
      kshPendingPreviewTask = new Task(function () {
        kshPendingPreviewTask = null;
        if (kshEngine) {
          kshEngine.flushPreview();
        }
      });
      kshPendingPreviewTask.schedule(0);
    },
    emitStatus: function (message) {
      var args;
      var selector;

      message = String(message || "");
      args = message.split(" ");
      selector = args.shift();
      if (selector) {
        safeMessnamed.apply(this, ["ksh_engine_events", selector].concat(args));
      }
    },
    emitCurrentStep: function (step) {
      safeMessnamed("ksh_engine_events", "current_step", step);
    }
  });
}

function zeroBased(value) {
  value = parseInt(value, 10);
  if (isNaN(value)) {
    return 0;
  }
  return Math.max(0, value - 1);
}

function ensureEngine() {
  if (!kshEngine && KSH_EngineClass) {
    kshEngine = new KSH_EngineClass();
  }
  return kshEngine;
}

function transport_position(songBeats, isPlaying) {
  ensureEngine().transportPosition(songBeats, isPlaying);
}

function reset() {
  ensureEngine().reset();
  emitFullState();
}

function steps(value) {
  ensureEngine().setStepCount(value);
}

function channels(value) {
  ensureEngine().setChannelCount(value);
}

function refresh_steps(value) {
  ensureEngine().setRefreshSteps(value);
}

function mode(value) {
  ensureEngine().setGenerationMode(value);
}

function rate(value) {
  ensureEngine().setRate(value);
}

function tempo(value) {
  ensureEngine().setTempo(value);
}

function swing(value) {
  ensureEngine().setSwing(value);
}

function midi_channel(value) {
  ensureEngine().setMidiChannel(value);
}

function duration_ms(value) {
  ensureEngine().setNoteDurationMs(value);
}

function phase_offset_beats(value) {
  ensureEngine().setPhaseOffsetBeats(value);
}

function channel_label() {
  var args = arrayfromargs(arguments);
  var channel = zeroBased(args.shift());
  ensureEngine().setChannelLabel(channel, args.join(" "));
}

function channel_note(channel, note) {
  ensureEngine().setChannelNote(zeroBased(channel), note);
}

function channel_lock(channel, lock) {
  var normalized = String(lock).toLowerCase() === "random" ? -1 : zeroBased(lock);
  ensureEngine().setChannelLock(zeroBased(channel), normalized);
}

function cell(source, channel, stepIndex, enabled, velocity, gateMode, value) {
  ensureEngine().setCell(
    zeroBased(source),
    zeroBased(channel),
    zeroBased(stepIndex),
    parseInt(enabled, 10) !== 0,
    velocity,
    gateMode,
    value
  );
}

function cell_enabled(source, channel, stepIndex, enabled) {
  ensureEngine().setCellEnabled(
    zeroBased(source),
    zeroBased(channel),
    zeroBased(stepIndex),
    parseInt(enabled, 10) !== 0
  );
}

function cell_velocity(source, channel, stepIndex, velocity) {
  ensureEngine().setCellVelocity(zeroBased(source), zeroBased(channel), zeroBased(stepIndex), velocity);
}

function cell_gate(source, channel, stepIndex, gateMode, value) {
  ensureEngine().setCellGate(zeroBased(source), zeroBased(channel), zeroBased(stepIndex), gateMode, value);
}

function snapshot() {
  if (typeof JSON === "undefined") {
    return;
  }
  safeMessnamed("ksh_engine_events", "preview", JSON.stringify(ensureEngine().snapshot()));
}

function sync_all() {
  emitFullState();
  snapshot();
}

function request_state() {
  emitFullState();
}

function getvalueof() {
  if (typeof JSON === "undefined") {
    return "";
  }
  return JSON.stringify(ensureEngine().serialize());
}

function setvalueof(value) {
  var engine;
  var parsed;
  var previous;

  if (typeof JSON === "undefined" || !value) {
    return;
  }

  if (typeof value !== "string") {
    value = String(value);
  }

  engine = ensureEngine();
  previous = JSON.parse(JSON.stringify(engine.serialize()));

  try {
    parsed = JSON.parse(value);
    engine.deserialize(parsed);
  } catch (error) {
    try {
      engine.deserialize(previous);
    } catch (restoreError) {
      KSH_CONSTANTS.debugPost("setvalueof restore failed", restoreError);
    }
    postPersistenceError(error);
    return;
  }

  emitFullState();
}

function state(json) {
  if (typeof JSON !== "undefined" && json) {
    try {
      ensureEngine().deserialize(JSON.parse(json));
      emitFullState();
    } catch (error) {
      KSH_CONSTANTS.debugPost("state JSON failed", error);
    }
  }
}

function editor_active(val) {
  var engine = ensureEngine();
  engine.editorActive = parseInt(val, 10) !== 0;
  engine.reportPlayingStep();
}
