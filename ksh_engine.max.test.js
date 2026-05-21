// Drives the Max-only wrapper block at the bottom of ksh_engine.js inside a
// vm sandbox so we can verify outlet plumbing, native scheduler handoff,
// messnamed event emission, and the getvalueof/setvalueof JSON contract end
// to end. The regular ksh_engine.test.js loads the file via require(), which
// skips the Max wrapper entirely.

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

function makeMaxSandbox() {
  var notes = [];
  var named = [];
  var scheduled = [];
  var posts = [];

  function TaskStub(fn, ctx) {
    var self = this;
    self.fn = fn;
    self.ctx = ctx;
    self.cancelled = false;
    self.interval = 0;
    self.schedule = function (delay) {
      self.cancelled = false;
      scheduled.push({ task: self, delay: delay || 0, fn: fn, ctx: ctx });
    };
    self.cancel = function () {
      self.cancelled = true;
    };
    self.repeat = function () {
      // repeat() is used by the UIs, not the engine; safe no-op here.
    };
  }

  var sandbox = {
    autowatch: 0,
    inlets: 0,
    outlets: 0,
    messagename: "",
    outlet: function (idx) {
      var args = Array.prototype.slice.call(arguments, 1);
      notes.push({ outlet: idx, args: args });
    },
    arrayfromargs: function () {
      // Max's arrayfromargs is typically invoked as arrayfromargs(arguments)
      // and unpacks the caller's arguments into a flat array. Mirror that:
      // a single array-like argument is flattened; otherwise we return our
      // own arguments as-is.
      if (arguments.length === 1
          && arguments[0] != null
          && typeof arguments[0] === "object"
          && typeof arguments[0].length === "number") {
        return Array.prototype.slice.call(arguments[0]);
      }
      return Array.prototype.slice.call(arguments);
    },
    messnamed: function (busName) {
      var args = Array.prototype.slice.call(arguments, 1);
      named.push({ bus: busName, args: args });
    },
    post: function () {
      posts.push(Array.prototype.slice.call(arguments).join(""));
    },
    Task: TaskStub,
    JSON: JSON,
    Math: Math,
    String: String,
    Number: Number,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    console: console
  };

  sandbox.global = sandbox;

  sandbox._flush = function () {
    // Run all pending UI coalescing tasks in scheduled order, including any
    // tasks scheduled while flushing.
    while (scheduled.length) {
      var entry = scheduled.shift();
      if (!entry.task.cancelled) {
        entry.fn.call(entry.ctx);
      }
    }
  };
  sandbox._notes = function () { return notes.slice(); };
  sandbox._named = function () { return named.slice(); };
  sandbox._clear = function () {
    notes.length = 0;
    named.length = 0;
    scheduled.length = 0;
    posts.length = 0;
  };
  sandbox._scheduledCount = function () { return scheduled.length; };
  sandbox._posts = function () { return posts.slice(); };

  vm.createContext(sandbox);
  sandbox.include = function (filename) {
    var includeSrc = fs.readFileSync(path.join(__dirname, filename), "utf8");
    vm.runInContext(includeSrc, sandbox, { filename: filename });
  };
  var src = fs.readFileSync(path.join(__dirname, "ksh_engine.js"), "utf8");
  vm.runInContext(src, sandbox, { filename: "ksh_engine.js" });
  return sandbox;
}

function eventsOn(sb, eventName) {
  return sb._named().filter(function (m) {
    return m.bus === "ksh_engine_events" && m.args[0] === eventName;
  });
}

function lastEventOn(sb, eventName) {
  var events = eventsOn(sb, eventName);
  return events[events.length - 1];
}

