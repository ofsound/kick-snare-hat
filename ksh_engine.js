autowatch = 1;
inlets = 1;
outlets = 1;

var KSH_EngineClass = null;

(function (root) {
  function clamp(value, min, max) {
    value = parseInt(value, 10);
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
    return {
      enabled: cell.enabled ? 1 : 0,
      velocity: clamp(cell.velocity, 1, 127),
      gateMode: cell.gateMode || "always",
      random: clamp(cell.random, 0, 100),
      cycle: clamp(cell.cycle, 1, 64),
      source: typeof cell.source === "number" ? cell.source : -1
    };
  }

  function defaultCell() {
    return {
      enabled: 0,
      velocity: 100,
      gateMode: "always",
      random: 100,
      cycle: 1,
      source: -1
    };
  }

  function makePattern() {
    var channels = [];
    var ch;
    var st;

    for (ch = 0; ch < 8; ch += 1) {
      channels[ch] = [];
      for (st = 0; st < 16; st += 1) {
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
    this.lastStepTime = 0;
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
    var defaultNotes = [36, 37, 38, 39, 40, 41, 42, 43];
    var defaultLabels = ["Kick", "Snare", "Hat", "Open Hat", "Tom 1", "Tom 2", "Clap", "Ride"];

    this.channels = [];
    for (i = 0; i < 8; i += 1) {
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
    for (s = 0; s < 4; s += 1) {
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
    this.stepCount = clamp(count, 1, 16);
    this.currentStep = this.currentStep % this.stepCount;
    this.refreshSteps = clamp(this.refreshSteps, 1, this.stepCount);
    this.generateWindow(0, this.stepCount);
    this.status("steps " + this.stepCount);
  };

  KickSnareHatEngine.prototype.setChannelCount = function (count) {
    this.channelCount = clamp(count, 1, 8);
    this.generateWindow(0, this.stepCount);
    this.status("channels " + this.channelCount);
  };

  KickSnareHatEngine.prototype.setRefreshSteps = function (count) {
    this.refreshSteps = clamp(count, 1, this.stepCount);
    this.status("refresh_steps " + this.refreshSteps);
  };

  KickSnareHatEngine.prototype.setGenerationMode = function (mode) {
    mode = String(mode || "").toLowerCase();
    if (mode === "perchannel" || mode === "per_channel" || mode === "per-channel") {
      this.generationMode = "per_channel";
    } else {
      this.generationMode = "stack";
    }
    this.generateWindow(0, this.stepCount);
    this.status("mode " + this.generationMode);
  };

  KickSnareHatEngine.prototype.setRate = function (rate) {
    var allowed = {
      "4n": 1,
      "4nt": 1,
      "8n": 1,
      "8nt": 1,
      "16n": 1,
      "16nt": 1,
      "32n": 1,
      "32nt": 1
    };

    rate = String(rate || "16n");
    this.rate = allowed[rate] ? rate : "16n";
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

    this.stepIntervalMs = quarterMs * (ratios[this.rate] || ratios["16n"]);
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

  KickSnareHatEngine.prototype.setChannelLabel = function (channel, label) {
    channel = clamp(channel, 0, 7);
    this.channels[channel].label = String(label || "");
    this.status("channel_label " + (channel + 1) + " " + this.channels[channel].label);
  };

  KickSnareHatEngine.prototype.setChannelNote = function (channel, note) {
    channel = clamp(channel, 0, 7);
    this.channels[channel].note = clamp(note, 0, 127);
    this.status("channel_note " + (channel + 1) + " " + this.channels[channel].note);
  };

  KickSnareHatEngine.prototype.setChannelLock = function (channel, lock) {
    channel = clamp(channel, 0, 7);
    this.channels[channel].lock = clamp(lock, -1, 3);
    this.generateWindow(0, this.stepCount);
    this.status("channel_lock " + (channel + 1) + " " + this.channels[channel].lock);
  };

  KickSnareHatEngine.prototype.setCell = function (source, channel, step, enabled, velocity, gateMode, value) {
    var cell;

    source = clamp(source, 0, 3);
    channel = clamp(channel, 0, 7);
    step = clamp(step, 0, 15);

    cell = this.sources[source][channel][step];
    cell.enabled = enabled ? 1 : 0;
    cell.velocity = clamp(velocity, 1, 127);
    cell.gateMode = this.normalizeGateMode(gateMode);

    if (cell.gateMode === "random") {
      cell.random = clamp(value, 0, 100);
    } else if (cell.gateMode === "cycle") {
      cell.cycle = clamp(value, 1, 64);
    }

    this.generateWindow(0, this.stepCount);
  };

  KickSnareHatEngine.prototype.setCellEnabled = function (source, channel, step, enabled) {
    source = clamp(source, 0, 3);
    channel = clamp(channel, 0, 7);
    step = clamp(step, 0, 15);
    this.sources[source][channel][step].enabled = enabled ? 1 : 0;
    this.generateWindow(0, this.stepCount);
  };

  KickSnareHatEngine.prototype.setCellVelocity = function (source, channel, step, velocity) {
    source = clamp(source, 0, 3);
    channel = clamp(channel, 0, 7);
    step = clamp(step, 0, 15);
    this.sources[source][channel][step].velocity = clamp(velocity, 1, 127);
    this.generateWindow(0, this.stepCount);
  };

  KickSnareHatEngine.prototype.setCellGate = function (source, channel, step, gateMode, value) {
    var cell;

    source = clamp(source, 0, 3);
    channel = clamp(channel, 0, 7);
    step = clamp(step, 0, 15);
    cell = this.sources[source][channel][step];
    cell.gateMode = this.normalizeGateMode(gateMode);

    if (cell.gateMode === "random") {
      cell.random = clamp(value, 0, 100);
    } else if (cell.gateMode === "cycle") {
      cell.cycle = clamp(value, 1, 64);
    }

    this.generateWindow(0, this.stepCount);
  };

  KickSnareHatEngine.prototype.normalizeGateMode = function (gateMode) {
    gateMode = String(gateMode || "always").toLowerCase();
    if (gateMode === "random" || gateMode === "probability") {
      return "random";
    }
    if (gateMode === "cycle" || gateMode === "every") {
      return "cycle";
    }
    return "always";
  };

  KickSnareHatEngine.prototype.reset = function () {
    if (typeof cancelPendingNoteTasks === "function") {
      cancelPendingNoteTasks();
    }
    this.currentStep = 0;
    this.playingStepOneBased = 0;
    this.cycleCounters = {};
    this.lastStepTime = 0;
    this.generateWindow(0, this.stepCount, true);
    this.reportPlayingStep();
    this.status("reset");
  };

  KickSnareHatEngine.prototype.randomSource = function () {
    return clamp(Math.floor(this.rng() * 4), 0, 3);
  };

  KickSnareHatEngine.prototype.generateWindow = function (startStep, length, forceEmit) {
    var offset;
    var step;
    var channel;
    var source;
    var stackSource;
    var cell;

    if (forceEmit === undefined) {
      forceEmit = false;
    }

    startStep = clamp(startStep, 0, this.stepCount - 1);
    length = clamp(length, 1, this.stepCount);

    for (offset = 0; offset < length; offset += 1) {
      step = (startStep + offset) % this.stepCount;
      stackSource = this.randomSource();

      for (channel = 0; channel < this.channelCount; channel += 1) {
        if (this.channels[channel].lock >= 0) {
          source = this.channels[channel].lock;
        } else if (this.generationMode === "per_channel") {
          source = this.randomSource();
        } else {
          source = stackSource;
        }

        cell = cloneCell(this.sources[source][channel][step]);
        cell.source = source;
        this.generated[channel][step] = cell;
      }
    }

    if (this.editorActive || forceEmit) {
      this.emitPreview(this.snapshot());
    }
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

  KickSnareHatEngine.prototype.step = function () {
    var channel;
    var cell;
    var notes = [];
    var note;
    var now;

    this.playingStepOneBased = this.currentStep + 1;
    this.reportPlayingStep();

    now = Date.now();
    if (this.lastStepTime > 0 && now > this.lastStepTime) {
      this.stepIntervalMs = now - this.lastStepTime;
    }
    this.lastStepTime = now;

    if (this.currentStep % this.refreshSteps === 0) {
      this.generateWindow(this.currentStep, this.refreshSteps, true);
    }

    for (channel = 0; channel < this.channelCount; channel += 1) {
      cell = this.generated[channel][this.currentStep];
      if (this.shouldFire(cell, channel, this.currentStep)) {
        note = {
          lane: channel + 1,
          step: this.currentStep + 1,
          pitch: this.channels[channel].note,
          velocity: cell.velocity,
          channel: this.midiChannel,
          durationMs: this.noteDurationMs,
          delayMs: this.currentStep % 2 === 1 ? this.stepIntervalMs * 0.5 * (this.swing / 100) : 0,
          label: this.channels[channel].label,
          source: cell.source + 1
        };
        notes.push(note);
        this.emitNote(note);
      }
    }

    this.currentStep = (this.currentStep + 1) % this.stepCount;
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
      channels: this.channels,
      sources: this.sources
    };
  };

  KickSnareHatEngine.prototype.deserialize = function (state) {
    var source;
    var channel;
    var step;

    state = normalizeIncomingState(state);
    if (!state) {
      return;
    }

    this.setStepCount(state.stepCount || this.stepCount);
    this.setChannelCount(state.channelCount || this.channelCount);
    this.setRefreshSteps(state.refreshSteps || this.refreshSteps);
    this.setGenerationMode(state.generationMode || this.generationMode);
    this.setRate(state.rate || this.rate);
    this.setTempo(state.tempo || this.tempo);
    this.setSwing(state.swing || this.swing);
    this.setMidiChannel(state.midiChannel || this.midiChannel);
    this.setNoteDurationMs(state.noteDurationMs || this.noteDurationMs);

    if (state.channels) {
      for (channel = 0; channel < Math.min(8, state.channels.length); channel += 1) {
        this.channels[channel].label = String(state.channels[channel].label || this.channels[channel].label);
        this.channels[channel].note = clamp(state.channels[channel].note, 0, 127);
        this.channels[channel].lock = clamp(state.channels[channel].lock, -1, 3);
      }
    }

    if (state.sources) {
      for (source = 0; source < Math.min(4, state.sources.length); source += 1) {
        for (channel = 0; channel < Math.min(8, state.sources[source].length); channel += 1) {
          for (step = 0; step < Math.min(16, state.sources[source][channel].length); step += 1) {
            this.sources[source][channel][step] = cloneCell(state.sources[source][channel][step]);
          }
        }
      }
    }

    this.reset();
  };

  KickSnareHatEngine.normalizeIncomingState = normalizeIncomingState;
  KSH_EngineClass = KickSnareHatEngine;
  root.KickSnareHatEngine = KickSnareHatEngine;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = KickSnareHatEngine;
  }
}(this));

var kshPendingNoteOffs = [];
var kshEngine = null;

function cancelPendingNoteTasks() {
  var i;
  var task;

  for (i = kshPendingNoteOffs.length - 1; i >= 0; i -= 1) {
    task = kshPendingNoteOffs[i];
    if (task && typeof task.cancel === "function") {
      task.cancel();
    }
  }
  kshPendingNoteOffs.length = 0;
}

function emitFullState() {
  if (typeof JSON !== "undefined" && typeof messnamed === "function") {
    messnamed("ksh_engine_events", "engine_state", JSON.stringify(ensureEngine().serialize()));
  }
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
      // Keep the Live audio thread clear of transient JS outlet errors while
      // Max recompiles or reloads the device.
    }
  }

  function removePendingTask(t) {
    var idx = kshPendingNoteOffs.indexOf(t);
    if (idx !== -1) {
      kshPendingNoteOffs.splice(idx, 1);
    }
  }

  kshEngine = new KSH_EngineClass({
    emitNote: function (note) {
      var onTask;
      var offTask;

      if (typeof outlet !== "function") {
        return;
      }

      if (typeof Task === "function") {
        onTask = new Task(function () {
          safeOutlet(0, note.pitch, note.velocity, note.channel);
          removePendingTask(onTask);
        });
        kshPendingNoteOffs.push(onTask);
        onTask.schedule(note.delayMs || 0);

        offTask = new Task(function () {
          safeOutlet(0, note.pitch, 0, note.channel);
          removePendingTask(offTask);
        });
        kshPendingNoteOffs.push(offTask);
        offTask.schedule((note.delayMs || 0) + note.durationMs);
      } else {
        safeOutlet(0, note.pitch, note.velocity, note.channel);
        safeOutlet(0, note.pitch, 0, note.channel);
      }
    },
    emitPreview: function (snapshot) {
      if (typeof JSON !== "undefined" && typeof messnamed === "function") {
        messnamed("ksh_engine_events", "preview", JSON.stringify(snapshot));
      }
    },
    emitStatus: function (message) {
      if (typeof messnamed === "function") {
        messnamed("ksh_engine_events", "status", message);
      }
    },
    emitCurrentStep: function (step) {
      if (typeof messnamed === "function") {
        messnamed("ksh_engine_events", "current_step", step);
      }
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

function step() {
  ensureEngine().step();
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
  if (typeof JSON !== "undefined" && typeof messnamed === "function") {
    messnamed("ksh_engine_events", "preview", JSON.stringify(ensureEngine().snapshot()));
  }
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
  if (typeof JSON === "undefined" || !value) {
    return;
  }

  if (typeof value !== "string") {
    value = String(value);
  }

  ensureEngine().deserialize(JSON.parse(value));
  emitFullState();
}

function state(json) {
  if (typeof JSON !== "undefined" && json) {
    try {
      ensureEngine().deserialize(JSON.parse(json));
      emitFullState();
    } catch (e) {
      // safe catch
    }
  }
}

function editor_active(val) {
  var engine = ensureEngine();
  engine.editorActive = parseInt(val, 10) !== 0;
  engine.reportPlayingStep();
}
