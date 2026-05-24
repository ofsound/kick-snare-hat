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
	  var DEFAULT_CHANNEL_COUNT = KSH_CONSTANTS.DEFAULT_CHANNEL_COUNT;
	  var DEFAULT_GENERATION_MODE = KSH_CONSTANTS.DEFAULT_GENERATION_MODE;
	  var SOURCE_COUNT = KSH_CONSTANTS.SOURCE_COUNT;
	  var NATIVE_PLAYBACK_MAX_ROWS = 2048;
	  var NATIVE_PROBABILITY_MULTIPLIER = 16;
	  var TIMING_HUMANIZE_NATIVE_SCALE = 0.2;

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

	  function gcd(a, b) {
	    var t;

	    a = Math.abs(parseInt(a, 10) || 0);
	    b = Math.abs(parseInt(b, 10) || 0);
	    while (b) {
	      t = b;
	      b = a % b;
	      a = t;
	    }
	    return a || 1;
	  }

	  function lcm(a, b) {
	    a = Math.max(1, parseInt(a, 10) || 1);
	    b = Math.max(1, parseInt(b, 10) || 1);
	    return (a / gcd(a, b)) * b;
	  }

  function normalizeGenerationMode(mode) {
    mode = String(mode || "").toLowerCase();
    if (mode === "perchannel" || mode === "per_channel" || mode === "per-channel") {
      return "per_channel";
    }
    if (mode === "static") {
      return "static";
    }
    return "stack";
  }

  function normalizeRate(rate) {
    return KSH_CONSTANTS.normalizeRate(rate);
  }

  function normalizeChannelPlaybackMode(mode) {
    return KSH_CONSTANTS.normalizeChannelPlaybackMode(mode);
  }

  function normalizeToggle(value) {
    value = String(value).toLowerCase();
    return !(value === "0" || value === "false" || value === "off");
  }

  function clampFloat(value, min, max) {
    value = parseFloat(value);
    if (isNaN(value)) {
      return min;
    }
    return Math.max(min, Math.min(max, value));
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

  function makeSourceChannelMutes() {
    var mutes = [];
    var source;
    var channel;

    for (source = 0; source < SOURCE_COUNT; source += 1) {
      mutes[source] = [];
      for (channel = 0; channel < MAX_LANES; channel += 1) {
        mutes[source][channel] = 0;
      }
    }

    return mutes;
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
    this.channelCount = DEFAULT_CHANNEL_COUNT;
    this.refreshSteps = 1;
    this.generationMode = DEFAULT_GENERATION_MODE;
    this.staticSource = 0;
    this.rate = "16n";
    this.tempo = 120;
    this.stepIntervalMs = 125;
    this.swing = 0;
    this.velocityHumanize = 0;
    this.timingHumanize = 0;
    this.deviceActive = true;
    this.currentStep = 0;
    this.lastReportedGlobalStep = null;
    this.scheduledGlobalSteps = {};
    this.scheduledNoteKeys = {};
    this.lookaheadMs = 80;
    this.lateGraceMs = 2;
    this.phaseOffsetBeats = 0;
    this.transportPlaying = 0;
    this.nativeTiming = !!KSH_CONSTANTS.DEFAULT_NATIVE_TIMING;
    this.nativePlaybackStepCount = this.stepCount;
    this.nativePlaybackRows = null;
    this.nativeTransportRefreshInProgress = false;
    this.editorActive = false;

    this.channels = [];
    this.sources = [];
    this.sourceChannelMutes = makeSourceChannelMutes();
    this.generated = makePattern();
    this.cycleCounters = {};

    this.initChannels();
    this.initSources();
    this.generateWindow(0, this.stepCount);
    this.syncNativePlaybackTable();
    this.emitNativeMeta();
    this.emitNativeTimingGate();
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
        lock: -1,
        loopLength: this.stepCount,
        playbackMode: KSH_CONSTANTS.DEFAULT_CHANNEL_PLAYBACK_MODE
      };
    }
  };

  KickSnareHatEngine.prototype.initSources = function () {
    var s;

    this.sources = [];
    this.sourceChannelMutes = makeSourceChannelMutes();
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
    var channel;

    this.stepCount = clamp(count, 1, MAX_STEPS);
    this.currentStep = this.currentStep % this.stepCount;
    this.refreshSteps = clamp(this.refreshSteps, 1, this.stepCount);
    for (channel = 0; channel < MAX_LANES; channel += 1) {
      this.channels[channel].loopLength = clamp(this.channels[channel].loopLength, 1, this.stepCount);
    }
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

  KickSnareHatEngine.prototype.setStaticSource = function (source) {
    source = clampSource(source);
    this.staticSource = source;
    if (this.generationMode === "static") {
      this.recomposeWindow(0, this.stepCount, true);
    }
    this.status("static_source " + (this.staticSource + 1));
  };

  KickSnareHatEngine.prototype.setRate = function (rate) {
    this.rate = normalizeRate(rate);
    this.updateStepIntervalMs();
    this.scheduledGlobalSteps = {};
    this.scheduledNoteKeys = {};
    if (this.transportPlaying && typeof cancelPendingNoteTasks === "function") {
      cancelPendingNoteTasks();
    }
    this.syncNativePlaybackTable();
    this.emitNativeMeta();
    this.status("rate " + this.rate);
  };

  KickSnareHatEngine.prototype.setTempo = function (tempo) {
    tempo = parseFloat(tempo);
    if (isNaN(tempo)) {
      tempo = 120;
    }
    this.tempo = Math.max(20, Math.min(300, tempo));
    this.updateStepIntervalMs();
    this.scheduledGlobalSteps = {};
    this.scheduledNoteKeys = {};
    if (this.transportPlaying && typeof cancelPendingNoteTasks === "function") {
      cancelPendingNoteTasks();
    }
    this.syncNativePlaybackTable();
    this.emitNativeMeta();
    this.status("tempo " + this.tempo);
  };

  KickSnareHatEngine.prototype.updateStepIntervalMs = function () {
    var quarterMs = 60000 / this.tempo;
    this.stepIntervalMs = quarterMs * this.beatsPerStep();
  };

  KickSnareHatEngine.prototype.msToBeats = function (ms) {
    return (clampFloat(ms, 0, 600000) * this.tempo) / 60000;
  };

  KickSnareHatEngine.prototype.msUntilBeat = function (targetBeat, currentBeat) {
    return (targetBeat - currentBeat) * (60000 / this.tempo);
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
    this.syncNativePlaybackTable();
    this.status("swing " + this.swing);
  };

  KickSnareHatEngine.prototype.setVelocityHumanize = function (amount) {
    this.velocityHumanize = clamp(amount, 0, 100);
    this.syncNativePlaybackTable();
    this.emitNativeTimingGate();
    this.status("velocity_humanize " + this.velocityHumanize);
  };

  KickSnareHatEngine.prototype.setTimingHumanize = function (amount) {
    this.timingHumanize = clamp(amount, 0, 100);
    this.syncNativePlaybackTable();
    this.emitNativeTimingGate();
    this.status("timing_humanize " + this.timingHumanize);
  };

  KickSnareHatEngine.prototype.setDeviceActive = function (active) {
    active = normalizeToggle(active);
    if (this.deviceActive === active) {
      this.status("device_active " + (this.deviceActive ? 1 : 0));
      return;
    }

    this.deviceActive = active;
    this.scheduledGlobalSteps = {};
    this.scheduledNoteKeys = {};
    this.emitNativeTimingGate();
    if (!this.deviceActive) {
      if (typeof cancelPendingNoteTasks === "function") {
        cancelPendingNoteTasks();
      }
      this.transportPlaying = 0;
      this.playingStepOneBased = 0;
      this.reportPlayingStep();
    }
    this.status("device_active " + (this.deviceActive ? 1 : 0));
  };

  KickSnareHatEngine.prototype.setPhaseOffsetBeats = function (offset) {
    offset = parseFloat(offset);
    if (isNaN(offset)) {
      offset = 0;
    }
    this.phaseOffsetBeats = Math.max(-0.25, Math.min(0.25, offset));
    this.scheduledGlobalSteps = {};
    this.scheduledNoteKeys = {};
    if (this.transportPlaying && typeof cancelPendingNoteTasks === "function") {
      cancelPendingNoteTasks();
    }
    this.emitNativeMeta();
    this.status("phase_offset_beats " + this.phaseOffsetBeats);
  };

  KickSnareHatEngine.prototype.nativeTimingSupported = function () {
    return this.nativePlaybackPeriod() > 0;
  };

  KickSnareHatEngine.prototype.nativeTimingActive = function () {
    return this.nativeTiming && this.deviceActive && this.nativeTimingSupported();
  };

  KickSnareHatEngine.prototype.emitNativeMeta = function () {
    if (typeof safeMessnamed !== "function") {
      return;
    }
    safeMessnamed("ksh_native_meta", "meta", this.beatsPerStep(), this.phaseOffsetBeats, this.nativePlaybackStepCount || this.stepCount);
  };

  KickSnareHatEngine.prototype.emitNativeTimingGate = function () {
    if (typeof safeMessnamed !== "function") {
      return;
    }
    safeMessnamed("ksh_native_timing_gate", this.nativeTimingActive() ? 1 : 0);
  };

  KickSnareHatEngine.prototype.setNativeTiming = function (enabled) {
    this.nativeTiming = normalizeToggle(enabled) ? true : false;
    this.scheduledGlobalSteps = {};
    this.scheduledNoteKeys = {};
    if (typeof cancelPendingNoteTasks === "function") {
      cancelPendingNoteTasks();
    }
    this.syncNativePlaybackTable();
    this.emitNativeMeta();
    this.emitNativeTimingGate();
    this.status("native_timing " + (this.nativeTiming ? 1 : 0));
  };

  KickSnareHatEngine.prototype.setChannelLabel = function (channel, label) {
    channel = clamp(channel, 0, MAX_LANES - 1);
    this.channels[channel].label = String(label || "");
    this.status("channel_label " + (channel + 1) + " " + this.channels[channel].label);
  };

  KickSnareHatEngine.prototype.setChannelNote = function (channel, note) {
    channel = clamp(channel, 0, MAX_LANES - 1);
    this.channels[channel].note = clamp(note, 0, 127);
    this.syncNativePlaybackTable();
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

  KickSnareHatEngine.prototype.setChannelLoopLength = function (channel, loopLength) {
    channel = clamp(channel, 0, MAX_LANES - 1);
    this.channels[channel].loopLength = clamp(loopLength, 1, this.stepCount);
    this.recomposeWindow(0, this.stepCount, true);
    this.status("channel_loop_length " + (channel + 1) + " " + this.channels[channel].loopLength);
  };

  KickSnareHatEngine.prototype.setChannelPlaybackMode = function (channel, mode) {
    channel = clamp(channel, 0, MAX_LANES - 1);
    this.channels[channel].playbackMode = normalizeChannelPlaybackMode(mode);
    this.syncNativePlaybackTable();
    this.status("channel_playback_mode " + (channel + 1) + " " + this.channels[channel].playbackMode);
  };

  KickSnareHatEngine.prototype.auditionChannel = function (channel) {
    var note;

    if (!this.deviceActive) {
      return null;
    }

    channel = clamp(channel, 0, this.channelCount - 1);
    note = {
      pitch: this.channels[channel].note,
      velocity: KSH_CONSTANTS.DEFAULT_CELL.velocity,
      channel: KSH_CONSTANTS.DEFAULT_MIDI_CHANNEL,
      durationMs: KSH_CONSTANTS.DEFAULT_NOTE_DURATION_MS,
      delayMs: 0
    };
    this.emitNote(note);
    return note;
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

  function normalizeCycleOffset(cycleOffset, cycle) {
    return clamp(cycleOffset, 0, clamp(cycle, 1, 64) - 1);
  }

  function normalizeCycleInverted(cycleInverted, cycle) {
    return clamp(cycle, 1, 64) > 1 && cycleInverted ? 1 : 0;
  }

  function cycleGateMatches(count, cycle, cycleOffset, cycleInverted) {
    var matches = count % cycle === cycleOffset;
    return cycleInverted ? !matches : matches;
  }

  function normalizeCellParams(probability, cycle, cycleOffset, cycleInverted, currentCell) {
    var params;

    currentCell = currentCell || KSH_CONSTANTS.DEFAULT_CELL;
    params = {
      probability: probability === undefined ? currentCell.probability : probability,
      cycle: cycle === undefined ? currentCell.cycle : cycle,
      cycleOffset: cycleOffset === undefined ? currentCell.cycleOffset : cycleOffset,
      cycleInverted: cycleInverted === undefined ? currentCell.cycleInverted : cycleInverted
    };
    params.cycle = clamp(params.cycle, 1, 64);

    return {
      probability: clamp(params.probability, 0, 100),
      cycle: params.cycle,
      cycleOffset: normalizeCycleOffset(params.cycleOffset, params.cycle),
      cycleInverted: normalizeCycleInverted(params.cycleInverted, params.cycle)
    };
  }

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

    if (this.generationMode === "static") {
      return this.staticSource === source ? generatedCell : null;
    }

    if (this.channels[channel].lock >= 0) {
      return this.channels[channel].lock === source ? generatedCell : null;
    }

    return generatedCell.source === source ? generatedCell : null;
  };

  KickSnareHatEngine.prototype.refreshGeneratedCellsForSourceEdit = function (source, channel, sourceStep) {
    var loopLength;
    var generatedStep;
    var changed = false;

    if (channel >= this.channelCount) {
      return;
    }

    loopLength = clamp(this.channels[channel].loopLength, 1, this.stepCount);
    if (sourceStep >= loopLength) {
      return;
    }

    for (generatedStep = sourceStep; generatedStep < this.stepCount; generatedStep += loopLength) {
      if (this.generatedCellForSourceEdit(source, channel, generatedStep)) {
        this.generated[channel][generatedStep] = this.generatedCellFromSource(source, channel, generatedStep);
        changed = true;
      }
    }

    if (changed) {
      this.markPreviewDirty(false);
    }
  };

  KickSnareHatEngine.prototype.isSourceChannelMuted = function (source, channel) {
    source = clampSource(source);
    channel = clampChannel(channel);
    return this.sourceChannelMutes[source] && this.sourceChannelMutes[source][channel] ? 1 : 0;
  };

  KickSnareHatEngine.prototype.generatedCellFromSource = function (source, channel, step) {
    var cell;
    var sourceStep;

    sourceStep = mod(step, clamp(this.channels[channel].loopLength, 1, this.stepCount));

    if (this.isSourceChannelMuted(source, channel)) {
      cell = defaultCell();
    } else {
      cell = cloneCell(this.sources[source][channel][sourceStep]);
    }
    cell.source = source;
    cell.sourceStep = sourceStep;
    return cell;
  };

  KickSnareHatEngine.prototype.setSourceChannelMute = function (source, channel, muted) {
    source = clampSource(source);
    channel = clampChannel(channel);
    muted = muted ? 1 : 0;
    this.sourceChannelMutes[source][channel] = muted;
    this.recomposeWindow(0, this.stepCount, true);
    this.status("source_channel_mute " + (source + 1) + " " + (channel + 1) + " " + muted);
  };

  KickSnareHatEngine.prototype.resetSourceChannel = function (source, channel) {
    var step;

    source = clampSource(source);
    channel = clampChannel(channel);
    this.sourceChannelMutes[source][channel] = 0;
    for (step = 0; step < MAX_STEPS; step += 1) {
      this.sources[source][channel][step] = defaultCell();
    }
    this.channels[channel].loopLength = this.stepCount;
    this.recomposeWindow(0, this.stepCount, true);
    this.status("channel_loop_length " + (channel + 1) + " " + this.channels[channel].loopLength);
    this.status("source_channel_reset " + (source + 1) + " " + (channel + 1));
  };

  KickSnareHatEngine.prototype.setCell = function (source, channel, step, enabled, velocity, probability, cycle, cycleOffset, cycleInverted) {
    var cell;
    var params;

    source = clampSource(source);
    channel = clampChannel(channel);
    step = clampStep(step);

    cell = this.sources[source][channel][step];
    params = normalizeCellParams(probability, cycle, cycleOffset, cycleInverted, cell);
    cell.enabled = enabled ? 1 : 0;
    cell.velocity = clamp(velocity, 1, 127);
    cell.probability = params.probability;
    cell.cycle = params.cycle;
    cell.cycleOffset = params.cycleOffset;
    cell.cycleInverted = params.cycleInverted;

    this.refreshGeneratedCellsForSourceEdit(source, channel, step);
  };

  KickSnareHatEngine.prototype.setCellEnabled = function (source, channel, step, enabled) {
    source = clampSource(source);
    channel = clampChannel(channel);
    step = clampStep(step);
    enabled = enabled ? 1 : 0;
    this.sources[source][channel][step].enabled = enabled;

    this.refreshGeneratedCellsForSourceEdit(source, channel, step);
  };

  KickSnareHatEngine.prototype.setCellVelocity = function (source, channel, step, velocity) {
    source = clampSource(source);
    channel = clampChannel(channel);
    step = clampStep(step);
    velocity = clamp(velocity, 1, 127);
    this.sources[source][channel][step].velocity = velocity;

    this.refreshGeneratedCellsForSourceEdit(source, channel, step);
  };

  KickSnareHatEngine.prototype.setCellProbability = function (source, channel, step, probability) {
    source = clampSource(source);
    channel = clampChannel(channel);
    step = clampStep(step);
    probability = clamp(probability, 0, 100);
    this.sources[source][channel][step].probability = probability;

    this.refreshGeneratedCellsForSourceEdit(source, channel, step);
  };

  KickSnareHatEngine.prototype.setCellCycle = function (source, channel, step, cycle) {
    source = clampSource(source);
    channel = clampChannel(channel);
    step = clampStep(step);
    cycle = clamp(cycle, 1, 64);
    this.sources[source][channel][step].cycle = cycle;
    this.sources[source][channel][step].cycleOffset = normalizeCycleOffset(
      this.sources[source][channel][step].cycleOffset,
      cycle
    );
    this.sources[source][channel][step].cycleInverted = normalizeCycleInverted(
      this.sources[source][channel][step].cycleInverted,
      cycle
    );

    this.refreshGeneratedCellsForSourceEdit(source, channel, step);
  };

  KickSnareHatEngine.prototype.setCellCycleOffset = function (source, channel, step, cycleOffset) {
    var cell;

    source = clampSource(source);
    channel = clampChannel(channel);
    step = clampStep(step);
    cell = this.sources[source][channel][step];
    cell.cycleOffset = normalizeCycleOffset(cycleOffset, cell.cycle);

    this.refreshGeneratedCellsForSourceEdit(source, channel, step);
  };

  KickSnareHatEngine.prototype.setCellCycleInverted = function (source, channel, step, cycleInverted) {
    var cell;

    source = clampSource(source);
    channel = clampChannel(channel);
    step = clampStep(step);
    cell = this.sources[source][channel][step];
    cell.cycleInverted = normalizeCycleInverted(cycleInverted, cell.cycle);

    this.refreshGeneratedCellsForSourceEdit(source, channel, step);
  };

  KickSnareHatEngine.prototype.resetPlayback = function (emitStatus) {
    if (typeof cancelPendingNoteTasks === "function") {
      cancelPendingNoteTasks();
    }
    this.currentStep = 0;
    this.playingStepOneBased = 0;
    this.cycleCounters = {};
    this.lastReportedGlobalStep = null;
    this.scheduledGlobalSteps = {};
    this.scheduledNoteKeys = {};
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
      if (this.isSourceChannelMuted(sourceIndex, channel)) {
        continue;
      }
      for (step = 0; step < Math.min(this.stepCount, clamp(this.channels[channel].loopLength, 1, this.stepCount)); step += 1) {
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
    var activeSources;

    if (forceEmit === undefined) {
      forceEmit = false;
    }

    startStep = clamp(startStep, 0, this.stepCount - 1);
    length = clamp(length, 1, this.stepCount);

    activeSources = null;
    stackSource = -1;
    if (this.generationMode === "per_channel") {
      activeSources = this.activeSourceIndices();
    } else if (this.generationMode === "stack") {
      activeSources = this.activeSourceIndices();
      stackSource = this.pickRandomSource(activeSources);
    }

    for (offset = 0; offset < length; offset += 1) {
      step = (startStep + offset) % this.stepCount;

      for (channel = 0; channel < this.channelCount; channel += 1) {
        if (this.generationMode === "static") {
          source = this.staticSource;
        } else if (this.channels[channel].lock >= 0) {
          source = this.channels[channel].lock;
        } else if (this.generationMode === "per_channel") {
          source = this.pickRandomSource(activeSources);
        } else {
          source = stackSource;
        }

        this.generated[channel][step] = this.generatedCellFromSource(source, channel, step);
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
    var fallbackStack = -1;
    var activeSources;

    if (forceEmit === undefined) {
      forceEmit = false;
    }

    startStep = clamp(startStep, 0, this.stepCount - 1);
    length = clamp(length, 1, this.stepCount);

    activeSources = this.generationMode === "static" ? null : this.activeSourceIndices();

    for (offset = 0; offset < length; offset += 1) {
      step = (startStep + offset) % this.stepCount;

      for (channel = 0; channel < this.channelCount; channel += 1) {
        if (this.generationMode === "static") {
          source = this.staticSource;
        } else if (this.channels[channel].lock >= 0) {
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

        this.generated[channel][step] = this.generatedCellFromSource(source, channel, step);
      }
    }

    this.markPreviewDirty(forceEmit);
  };

  KickSnareHatEngine.prototype.markPreviewDirty = function (forceEmit) {
    this.previewDirty = true;
    if (this.nativeTiming) {
      this.syncNativePlaybackTable();
    }
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
    var cycle;
    var cycleOffset;
    var cycleInverted;
    var probability;

    if (!cell.enabled) {
      return false;
    }

    cycle = clamp(cell.cycle, 1, 64);
    cycleOffset = normalizeCycleOffset(cell.cycleOffset, cycle);
    cycleInverted = normalizeCycleInverted(cell.cycleInverted, cycle);
    if (cycle > 1) {
      key = this.cycleKey(cell.source, channel, typeof cell.sourceStep === "number" ? cell.sourceStep : step);
      count = this.cycleCounters[key] || 0;
      this.cycleCounters[key] = count + 1;
      if (!cycleGateMatches(count, cycle, cycleOffset, cycleInverted)) {
        return false;
      }
    }

    probability = clamp(cell.probability, 0, 100);
    if (probability >= 100) {
      return true;
    }
    if (probability <= 0) {
      return false;
    }

    return this.rng() * 100 < probability;
  };

  KickSnareHatEngine.prototype.swingDelayMsForStep = function (step) {
    return step % 2 === 1 ? this.stepIntervalMs * 0.5 * (this.swing / 100) : 0;
  };

  KickSnareHatEngine.prototype.timingHumanizeRangeMs = function () {
    return this.stepIntervalMs * 0.5 * (this.timingHumanize / 100);
  };

  KickSnareHatEngine.prototype.humanizeTimingOffsetMs = function () {
    var range = this.timingHumanizeRangeMs();

    if (range <= 0) {
      return 0;
    }

    return (this.rng() * 2 - 1) * range;
  };

  KickSnareHatEngine.prototype.nativeTimingHumanizeRangeMs = function () {
    return this.stepIntervalMs * TIMING_HUMANIZE_NATIVE_SCALE * (this.timingHumanize / 100);
  };

  KickSnareHatEngine.prototype.nativeHumanizeTimingOffsetMs = function () {
    var range = this.nativeTimingHumanizeRangeMs();

    if (range <= 0) {
      return 0;
    }

    return (this.rng() * 2 - 1) * range;
  };

  KickSnareHatEngine.prototype.humanizeVelocity = function (velocity) {
    var range;
    var humanized;

    velocity = clamp(velocity, 1, 127);
    if (this.velocityHumanize <= 0) {
      return velocity;
    }

    range = velocity * (this.velocityHumanize / 100);
    humanized = velocity + (this.rng() * 2 - 1) * range;
    return clamp(Math.round(humanized), 1, 127);
  };

  KickSnareHatEngine.prototype.delayMsForScheduledStep = function (step, baseDelayMs) {
    var delayMs;

    delayMs = clampFloat(baseDelayMs, 0, 600000);
    delayMs += this.swingDelayMsForStep(step);
    delayMs += this.humanizeTimingOffsetMs();
    return Math.max(0, delayMs);
  };

  KickSnareHatEngine.prototype.nativePlaybackPeriod = function () {
    var period = 1;
    var baseRows = this.stepCount;
    var hasVariation = this.velocityHumanize > 0 || this.timingHumanize > 0;
    var channel;
    var step;
    var cell;
    var cycle;
    var probability;
    var loopLength;

    for (channel = 0; channel < this.channelCount; channel += 1) {
      loopLength = clamp(this.channels[channel].loopLength, 1, this.stepCount);
      if (this.channels[channel].playbackMode === "boomerang") {
        baseRows = lcm(baseRows, loopLength * 2);
      }
    }
    period = baseRows / this.stepCount;

    for (step = 0; step < this.stepCount; step += 1) {
      for (channel = 0; channel < this.channelCount; channel += 1) {
        cell = this.generated[channel][step];
        if (cell && cell.enabled) {
          cycle = clamp(cell.cycle, 1, 64);
          probability = clamp(cell.probability, 0, 100);
          period = lcm(period, cycle);
          if (probability < 100) {
            hasVariation = true;
          }
          if (period * this.stepCount > NATIVE_PLAYBACK_MAX_ROWS) {
            return 0;
          }
        }
      }
    }

    if (hasVariation) {
      period *= NATIVE_PROBABILITY_MULTIPLIER;
    }

    return period * this.stepCount > NATIVE_PLAYBACK_MAX_ROWS ? 0 : period;
  };

  KickSnareHatEngine.prototype.playbackStepForChannel = function (channel, playbackIndex) {
    var loopLength;
    var mode;
    var activeIndex;

    channel = clamp(channel, 0, MAX_LANES - 1);
    loopLength = clamp(this.channels[channel].loopLength, 1, this.stepCount);
    mode = normalizeChannelPlaybackMode(this.channels[channel].playbackMode);
    playbackIndex = Math.floor(parseFloat(playbackIndex) || 0);

    if (mode === "reverse") {
      activeIndex = mod(playbackIndex, loopLength);
      return loopLength - 1 - activeIndex;
    }

    if (mode === "boomerang") {
      activeIndex = mod(playbackIndex, loopLength * 2);
      return activeIndex < loopLength ? activeIndex : loopLength * 2 - 1 - activeIndex;
    }

    return mod(playbackIndex, this.stepCount);
  };

	  KickSnareHatEngine.prototype.buildNativePlaybackRows = function () {
	    var rows = [];
	    var step;
	    var rowStep;
	    var playbackStep;
	    var targetStep;
	    var channel;
	    var cell;
	    var row;
	    var cyclePeriod;
	    var cycleCounters = {};
	    var key;
	    var cycle;
      var cycleOffset;
      var cycleInverted;
	    var probability;
	    var velocity;
	    var timingOffsetMs;
	    var baseDelayMs;
	    var targetPosition;
	    var targetRowFloat;
	    var targetRow;
	    var targetDelayMs;

	    cyclePeriod = this.nativePlaybackPeriod();
	    if (cyclePeriod < 1) {
	      cyclePeriod = 1;
	    }

	    this.nativePlaybackStepCount = this.stepCount * cyclePeriod;
	    for (step = 0; step < this.nativePlaybackStepCount; step += 1) {
	      rows[step] = [];
	    }

	    for (step = 0; step < this.nativePlaybackStepCount; step += 1) {
	      rowStep = step % this.stepCount;
	      for (channel = 0; channel < this.channelCount; channel += 1) {
	        playbackStep = this.playbackStepForChannel(channel, step);
	        cell = this.generated[channel][playbackStep];
	        if (cell && cell.enabled) {
          cycle = clamp(cell.cycle, 1, 64);
          cycleOffset = normalizeCycleOffset(cell.cycleOffset, cycle);
          cycleInverted = normalizeCycleInverted(cell.cycleInverted, cycle);
          if (cycle > 1) {
            key = this.cycleKey(cell.source, channel, typeof cell.sourceStep === "number" ? cell.sourceStep : playbackStep);
            if (cycleCounters[key] === undefined) {
              cycleCounters[key] = 0;
            } else {
              cycleCounters[key] += 1;
            }
            if (!cycleGateMatches(cycleCounters[key], cycle, cycleOffset, cycleInverted)) {
              continue;
            }
          }
          probability = clamp(cell.probability, 0, 100);
          if (probability <= 0) {
            continue;
          }
	          if (probability < 100 && !(this.rng() * 100 < probability)) {
	            continue;
	          }
	          velocity = this.humanizeVelocity(cell.velocity);
	          baseDelayMs = this.swingDelayMsForStep(rowStep);
	          timingOffsetMs = this.nativeHumanizeTimingOffsetMs();
	          targetPosition = step + (baseDelayMs + timingOffsetMs) / this.stepIntervalMs;
	          if (targetPosition < 0) {
	            targetPosition = 0;
	          }
	          targetRowFloat = Math.floor(targetPosition);
	          targetDelayMs = (targetPosition - targetRowFloat) * this.stepIntervalMs;
	          targetRow = mod(targetRowFloat, this.nativePlaybackStepCount);
	          row = rows[targetRow];
	          this.appendNativeHit(row, channel, playbackStep, cell, velocity, targetDelayMs);
	        }
	      }
	    }

	    return rows;
  };

  KickSnareHatEngine.prototype.appendNativeHit = function (row, channel, rowStep, cell, velocity, delayMs) {
    var sourceStep = typeof cell.sourceStep === "number" ? cell.sourceStep : rowStep;

    row.push(this.channels[channel].note);
    row.push(velocity);
    row.push(KSH_CONSTANTS.DEFAULT_NOTE_DURATION_MS);
    row.push(KSH_CONSTANTS.DEFAULT_MIDI_CHANNEL);
    row.push(Math.max(0, delayMs));
    row.push(channel + 1);
    row.push(rowStep + 1);
    row.push(cell.source + 1);
    row.push(sourceStep + 1);
  };

  KickSnareHatEngine.prototype.currentNativePlaybackStep = function () {
    if (!this.transportPlaying || this.lastReportedGlobalStep === null || this.lastReportedGlobalStep === undefined) {
      return -1;
    }
    return mod(this.lastReportedGlobalStep, this.nativePlaybackStepCount || this.stepCount);
  };

  KickSnareHatEngine.prototype.primeNativeStepChange = function () {
    if (typeof safeMessnamed !== "function") {
      return;
    }
    safeMessnamed("ksh_native_step_reset", "set", this.currentNativePlaybackStep());
  };

  KickSnareHatEngine.prototype.syncNativePlaybackTable = function () {
    var rows;
    var step;
    var args;
    var previousStepCount = this.nativePlaybackStepCount;
    var canSend = typeof safeMessnamed === "function";
    var suppressCurrentStep = !this.nativeTransportRefreshInProgress;

    if (canSend && this.nativeTiming) {
      safeMessnamed("ksh_native_timing_gate", 0);
      if (suppressCurrentStep && this.transportPlaying && typeof cancelPendingNoteTasks === "function") {
        cancelPendingNoteTasks();
      }
    }

    rows = this.buildNativePlaybackRows();
    this.nativePlaybackRows = rows;

    if (!canSend) {
      return;
    }

    safeMessnamed("ksh_native_playback_commands", "clear");
    for (step = 0; step < rows.length; step += 1) {
      if (rows[step] && rows[step].length) {
        args = ["ksh_native_playback_commands", "store", step].concat(rows[step]);
        safeMessnamed.apply(this, args);
      }
    }
    if (previousStepCount !== this.nativePlaybackStepCount) {
      this.emitNativeMeta();
    }
    if (suppressCurrentStep) {
      this.primeNativeStepChange();
    }
    this.emitNativeTimingGate();
  };

  KickSnareHatEngine.prototype.pruneScheduledSteps = function (currentGlobalStep) {
    var cutoff = currentGlobalStep - Math.max(this.stepCount * 4, 64);
    var key;

    for (key in this.scheduledGlobalSteps) {
      if (Object.prototype.hasOwnProperty.call(this.scheduledGlobalSteps, key) && parseInt(key, 10) < cutoff) {
        delete this.scheduledGlobalSteps[key];
      }
    }
    for (key in this.scheduledNoteKeys) {
      if (Object.prototype.hasOwnProperty.call(this.scheduledNoteKeys, key) && parseInt(key.split(":")[0], 10) < cutoff) {
        delete this.scheduledNoteKeys[key];
      }
    }
  };

  KickSnareHatEngine.prototype.prepareStepForPlayback = function (step) {
    if (step % this.refreshSteps === 0) {
      this.nativeTransportRefreshInProgress = true;
      try {
        this.generateWindow(step, this.refreshSteps, false);
      } finally {
        this.nativeTransportRefreshInProgress = false;
      }
    }
  };

  KickSnareHatEngine.prototype.reportTransportStep = function (globalStep) {
    var step = mod(globalStep, this.stepCount);

    if (this.lastReportedGlobalStep === globalStep) {
      return;
    }
    this.lastReportedGlobalStep = globalStep;
    this.currentStep = step;
    this.playingStepOneBased = step + 1;
    this.reportPlayingStep();
  };

  KickSnareHatEngine.prototype.scheduleGlobalStep = function (globalStep, songBeats) {
    var key = String(globalStep);
    var step;
    var targetBeat;
    var baseDelayMs;

    if (this.scheduledGlobalSteps[key]) {
      return [];
    }

    step = mod(globalStep, this.stepCount);
    targetBeat = this.beatForGlobalStep(globalStep);
    baseDelayMs = this.msUntilBeat(targetBeat, songBeats);
    if (baseDelayMs < -this.lateGraceMs) {
      this.scheduledGlobalSteps[key] = 1;
      return [];
    }

    this.scheduledGlobalSteps[key] = 1;
    this.prepareStepForPlayback(step);
    return this.fireStep(step, globalStep, {
      baseDelayMs: baseDelayMs,
      reportStep: false
    });
  };

  KickSnareHatEngine.prototype.scheduleLookahead = function (songBeats, currentGlobalStep) {
    var notes = [];
    var lookaheadBeats = this.msToBeats(this.lookaheadMs);
    var endBeat = songBeats + lookaheadBeats;
    var globalStep = currentGlobalStep;
    var targetBeat;
    var scheduled;
    var i;

    while (true) {
      targetBeat = this.beatForGlobalStep(globalStep);
      if (targetBeat > endBeat + 0.000000001) {
        break;
      }

      scheduled = this.scheduleGlobalStep(globalStep, songBeats);
      for (i = 0; i < scheduled.length; i += 1) {
        notes.push(scheduled[i]);
      }
      globalStep += 1;
    }

    return notes;
  };

  KickSnareHatEngine.prototype.fireStep = function (step, globalStep, options) {
    var channel;
    var cell;
    var notes = [];
    var note;
    var baseDelayMs;
    var reportStep;
    var playbackIndex;
    var playbackStep;

    if (!this.deviceActive) {
      return notes;
    }

    options = options || {};
    baseDelayMs = options.baseDelayMs === undefined ? 0 : options.baseDelayMs;
    reportStep = options.reportStep !== false;

    step = mod(step, this.stepCount);
    if (reportStep) {
      this.currentStep = step;
      this.playingStepOneBased = step + 1;
      this.reportPlayingStep();
    }

    playbackIndex = typeof globalStep === "number" ? globalStep : step;
    for (channel = 0; channel < this.channelCount; channel += 1) {
      playbackStep = this.playbackStepForChannel(channel, playbackIndex);
      cell = this.generated[channel][playbackStep];
      if (this.shouldFire(cell, channel, playbackStep)) {
        if (typeof globalStep === "number") {
          if (this.scheduledNoteKeys[globalStep + ":" + channel]) {
            continue;
          }
          this.scheduledNoteKeys[globalStep + ":" + channel] = 1;
        }
        note = {
          lane: channel + 1,
          step: playbackStep + 1,
          globalStep: typeof globalStep === "number" ? globalStep : null,
          pitch: this.channels[channel].note,
          velocity: this.humanizeVelocity(cell.velocity),
          channel: KSH_CONSTANTS.DEFAULT_MIDI_CHANNEL,
          durationMs: KSH_CONSTANTS.DEFAULT_NOTE_DURATION_MS,
          delayMs: this.delayMsForScheduledStep(step, baseDelayMs),
          label: this.channels[channel].label,
          source: cell.source + 1
        };
        notes.push(note);
        this.emitNote(note);
        this.status(
          "note_hit " +
          (channel + 1) +
          " " +
          (playbackStep + 1) +
          " " +
          (cell.source + 1) +
          " " +
          ((typeof cell.sourceStep === "number" ? cell.sourceStep : playbackStep) + 1)
        );
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

  KickSnareHatEngine.prototype.beatForGlobalStep = function (globalStep) {
    return globalStep * this.beatsPerStep() + this.phaseOffsetBeats;
  };

  KickSnareHatEngine.prototype.transportPosition = function (songBeats, isPlaying) {
    var globalStep;
    var step;
    var notes = [];
    var discontinuity;
    var previousGlobalStep;
    var stepChanged;
    var scheduled;
    var i;

    songBeats = parseFloat(songBeats);
    if (isNaN(songBeats)) {
      return [];
    }

    isPlaying = parseInt(isPlaying, 10) ? 1 : 0;

    if (!this.deviceActive) {
      this.transportPlaying = 0;
      this.lastReportedGlobalStep = null;
      this.scheduledGlobalSteps = {};
      this.scheduledNoteKeys = {};
      if (this.playingStepOneBased !== 0) {
        this.playingStepOneBased = 0;
        this.reportPlayingStep();
      }
      return [];
    }

    if (!isPlaying) {
      // Only flush the native scheduler on the *transition* from playing to
      // stopped. plugsync~ keeps emitting transport_position while the
      // transport is stopped, and a `clear` to ksh_scheduler_commands wipes
      // the pipe (note-delay) and sends `stop` to makenote — which would
      // race against and silence one-shot auditions queued through the same
      // pipe. See `editor play button` regression: auditions only fired
      // reliably while the transport was playing prior to this fix.
      if (this.transportPlaying) {
        if (typeof cancelPendingNoteTasks === "function") {
          cancelPendingNoteTasks();
        }
      }
      this.transportPlaying = 0;
      this.lastReportedGlobalStep = null;
      this.scheduledGlobalSteps = {};
      this.scheduledNoteKeys = {};
      return [];
    }

    this.transportPlaying = isPlaying;

    globalStep = this.globalStepForBeats(songBeats);
    step = mod(globalStep, this.stepCount);
    previousGlobalStep = this.lastReportedGlobalStep;
    stepChanged = previousGlobalStep !== globalStep;
    discontinuity = previousGlobalStep !== null && globalStep !== previousGlobalStep && globalStep !== previousGlobalStep + 1;

    if (discontinuity) {
      if (typeof cancelPendingNoteTasks === "function") {
        cancelPendingNoteTasks();
      }
      this.scheduledGlobalSteps = {};
      this.scheduledNoteKeys = {};
      this.status("transport_jump " + songBeats + " step " + (step + 1));
    }

    this.reportTransportStep(globalStep);

    if (this.nativeTimingActive()) {
      if (stepChanged) {
        this.prepareStepForPlayback(step);
      }
      return notes;
    }

    this.pruneScheduledSteps(globalStep);
    scheduled = this.scheduleLookahead(songBeats, globalStep);
    for (i = 0; i < scheduled.length; i += 1) {
      notes.push(scheduled[i]);
    }

    return notes;
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
        lock: this.channels[ch].lock,
        loopLength: this.channels[ch].loopLength,
        playbackMode: normalizeChannelPlaybackMode(this.channels[ch].playbackMode)
      });
      generated[ch] = [];
      for (st = 0; st < this.stepCount; st += 1) {
        cell = this.generated[ch][st];
        generated[ch][st] = {
          enabled: cell.enabled,
          velocity: cell.velocity,
          probability: cell.probability,
          cycle: cell.cycle,
          cycleOffset: cell.cycleOffset,
          cycleInverted: cell.cycleInverted,
          source: cell.source + 1
        };
      }
    }

    return {
      stepCount: this.stepCount,
      channelCount: this.channelCount,
      refreshSteps: this.refreshSteps,
      generationMode: this.generationMode,
      staticSource: this.staticSource,
      rate: this.rate,
      tempo: this.tempo,
      swing: this.swing,
      velocityHumanize: this.velocityHumanize,
      timingHumanize: this.timingHumanize,
      phaseOffsetBeats: this.phaseOffsetBeats,
      currentStep: this.currentStep + 1,
      channels: channels,
      sourceChannelMutes: this.sourceChannelMutes,
      generated: generated
    };
  };

  KickSnareHatEngine.prototype.serialize = function () {
    return {
      stepCount: this.stepCount,
      channelCount: this.channelCount,
      refreshSteps: this.refreshSteps,
      generationMode: this.generationMode,
      staticSource: this.staticSource,
      rate: this.rate,
      tempo: this.tempo,
      swing: this.swing,
      velocityHumanize: this.velocityHumanize,
      timingHumanize: this.timingHumanize,
      deviceActive: this.deviceActive ? 1 : 0,
      nativeTiming: this.nativeTiming ? 1 : 0,
      phaseOffsetBeats: this.phaseOffsetBeats,
      channels: this.channels,
      sourceChannelMutes: this.sourceChannelMutes,
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
    var incomingMuteRow;

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
    for (channel = 0; channel < MAX_LANES; channel += 1) {
      this.channels[channel].loopLength = clamp(this.channels[channel].loopLength, 1, this.stepCount);
    }
    if (state.generationMode !== undefined) {
      this.generationMode = normalizeGenerationMode(state.generationMode);
    }
    if (state.staticSource !== undefined) {
      this.staticSource = clamp(state.staticSource, 0, SOURCE_COUNT - 1);
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
    if (state.velocityHumanize !== undefined) {
      this.velocityHumanize = clamp(state.velocityHumanize, 0, 100);
    }
    if (state.timingHumanize !== undefined) {
      this.timingHumanize = clamp(state.timingHumanize, 0, 100);
    }
    if (state.deviceActive !== undefined) {
      this.deviceActive = normalizeToggle(state.deviceActive);
    }
    if (state.nativeTiming !== undefined) {
      this.nativeTiming = normalizeToggle(state.nativeTiming) ? true : false;
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
        if (incomingChannel.loopLength !== undefined) {
          this.channels[channel].loopLength = clamp(incomingChannel.loopLength, 1, this.stepCount);
        }
        if (incomingChannel.playbackMode !== undefined) {
          this.channels[channel].playbackMode = normalizeChannelPlaybackMode(incomingChannel.playbackMode);
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

    if (state.sourceChannelMutes) {
      for (source = 0; source < Math.min(SOURCE_COUNT, state.sourceChannelMutes.length); source += 1) {
        incomingMuteRow = state.sourceChannelMutes[source] || [];
        for (channel = 0; channel < Math.min(MAX_LANES, incomingMuteRow.length); channel += 1) {
          this.sourceChannelMutes[source][channel] = incomingMuteRow[channel] ? 1 : 0;
        }
      }
    }

    this.resetPlayback(false);
  };

  KickSnareHatEngine.prototype.serializeForPersistence = function () {
    var source;
    var channel;
    var step;
    var cell;
    var cells = [];
    var channelsOut = [];
    var mutes = [];

    for (source = 0; source < SOURCE_COUNT; source += 1) {
      for (channel = 0; channel < this.channelCount; channel += 1) {
        for (step = 0; step < this.stepCount; step += 1) {
          cell = this.sources[source][channel][step];
          if (cell.enabled !== 0 || cell.velocity !== 100 || cell.probability !== 100 || cell.cycle !== 1 || cell.cycleOffset !== 0 || cell.cycleInverted !== 0) {
            cells.push([
              source,
              channel,
              step,
              cell.enabled ? 1 : 0,
              cell.velocity,
              cell.probability,
              cell.cycle,
              cell.cycleOffset,
              cell.cycleInverted
            ]);
          }
        }
      }
    }

    for (channel = 0; channel < this.channelCount; channel += 1) {
      channelsOut.push([
        this.channels[channel].label,
        this.channels[channel].note,
        this.channels[channel].lock,
        this.channels[channel].loopLength,
        normalizeChannelPlaybackMode(this.channels[channel].playbackMode)
      ]);
    }

    for (source = 0; source < SOURCE_COUNT; source += 1) {
      mutes.push(this.sourceChannelMutes[source].slice(0, this.channelCount));
    }

    return {
      v: 1,
      stepCount: this.stepCount,
      channelCount: this.channelCount,
      refreshSteps: this.refreshSteps,
      generationMode: this.generationMode,
      staticSource: this.staticSource,
      rate: this.rate,
      tempo: this.tempo,
      swing: this.swing,
      velocityHumanize: this.velocityHumanize,
      timingHumanize: this.timingHumanize,
      deviceActive: this.deviceActive ? 1 : 0,
      nativeTiming: this.nativeTiming ? 1 : 0,
      phaseOffsetBeats: this.phaseOffsetBeats,
      channels: channelsOut,
      sourceChannelMutes: mutes,
      cells: cells
    };
  };

  KickSnareHatEngine.prototype.deserializeForPersistence = function (state) {
    var source;
    var channel;
    var step;
    var entry;
    var channelsIn;
    var mutesIn;

    if (!state || state.v !== 1) {
      return false;
    }

    this.stepCount = clamp(state.stepCount, 1, MAX_STEPS);
    this.channelCount = clamp(state.channelCount, 1, MAX_LANES);
    this.refreshSteps = clamp(state.refreshSteps, 1, this.stepCount);
    this.generationMode = normalizeGenerationMode(state.generationMode);
    this.staticSource = clamp(state.staticSource, 0, SOURCE_COUNT - 1);
    this.rate = normalizeRate(state.rate);
    this.tempo = Math.max(20, Math.min(300, parseFloat(state.tempo) || this.tempo));
    this.swing = clamp(state.swing, 0, 100);
    this.velocityHumanize = clamp(state.velocityHumanize, 0, 100);
    this.timingHumanize = clamp(state.timingHumanize, 0, 100);
    this.deviceActive = normalizeToggle(state.deviceActive);
    if (state.nativeTiming !== undefined) {
      this.nativeTiming = normalizeToggle(state.nativeTiming);
    } else {
      this.nativeTiming = !!KSH_CONSTANTS.DEFAULT_NATIVE_TIMING;
    }
    this.phaseOffsetBeats = parseFloat(state.phaseOffsetBeats) || 0;
    this.updateStepIntervalMs();

    for (source = 0; source < SOURCE_COUNT; source += 1) {
      this.sources[source] = makePattern();
    }

    channelsIn = state.channels || [];
    for (channel = 0; channel < this.channelCount; channel += 1) {
      if (channelsIn[channel]) {
        this.channels[channel].label = String(channelsIn[channel][0] || this.channels[channel].label);
        this.channels[channel].note = clamp(channelsIn[channel][1], 0, 127);
        this.channels[channel].lock = clamp(channelsIn[channel][2], -1, SOURCE_COUNT - 1);
        this.channels[channel].loopLength = clamp(channelsIn[channel][3], 1, this.stepCount);
        this.channels[channel].playbackMode = normalizeChannelPlaybackMode(channelsIn[channel][4]);
      }
      this.channels[channel].loopLength = clamp(this.channels[channel].loopLength, 1, this.stepCount);
    }

    mutesIn = state.sourceChannelMutes || [];
    for (source = 0; source < SOURCE_COUNT; source += 1) {
      for (channel = 0; channel < this.channelCount; channel += 1) {
        this.sourceChannelMutes[source][channel] =
          mutesIn[source] && mutesIn[source][channel] ? 1 : 0;
      }
    }

    for (var cellIndex = 0; cellIndex < state.cells.length; cellIndex += 1) {
      entry = state.cells[cellIndex];
      if (!entry || entry.length < 7) {
        continue;
      }
      source = entry[0];
      channel = entry[1];
      step = entry[2];
      if (source < 0 || source >= SOURCE_COUNT || channel < 0 || channel >= MAX_LANES) {
        continue;
      }
      if (step < 0 || step >= MAX_STEPS) {
        continue;
      }
      this.sources[source][channel][step] = cloneCell({
        enabled: entry[3],
        velocity: entry[4],
        probability: entry[5],
        cycle: entry[6],
        cycleOffset: entry[7],
        cycleInverted: entry[8]
      });
    }

    this.resetPlayback(false);
    return true;
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
var kshDirtyRevision = 0;
var KSH_PERSISTENCE_CHUNK_PREFIX = "ksh_json_chunks_v1";
var KSH_PERSISTENCE_CHUNK_SIZE = 900;
var kshEmbeddedRestoreChunks = [];
var kshRestoreTask = null;
var kshRestoreAttempt = 0;
var KSH_RESTORE_MAX_ATTEMPTS = 24;
var KSH_RESTORE_DELAYS_MS = [
  0, 25, 50, 100, 150, 250, 400, 600, 900, 1200, 1500, 2000, 2500, 3000,
  4000, 5000, 6500, 8000, 10000, 12000, 14000, 16000, 18000, 20000
];
var kshRestoreFinished = false;
var kshRestoreApplied = false;

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

function safeNotifyClients() {
  if (typeof notifyclients !== "function") {
    return;
  }
  try {
    notifyclients();
  } catch (error) {
    KSH_CONSTANTS.debugPost("notifyclients failed", error);
  }
}

function pushPatternToStore() {
  var json;
  var store;

  if (typeof JSON === "undefined") {
    return;
  }

  json = JSON.stringify(ensureEngine().serializeForPersistence());
  if (!json) {
    return;
  }

  // textedit only understands "set", not "text". URI-encode so the payload is one
  // atom (JSON spaces would split on a patch cord and break restore).
  if (typeof this !== "undefined" && this.patcher) {
    try {
      store = this.patcher.getnamed("ksh_pattern_data");
      if (store && typeof store.message === "function") {
        if (typeof encodeURIComponent === "function") {
          json = encodeURIComponent(json);
        }
        store.message("set", json);
      }
    } catch (pushError) {
      KSH_CONSTANTS.debugPost("pattern-store set failed", pushError);
    }
  }
}

function markPersistentChange() {
  kshDirtyRevision = (kshDirtyRevision + 1) % 1000000;
  safeMessnamed("ksh_dirty_tick", kshDirtyRevision);
  pushPatternToStore();
  safeNotifyClients();
}

function persistenceArgs(args) {
  var list;
  var i;
  var value;
  var source;

  source = args;
  if (source === undefined || source === null) {
    source = arguments;
  }

  if (typeof arrayfromargs === "function") {
    try {
      return arrayfromargs(source);
    } catch (arrayError) {
      // Live can deliver Dict / String objects that arrayfromargs rejects.
    }
  }

  if (typeof source.length !== "number") {
    return [String(source)];
  }

  list = [];
  for (i = 0; i < source.length; i += 1) {
    value = source[i];
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === "string" || typeof value === "number") {
      list.push(String(value));
      continue;
    }
    if (typeof value === "object" && typeof value.length === "number") {
      list = list.concat(Array.prototype.slice.call(value));
      continue;
    }
    list.push(String(value));
  }
  return list;
}

function encodeStateJson(json) {
  var encoded;
  var chunks;
  var i;

  encoded = typeof encodeURIComponent === "function" ? encodeURIComponent(json) : json;
  chunks = [KSH_PERSISTENCE_CHUNK_PREFIX];

  for (i = 0; i < encoded.length; i += KSH_PERSISTENCE_CHUNK_SIZE) {
    chunks.push(encoded.slice(i, i + KSH_PERSISTENCE_CHUNK_SIZE));
  }

  return chunks;
}

function decodeStateJson(args) {
  var value;
  var encoded;

  if (!args || !args.length) {
    return "";
  }

  if (args.length === 1) {
    value = args[0];
    if (value && typeof value === "object" && typeof value.length === "number" && typeof value !== "string") {
      args = Array.prototype.slice.call(value);
    } else {
      return typeof value === "string" ? value : String(value);
    }
  }

  if (args[0] === "text") {
    return args.slice(1).join(" ");
  }

  if (args[0] === KSH_PERSISTENCE_CHUNK_PREFIX) {
    encoded = args.slice(1).join("");
    return typeof decodeURIComponent === "function" ? decodeURIComponent(encoded) : encoded;
  }

  return args.join("");
}

function liveApiParameterValue(longName) {
  var device;
  var count;
  var i;
  var param;
  var name;
  var value;

  if (typeof LiveAPI !== "function") {
    return "";
  }

  try {
    device = new LiveAPI("this_device");
    count = device.getcount("parameters");
    for (i = 0; i < count; i += 1) {
      param = new LiveAPI(device.getpath() + " parameters " + i);
      name = param.get("name");
      if (Array.isArray(name)) {
        name = name[0];
      }
      if (String(name || "").replace(/'/g, "") === longName) {
        value = param.get("value");
        return normalizePersistencePayload([value]);
      }
    }
  } catch (liveApiError) {
    KSH_CONSTANTS.debugPost("LiveAPI parameter read failed", liveApiError);
  }

  return "";
}

function decodePatternStoreText(value) {
  var decoded;

  if (!value) {
    return "";
  }

  value = String(value).replace(/^\s+|\s+$/g, "");
  if (!value) {
    return "";
  }

  if (value.charAt(0) === "{") {
    return value;
  }

  if (typeof decodeURIComponent === "function") {
    try {
      decoded = decodeURIComponent(value);
      if (decoded && decoded.charAt(0) === "{") {
        return decoded;
      }
    } catch (decodeError) {
      // not URI-encoded persistence text
    }
  }

  return value;
}

function persistencePayloadLooksLikeJson(value) {
  if (!value) {
    return false;
  }

  value = decodePatternStoreText(value);
  if (!value || value === "get" || value === "bang") {
    return false;
  }

  if (value.length < 12) {
    return false;
  }

  if (value.charAt(0) !== "{") {
    return false;
  }

  if (value.indexOf("\"v\":1") >= 0) {
    return true;
  }

  return value.indexOf("\"stepCount\"") >= 0 || value.indexOf("\"sources\"") >= 0;
}

function persistencePayloadIsValid(args) {
  var value;

  if (!args || !args.length) {
    return false;
  }

  if (args[0] === KSH_PERSISTENCE_CHUNK_PREFIX) {
    return true;
  }

  value = normalizePersistencePayload(args);
  return persistencePayloadLooksLikeJson(value);
}

function readPatternStoreValue() {
  var box;
  var pattrBox;
  var value;
  var text;
  var attrNames;
  var i;
  var liveValue;

  liveValue = liveApiParameterValue("ksh_pattern_data");
  if (liveValue) {
    return liveValue;
  }

  if (typeof this !== "undefined" && this.patcher) {
    try {
      pattrBox = this.patcher.getnamed("pattern-pattr");
      if (pattrBox && typeof pattrBox.getvalueof === "function") {
        value = pattrBox.getvalueof();
        text = normalizePersistencePayload([value]);
        if (text) {
          return text;
        }
      }
    } catch (pattrError) {
      KSH_CONSTANTS.debugPost("pattr read failed", pattrError);
    }

    try {
      box = this.patcher.getnamed("ksh_pattern_data");
      if (box && typeof box.getvalueof === "function") {
        value = box.getvalueof();
        text = normalizePersistencePayload([value]);
        if (text) {
          return text;
        }
      }
    } catch (storeValueError) {
      KSH_CONSTANTS.debugPost("pattern-store getvalueof failed", storeValueError);
    }

    if (box) {
      attrNames = ["text", "value"];
      for (i = 0; i < attrNames.length; i += 1) {
        try {
          value = box.getattr(attrNames[i]);
          text = normalizePersistencePayload([value]);
          if (text) {
            return text;
          }
        } catch (attrError) {
          // try next attribute
        }
      }
    }
  }

  return "";
}

function cancelRestoreTask() {
  if (kshRestoreTask && typeof kshRestoreTask.cancel === "function") {
    kshRestoreTask.cancel();
  }
  kshRestoreTask = null;
}

function finishRestoreUiInit() {
  if (kshRestoreFinished) {
    return;
  }
  kshRestoreFinished = true;
  emitFullState();
  snapshot();
  safeMessnamed("ksh_ui_commands", "init");
}

function tryRestoreFromPatternStore() {
  var value;

  kshRestoreApplied = false;
  value = readPatternStoreValue.call(this);
  if (!value) {
    return false;
  }

  return applyPatternPayload([value]);
}

function scheduleRestoreAttempt() {
  var delayMs;

  if (kshRestoreFinished) {
    return;
  }

  if (kshRestoreAttempt >= KSH_RESTORE_MAX_ATTEMPTS) {
    finishRestoreUiInit();
    return;
  }

  delayMs = KSH_RESTORE_DELAYS_MS[kshRestoreAttempt];
  kshRestoreAttempt += 1;

  if (typeof Task !== "function") {
    if (tryRestoreFromPatternStore()) {
      finishRestoreUiInit();
    }
    return;
  }

  kshRestoreTask = new Task(function () {
    kshRestoreTask = null;
    if (kshRestoreFinished) {
      return;
    }
    if (tryRestoreFromPatternStore()) {
      finishRestoreUiInit();
      return;
    }
    scheduleRestoreAttempt();
  }, this);
  kshRestoreTask.schedule(delayMs);
}

function restore_pattern_store() {
  var engine = ensureEngine();
  engine.syncNativePlaybackTable();
  engine.emitNativeMeta();
  engine.emitNativeTimingGate();
  cancelRestoreTask();
  kshRestoreAttempt = 0;
  kshRestoreFinished = false;
  kshRestoreApplied = false;
  scheduleRestoreAttempt();
}

function normalizePersistencePayload(args) {
  var value;
  var parsed;
  var inner;

  value = decodeStateJson(args);
  if (!value) {
    return "";
  }

  if (value && typeof value === "object" && typeof value.length === "number" && value.length) {
    value = value[0];
  }

  value = String(value).replace(/^\s+|\s+$/g, "");
  if (!value) {
    return "";
  }

  value = decodePatternStoreText(value);
  if (!value) {
    return "";
  }

  if (value.charAt(0) !== "{") {
    return value;
  }

  try {
    parsed = JSON.parse(value);
    if (parsed && parsed.ksh_pattern_data !== undefined) {
      inner = parsed.ksh_pattern_data;
      if (Array.isArray(inner)) {
        inner = inner[0];
      }
      if (typeof inner === "string" && inner && inner !== "get") {
        return decodePatternStoreText(inner);
      }
    }
    if (parsed && parsed.v === 1) {
      return JSON.stringify(parsed);
    }
  } catch (unwrapError) {
    // Fall through with the raw textedit buffer.
  }

  return value;
}

function applySerializedState(value, emitPreview) {
  var engine;
  var parsed;
  var previous;

  if (typeof JSON === "undefined" || !value) {
    return false;
  }

  engine = ensureEngine();
  previous = JSON.parse(JSON.stringify(engine.serialize()));

  try {
    parsed = JSON.parse(value);
    if (parsed && parsed.v === 1 && typeof engine.deserializeForPersistence === "function") {
      engine.deserializeForPersistence(parsed);
    } else {
      engine.deserialize(parsed);
    }
  } catch (error) {
    try {
      engine.deserialize(previous);
    } catch (restoreError) {
      KSH_CONSTANTS.debugPost("state restore failed", restoreError);
    }
    if (persistencePayloadLooksLikeJson(value)) {
      postPersistenceError(error);
    }
    return false;
  }

  if (parsed && parsed.v === 1) {
    kshRestoreApplied = true;
  }

  engine.emitNativeMeta();
  engine.emitNativeTimingGate();
  emitFullState();
  snapshot();
  return true;
}

function emitFullState() {
  if (typeof JSON === "undefined") {
    return;
  }
  // Compact v1 JSON fits in one messnamed atom; full serialize() is too large for
  // the editor jsui to receive reliably over ksh_engine_events.
  var engine = ensureEngine();
  safeMessnamed("ksh_engine_events", "engine_state", JSON.stringify(engine.serializeForPersistence()));
  engine.emitNativeTimingGate();
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
  markPersistentChange();
}

function channels(value) {
  ensureEngine().setChannelCount(value);
  markPersistentChange();
}

function refresh_steps(value) {
  ensureEngine().setRefreshSteps(value);
  markPersistentChange();
}

function mode(value) {
  ensureEngine().setGenerationMode(value);
  markPersistentChange();
}

function static_source(source) {
  ensureEngine().setStaticSource(zeroBased(source));
  markPersistentChange();
}

function rate(value) {
  ensureEngine().setRate(value);
  markPersistentChange();
}

function tempo(value) {
  ensureEngine().setTempo(value);
  markPersistentChange();
}

function swing(value) {
  ensureEngine().setSwing(value);
  markPersistentChange();
}

function velocity_humanize(value) {
  ensureEngine().setVelocityHumanize(value);
  markPersistentChange();
}

function timing_humanize(value) {
  ensureEngine().setTimingHumanize(value);
  markPersistentChange();
}

function native_timing(value) {
  ensureEngine().setNativeTiming(value);
  markPersistentChange();
}

function device_active(value) {
  ensureEngine().setDeviceActive(value);
  markPersistentChange();
}

function phase_offset_beats(value) {
  ensureEngine().setPhaseOffsetBeats(value);
  markPersistentChange();
}

function channel_label() {
  var args = arrayfromargs(arguments);
  var channel = zeroBased(args.shift());
  ensureEngine().setChannelLabel(channel, args.join(" "));
  markPersistentChange();
}

function channel_note(channel, note) {
  ensureEngine().setChannelNote(zeroBased(channel), note);
  markPersistentChange();
}

function channel_audition(channel) {
  ensureEngine().auditionChannel(zeroBased(channel));
}

function channel_lock(channel, lock) {
  var normalized = String(lock).toLowerCase() === "random" ? -1 : zeroBased(lock);
  ensureEngine().setChannelLock(zeroBased(channel), normalized);
  markPersistentChange();
}

function channel_loop_length(channel, loopLength) {
  ensureEngine().setChannelLoopLength(zeroBased(channel), loopLength);
  markPersistentChange();
}

function channel_playback_mode(channel, mode) {
  ensureEngine().setChannelPlaybackMode(zeroBased(channel), mode);
  markPersistentChange();
}

function source_channel_mute(source, channel, muted) {
  ensureEngine().setSourceChannelMute(zeroBased(source), zeroBased(channel), parseInt(muted, 10) !== 0);
  markPersistentChange();
}

function source_channel_reset(source, channel) {
  ensureEngine().resetSourceChannel(zeroBased(source), zeroBased(channel));
  markPersistentChange();
  emitFullState();
}

function cell(source, channel, stepIndex, enabled, velocity, probability, cycle, cycleOffset, cycleInverted) {
  ensureEngine().setCell(
    zeroBased(source),
    zeroBased(channel),
    zeroBased(stepIndex),
    parseInt(enabled, 10) !== 0,
    velocity,
    probability,
    cycle,
    cycleOffset,
    cycleInverted
  );
  markPersistentChange();
}

function cell_enabled(source, channel, stepIndex, enabled) {
  ensureEngine().setCellEnabled(
    zeroBased(source),
    zeroBased(channel),
    zeroBased(stepIndex),
    parseInt(enabled, 10) !== 0
  );
  markPersistentChange();
}

function cell_velocity(source, channel, stepIndex, velocity) {
  ensureEngine().setCellVelocity(zeroBased(source), zeroBased(channel), zeroBased(stepIndex), velocity);
  markPersistentChange();
}

function cell_probability(source, channel, stepIndex, probability) {
  ensureEngine().setCellProbability(zeroBased(source), zeroBased(channel), zeroBased(stepIndex), probability);
  markPersistentChange();
}

function cell_cycle(source, channel, stepIndex, cycleValue) {
  ensureEngine().setCellCycle(zeroBased(source), zeroBased(channel), zeroBased(stepIndex), cycleValue);
  markPersistentChange();
}

function cell_cycle_offset(source, channel, stepIndex, cycleOffset) {
  ensureEngine().setCellCycleOffset(zeroBased(source), zeroBased(channel), zeroBased(stepIndex), cycleOffset);
  markPersistentChange();
}

function cell_cycle_inverted(source, channel, stepIndex, cycleInverted) {
  ensureEngine().setCellCycleInverted(zeroBased(source), zeroBased(channel), zeroBased(stepIndex), cycleInverted);
  markPersistentChange();
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
  return encodeStateJson(JSON.stringify(ensureEngine().serialize()));
}

function applyPatternPayload(args) {
  var value;

  if (typeof JSON === "undefined" || !args || !args.length) {
    return false;
  }

  if (!persistencePayloadIsValid(args)) {
    return false;
  }

  value = normalizePersistencePayload(args);
  if (!persistencePayloadLooksLikeJson(value)) {
    return false;
  }

  return applySerializedState(value, true);
}

function pattern_data() {
  applyPatternPayload(persistenceArgs(arguments));
}

function setvalueof() {
  if (typeof JSON === "undefined" || !arguments.length) {
    return;
  }

  applyPatternPayload(persistenceArgs(arguments));
}

function embedded_state_begin() {
  kshEmbeddedRestoreChunks = [];
}

function embedded_state_chunk(index, chunk) {
  index = parseInt(index, 10);
  if (isNaN(index) || index < 0) {
    return;
  }
  kshEmbeddedRestoreChunks[index] = String(chunk || "");
}

function embedded_state_end() {
  var value;

  if (!kshEmbeddedRestoreChunks.length) {
    return;
  }

  value = decodeStateJson([KSH_PERSISTENCE_CHUNK_PREFIX].concat(kshEmbeddedRestoreChunks));
  kshEmbeddedRestoreChunks = [];
  applySerializedState(value, true);
}

function save() {
  var chunks;
  var i;

  if (typeof JSON === "undefined" || typeof embedmessage !== "function") {
    return;
  }

  chunks = encodeStateJson(JSON.stringify(ensureEngine().serialize()));
  embedmessage("embedded_state_begin", chunks.length - 1);
  for (i = 1; i < chunks.length; i += 1) {
    embedmessage("embedded_state_chunk", i - 1, chunks[i]);
  }
  embedmessage("embedded_state_end");
}

function state(json) {
  if (typeof JSON !== "undefined" && json) {
    try {
      ensureEngine().deserialize(JSON.parse(json));
      markPersistentChange();
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