function testMaxWrapperBootsEngineAndExposesHandlers() {
  var sb = makeMaxSandbox();
  assert.ok(sb.kshEngine, "kshEngine should be constructed by the Max wrapper");
  assert.strictEqual(typeof sb.cell, "function");
  assert.strictEqual(typeof sb.cell_probability, "function");
  assert.strictEqual(typeof sb.cell_cycle, "function");
  assert.strictEqual(typeof sb.transport_position, "function");
  assert.strictEqual(typeof sb.reset, "function");
  assert.strictEqual(typeof sb.sync_all, "function");
  assert.strictEqual(typeof sb.getvalueof, "function");
  assert.strictEqual(typeof sb.setvalueof, "function");
  assert.strictEqual(typeof sb.midi_channel, "undefined");
  assert.strictEqual(typeof sb.duration_ms, "undefined");
  assert.strictEqual(typeof sb.velocity_humanize, "function");
  assert.strictEqual(typeof sb.timing_humanize, "function");
  assert.strictEqual(typeof sb.phase_offset_beats, "function");
  assert.strictEqual(typeof sb.device_active, "function");
  assert.strictEqual(typeof sb.editor_active, "function");
  assert.strictEqual(typeof sb.static_source, "function");
  assert.strictEqual(typeof sb.channel_loop_length, "function");
  assert.strictEqual(typeof sb.source_channel_mute, "function");
  assert.strictEqual(typeof sb.source_channel_reset, "function");
}

function testStatusMessagesEmitUiSelectors() {
  var sb = makeMaxSandbox();
  var stepsEvent;
  var lockEvent;
  var phaseEvent;
  var staticSourceEvent;
  var muteEvent;
  var loopLengthEvent;

  sb._clear();
  sb.steps(8);
  sb.mode("static");
  sb.static_source(3);
  sb.channel_lock(1, 2);
  sb.channel_loop_length(1, 5);
  sb.velocity_humanize(12);
  sb.timing_humanize(8);
  sb.phase_offset_beats(0.125);
  sb.source_channel_mute(2, 1, 1);

  stepsEvent = lastEventOn(sb, "steps");
  lockEvent = lastEventOn(sb, "channel_lock");
  phaseEvent = lastEventOn(sb, "phase_offset_beats");
  staticSourceEvent = lastEventOn(sb, "static_source");
  muteEvent = lastEventOn(sb, "source_channel_mute");
  loopLengthEvent = lastEventOn(sb, "channel_loop_length");

  assert.ok(stepsEvent, "steps should emit a direct UI selector");
  assert.deepStrictEqual(stepsEvent.args, ["steps", "8"]);
  assert.ok(lockEvent, "channel_lock should emit a direct UI selector");
  assert.deepStrictEqual(lockEvent.args, ["channel_lock", "1", "2"],
    "channel_lock status should use Max/UI-facing 1-based source indices");
  assert.ok(phaseEvent, "phase_offset_beats should emit a direct UI selector");
  assert.deepStrictEqual(phaseEvent.args, ["phase_offset_beats", "0.125"]);
  assert.ok(staticSourceEvent, "static_source should emit a direct UI selector");
  assert.deepStrictEqual(staticSourceEvent.args, ["static_source", "3"]);
  assert.ok(muteEvent, "source_channel_mute should emit a direct UI selector");
  assert.deepStrictEqual(muteEvent.args, ["source_channel_mute", "2", "1", "1"]);
  assert.ok(loopLengthEvent, "channel_loop_length should emit a direct UI selector");
  assert.deepStrictEqual(loopLengthEvent.args, ["channel_loop_length", "1", "5"]);
  assert.deepStrictEqual(lastEventOn(sb, "velocity_humanize").args, ["velocity_humanize", "12"]);
  assert.deepStrictEqual(lastEventOn(sb, "timing_humanize").args, ["timing_humanize", "8"]);
  assert.strictEqual(eventsOn(sb, "status").length, 0,
    "status updates should not be hidden behind a generic status selector");
}

function testSyncAllEmitsStateAndPreview() {
  var sb = makeMaxSandbox();
  sb._clear();

  sb.sync_all();

  assert.strictEqual(eventsOn(sb, "engine_state").length, 1,
    "sync_all should emit one full engine_state event");
  assert.strictEqual(eventsOn(sb, "preview").length, 1,
    "sync_all should emit one preview event");
}

function testRecomposeCommandsFlushPreviewForCompactUi() {
  var sb = makeMaxSandbox();
  var previews;
  var snapshot;

  sb._clear();
  sb.steps(8);

  previews = eventsOn(sb, "preview");
  assert.strictEqual(previews.length, 1,
    "step-count recomposition should immediately refresh compact preview data");

  snapshot = JSON.parse(previews[0].args[1]);
  assert.strictEqual(snapshot.stepCount, 8);
  assert.strictEqual(snapshot.generated[0].length, 8);
}

function testCellMessageWritesToEngineSourceAndCoalescesPreview() {
  var sb = makeMaxSandbox();
  sb.editor_active(1);
  sb.mode("stack");
  // Lock channel 1 to source 2 so the generated cell at (channel 0, step 4)
  // is guaranteed to be sourced from source index 1, which is exactly what
  // the cell edits below modify. Without the lock the generated grid might
  // have rolled to a different source and the in-place mutation path would
  // (correctly) skip the preview entirely.
  sb.channel_lock(1, 2);
  // Flush any preview Task scheduled by setup before we start counting, so
  // the wrapper's pending-preview latch is released.
  sb._flush();
  sb._clear();

  sb.cell(2, 1, 5, 1, 88, 100, 1);
  sb.cell(2, 1, 5, 1, 99, 80, 2);
  sb.cell(2, 1, 5, 1, 110, 70, 3);

  // Three edits → at most one preview Task scheduled, no synchronous preview
  // emission yet because the schedule is deferred.
  assert.strictEqual(eventsOn(sb, "preview").length, 0,
    "preview should be deferred until the scheduled Task fires");

  sb._flush();

  var previews = eventsOn(sb, "preview");
  assert.strictEqual(previews.length, 1,
    "burst of cell edits should coalesce into one preview emission");

  assert.strictEqual(sb.kshEngine.sources[1][0][4].enabled, 1);
  assert.strictEqual(sb.kshEngine.sources[1][0][4].velocity, 110);
  assert.strictEqual(sb.kshEngine.sources[1][0][4].probability, 70);
  assert.strictEqual(sb.kshEngine.sources[1][0][4].cycle, 3);
}

function testSourceChannelResetClearsStateAndEmitsFullState() {
  var sb = makeMaxSandbox();
  var stateEvents;
  var parsed;

  sb._clear();
  sb.steps(8);
  sb.channel_loop_length(1, 3);
  sb.cell(1, 1, 1, 1, 88, 30, 3);
  sb.source_channel_mute(1, 1, 1);
  sb._flush();
  sb._clear();

  sb.source_channel_reset(1, 1);

  assert.strictEqual(sb.kshEngine.sources[0][0][0].enabled, 0);
  assert.strictEqual(sb.kshEngine.sources[0][0][0].velocity, 100);
  assert.strictEqual(sb.kshEngine.sources[0][0][0].probability, 100);
  assert.strictEqual(sb.kshEngine.sources[0][0][0].cycle, 1);
  assert.strictEqual(sb.kshEngine.sourceChannelMutes[0][0], 0);
  assert.strictEqual(sb.kshEngine.channels[0].loopLength, 8);

  stateEvents = eventsOn(sb, "engine_state");
  assert.strictEqual(stateEvents.length, 1,
    "source_channel_reset should emit one full engine_state event");
  parsed = JSON.parse(stateEvents[0].args[1]);
  assert.strictEqual(parsed.sources[0][0][0].enabled, 0);
  assert.strictEqual(parsed.sourceChannelMutes[0][0], 0);
  assert.strictEqual(parsed.channels[0].loopLength, 8);
}

function testChannelAuditionEmitsNoteToOutlet() {
  var sb = makeMaxSandbox();

  sb._clear();
  sb.channels(2);
  sb.channel_note(2, 50);
  sb.channel_audition(2);

  assert.strictEqual(sb._notes().length, 1);
  assert.deepStrictEqual(sb._notes()[0].args, [50, 100, 100, 1, 0]);
}

function testTransportPositionEmitsNativeSchedulerEvent() {
  var sb = makeMaxSandbox();
  sb._clear();
  sb.steps(4);
  sb.channels(1);
  sb.rate("16n");
  sb.tempo(120);
  sb.cell(1, 1, 1, 1, 90, 100, 1);
  sb._flush();
  sb._clear();

  sb.transport_position(0, 1);

  var emitted = sb._notes();
  assert.strictEqual(emitted.length, 1, "should emit one raw note event");
  // safeOutlet(0, pitch, velocity, durationMs, channel, delayMs)
  assert.strictEqual(emitted[0].outlet, 0);
  assert.deepStrictEqual(emitted[0].args, [36, 90, 100, 1, 0],
    "raw note event should be pitch velocity duration channel delay");
  assert.strictEqual(sb._scheduledCount(), 0,
    "note output should not allocate per-note Task objects");
}

function testResetClearsNativeScheduler() {
  var sb = makeMaxSandbox();
  sb._clear();
  sb.steps(4);
  sb.channels(1);
  sb.cell(1, 1, 1, 1, 100, 100, 1);
  sb._flush();
  sb._clear();

  sb.transport_position(0, 1);
  assert.strictEqual(sb._notes().length, 1, "note event should emit immediately to the native scheduler");
  sb._clear();

  sb.reset();

  var schedulerMessages = sb._named().filter(function (m) {
    return m.bus === "ksh_scheduler_commands" && m.args[0] === "clear";
  });
  assert.strictEqual(schedulerMessages.length, 1,
    "reset should clear pending native scheduler events and held notes");
}

function testStoppedTransportClearsSchedulerOnceNotPerTick() {
  // Regression: when Live's transport is stopped, plugsync~ keeps emitting
  // transport_position(*, 0). The engine used to send a `clear` to
  // ksh_scheduler_commands on every one of those ticks, which raced against
  // and silenced one-shot auditions queued through the same `pipe`. The
  // clear must only fire on the *transition* from playing -> stopped.
  var sb = makeMaxSandbox();
  sb._clear();
  sb.steps(4);
  sb.channels(1);

  // Start playing so a subsequent stop counts as a transition.
  sb.transport_position(0, 1);
  sb._clear();

  // First stopped tick: should emit one `clear` (the transition).
  sb.transport_position(0, 0);
  var clears = sb._named().filter(function (m) {
    return m.bus === "ksh_scheduler_commands" && m.args[0] === "clear";
  });
  assert.strictEqual(clears.length, 1,
    "playing -> stopped transition should clear pending scheduler events");

  // Subsequent stopped ticks: must NOT emit any further `clear`s, otherwise
  // they will race against and silence audition notes.
  sb._clear();
  sb.transport_position(0, 0);
  sb.transport_position(0.001, 0);
  sb.transport_position(0.002, 0);
  clears = sb._named().filter(function (m) {
    return m.bus === "ksh_scheduler_commands" && m.args[0] === "clear";
  });
  assert.strictEqual(clears.length, 0,
    "stopped-state transport_position ticks must not flush the native scheduler repeatedly");

  // Auditioning while stopped must produce a note event that is not
  // accompanied by a scheduler clear (which would race the pipe).
  sb._clear();
  sb.channel_audition(1);
  assert.strictEqual(sb._notes().length, 1,
    "audition while stopped should emit a one-shot note event");
  clears = sb._named().filter(function (m) {
    return m.bus === "ksh_scheduler_commands" && m.args[0] === "clear";
  });
  assert.strictEqual(clears.length, 0,
    "audition path must not emit a scheduler clear that would silence itself");
}

function testGetValueOfSetValueOfRoundtripsEngineState() {
  var sb = makeMaxSandbox();
  sb._clear();
  sb.steps(8);
  sb.channels(2);
  sb.swing(40);
  sb.device_active(0);
  sb.velocity_humanize(12);
  sb.timing_humanize(8);
  sb.phase_offset_beats(0.5);
  sb.mode("static");
  sb.static_source(4);
  sb.cell(1, 1, 1, 1, 64, 30, 1);
  sb.channel_label(1, "Sub");
  sb.channel_note(2, 50);
  sb.channel_loop_length(1, 5);
  sb._flush();

  var serialized = sb.getvalueof();
  assert.strictEqual(typeof serialized, "string");
  var parsed = JSON.parse(serialized);
  assert.strictEqual(parsed.stepCount, 8);
  assert.strictEqual(parsed.channelCount, 2);
  assert.strictEqual(parsed.swing, 40);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(parsed, "midiChannel"), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(parsed, "noteDurationMs"), false);
  assert.strictEqual(parsed.deviceActive, 0);
  assert.strictEqual(parsed.velocityHumanize, 12);
  assert.strictEqual(parsed.timingHumanize, 8);
  assert.strictEqual(parsed.phaseOffsetBeats, 0.5);
  assert.strictEqual(parsed.generationMode, "static");
  assert.strictEqual(parsed.staticSource, 3);
  assert.strictEqual(parsed.channels[0].label, "Sub");
  assert.strictEqual(parsed.channels[0].loopLength, 5);
  assert.strictEqual(parsed.channels[1].note, 50);

  // Roundtrip into a fresh sandbox to prove the wire format is reloadable.
  var sb2 = makeMaxSandbox();
  sb2._clear();
  sb2.setvalueof(serialized);
  sb2._flush();
  assert.strictEqual(sb2.kshEngine.stepCount, 8);
  assert.strictEqual(sb2.kshEngine.channelCount, 2);
  assert.strictEqual(sb2.kshEngine.swing, 40);
  assert.strictEqual(sb2.kshEngine.deviceActive, false);
  assert.strictEqual(sb2.kshEngine.velocityHumanize, 12);
  assert.strictEqual(sb2.kshEngine.timingHumanize, 8);
  assert.strictEqual(sb2.kshEngine.phaseOffsetBeats, 0.5);
  assert.strictEqual(sb2.kshEngine.generationMode, "static");
  assert.strictEqual(sb2.kshEngine.staticSource, 3);
  assert.strictEqual(sb2.kshEngine.channels[0].label, "Sub");
  assert.strictEqual(sb2.kshEngine.channels[0].loopLength, 5);
  assert.strictEqual(sb2.kshEngine.channels[1].note, 50);
  assert.strictEqual(sb2.kshEngine.sources[0][0][0].enabled, 1);
  assert.strictEqual(sb2.kshEngine.sources[0][0][0].probability, 30);
  assert.strictEqual(sb2.kshEngine.sources[0][0][0].cycle, 1);

  // setvalueof should emit an engine_state event so the UIs resync.
  var engineStateEvents = eventsOn(sb2, "engine_state");
  assert.ok(engineStateEvents.length >= 1, "setvalueof should emit engine_state");
}

function testSetValueOfRejectsMalformedJsonWithoutChangingState() {
  var sb = makeMaxSandbox();
  var before;
  var posts;

  sb._clear();
  sb.steps(8);
  sb.channels(2);
  before = sb.getvalueof();
  sb._clear();

  assert.doesNotThrow(function () {
    sb.setvalueof("{");
  }, "malformed setvalueof JSON should not throw");

  assert.strictEqual(sb.getvalueof(), before,
    "malformed setvalueof input should keep the current engine state");
  assert.strictEqual(eventsOn(sb, "engine_state").length, 0,
    "failed setvalueof should not emit engine_state");
  posts = sb._posts().join("");
  assert.ok(posts.indexOf("Could not restore saved state") >= 0,
    "failed setvalueof should post an actionable persistence message");
}

function testSetValueOfAppliesValidPartialState() {
  var sb = makeMaxSandbox();

  sb._clear();
  sb.setvalueof("{\"stepCount\":6,\"channelCount\":2}");

  assert.strictEqual(sb.kshEngine.stepCount, 6);
  assert.strictEqual(sb.kshEngine.channelCount, 2);
  assert.ok(eventsOn(sb, "engine_state").length >= 1,
    "valid partial setvalueof state should emit engine_state");
}

function testEditorActiveEnablesCurrentStepEmission() {
  var sb = makeMaxSandbox();
  sb._clear();
  sb.editor_active(0);
  sb.steps(4);
  sb.channels(1);
  sb.cell(1, 1, 1, 1, 100, 100, 1);
  sb._flush();
  sb._clear();

  // With editorActive=0, transport_position should NOT emit current_step.
  sb.transport_position(0, 1);
  sb._flush();
  assert.strictEqual(eventsOn(sb, "current_step").length, 0,
    "current_step should be suppressed while the editor is closed");

  sb._clear();
  sb.editor_active(1);
  sb.transport_position(0.25, 1);
  sb._flush();
  assert.ok(eventsOn(sb, "current_step").length >= 1,
    "current_step should fire while the editor is active");
}

function testLookaheadSchedulingStillEmitsCurrentStep() {
  var sb = makeMaxSandbox();
  var currentStepEvents;
  sb._clear();
  sb.editor_active(1);
  sb.steps(2);
  sb.channels(1);
  sb.mode("per_channel");
  sb.channel_lock(1, 1);
  sb.rate("16n");
  sb.tempo(120);
  sb.timing_humanize(100);
  sb.cell(1, 1, 1, 1, 100, 100, 1);
  sb.cell(1, 1, 2, 1, 100, 100, 1);
  sb._flush();
  sb._clear();

  sb.transport_position(0, 1);
  sb._clear();
  sb.transport_position(0.12, 1);

  currentStepEvents = eventsOn(sb, "current_step");
  assert.ok(currentStepEvents.some(function (event) {
    return String(event.args[1]) === "2" || event.args[1] === 2;
  }), "lookahead-scheduled step should still emit current_step for editor highlighting");
}

function testDeviceActiveSuppressesTransportOutputAndClearsScheduler() {
  var sb = makeMaxSandbox();
  sb._clear();
  sb.steps(4);
  sb.channels(1);
  sb.cell(1, 1, 1, 1, 100, 100, 1);
  sb._flush();
  sb._clear();

  sb.device_active(0);
  sb.transport_position(0, 1);

  assert.strictEqual(sb._notes().length, 0,
    "inactive device should suppress transport note output");
  assert.ok(eventsOn(sb, "device_active").length >= 1,
    "device_active should emit a UI status selector");
  assert.ok(sb._named().some(function (m) {
    return m.bus === "ksh_scheduler_commands" && m.args[0] === "clear";
  }), "turning the device off should clear pending scheduler output");

  sb._clear();
  sb.device_active(1);
  sb.transport_position(0, 1);

  assert.strictEqual(sb._notes().length, 1,
    "active device should resume transport note output");
}

function testMessnamedFailuresAreSwallowed() {
  var sb = makeMaxSandbox();
  // Replace messnamed with one that throws to simulate a transient Max error
  // during reload. The engine must keep running.
  var thrown = 0;
  sb.messnamed = function () {
    thrown += 1;
    throw new Error("simulated messnamed failure");
  };

  // These all route through safeMessnamed / safeOutlet and must not throw.
  assert.doesNotThrow(function () { sb.steps(4); });
  assert.doesNotThrow(function () { sb.channels(1); });
  assert.doesNotThrow(function () { sb.cell(1, 1, 1, 1, 100, 100, 1); });
  assert.doesNotThrow(function () { sb._flush(); });
  assert.doesNotThrow(function () { sb.transport_position(0, 1); });
  assert.doesNotThrow(function () { sb._flush(); });
  assert.doesNotThrow(function () { sb.reset(); });

  assert.ok(thrown > 0, "the throwing messnamed stub should have been invoked");
}

testMaxWrapperBootsEngineAndExposesHandlers();
testStatusMessagesEmitUiSelectors();
testSyncAllEmitsStateAndPreview();
testRecomposeCommandsFlushPreviewForCompactUi();
testCellMessageWritesToEngineSourceAndCoalescesPreview();
testSourceChannelResetClearsStateAndEmitsFullState();
testChannelAuditionEmitsNoteToOutlet();
testTransportPositionEmitsNativeSchedulerEvent();
testResetClearsNativeScheduler();
testStoppedTransportClearsSchedulerOnceNotPerTick();
testGetValueOfSetValueOfRoundtripsEngineState();
testSetValueOfRejectsMalformedJsonWithoutChangingState();
testSetValueOfAppliesValidPartialState();
testEditorActiveEnablesCurrentStepEmission();
testLookaheadSchedulingStillEmitsCurrentStep();
testDeviceActiveSuppressesTransportOutputAndClearsScheduler();
testMessnamedFailuresAreSwallowed();

console.log("ksh_engine max wrapper tests passed");
