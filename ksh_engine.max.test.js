// Drives the Max-only wrapper block at the bottom of ksh_engine.js inside a
// vm sandbox so we can verify outlet plumbing, Task scheduling for note-off,
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
    // Run all pending tasks in scheduled order, including any tasks scheduled
    // while flushing (e.g. note-off tasks).
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
  };
  sandbox._scheduledCount = function () { return scheduled.length; };

  vm.createContext(sandbox);
  var src = fs.readFileSync(path.join(__dirname, "ksh_engine.js"), "utf8");
  vm.runInContext(src, sandbox, { filename: "ksh_engine.js" });
  return sandbox;
}

function eventsOn(sb, eventName) {
  return sb._named().filter(function (m) {
    return m.bus === "ksh_engine_events" && m.args[0] === eventName;
  });
}

function testMaxWrapperBootsEngineAndExposesHandlers() {
  var sb = makeMaxSandbox();
  assert.ok(sb.kshEngine, "kshEngine should be constructed by the Max wrapper");
  assert.strictEqual(typeof sb.cell, "function");
  assert.strictEqual(typeof sb.transport_position, "function");
  assert.strictEqual(typeof sb.reset, "function");
  assert.strictEqual(typeof sb.getvalueof, "function");
  assert.strictEqual(typeof sb.setvalueof, "function");
  assert.strictEqual(typeof sb.editor_active, "function");
}

function testCellMessageWritesToEngineSourceAndCoalescesPreview() {
  var sb = makeMaxSandbox();
  sb.editor_active(1);
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

  sb.cell(2, 1, 5, 1, 88, "always", 100);
  sb.cell(2, 1, 5, 1, 99, "always", 100);
  sb.cell(2, 1, 5, 1, 110, "always", 100);

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
}

function testTransportPositionFiresNoteOnAndScheduledNoteOff() {
  var sb = makeMaxSandbox();
  sb._clear();
  sb.steps(4);
  sb.channels(1);
  sb.rate("16n");
  sb.tempo(120);
  sb.cell(1, 1, 1, 1, 90, "always", 100);
  sb._flush();
  sb._clear();

  sb.transport_position(0, 1);

  // Note-on and note-off are both scheduled via Task; nothing should have
  // hit outlet() yet.
  assert.strictEqual(sb._notes().length, 0, "outlet should be deferred via Task");
  assert.ok(sb._scheduledCount() >= 2, "note-on + note-off should both be scheduled");

  sb._flush();

  var emitted = sb._notes();
  assert.strictEqual(emitted.length, 2, "should emit one note-on and one note-off");
  // safeOutlet(0, pitch, velocity, channel)
  assert.strictEqual(emitted[0].outlet, 0);
  assert.strictEqual(emitted[0].args[1], 90, "note-on velocity should match cell");
  assert.strictEqual(emitted[1].outlet, 0);
  assert.strictEqual(emitted[1].args[1], 0, "note-off velocity should be 0");
  assert.strictEqual(emitted[0].args[0], emitted[1].args[0],
    "note-on and note-off should share the same pitch");
}

function testResetCancelsPendingNoteTasks() {
  var sb = makeMaxSandbox();
  sb._clear();
  sb.steps(4);
  sb.channels(1);
  sb.cell(1, 1, 1, 1, 100, "always", 100);
  sb._flush();
  sb._clear();

  // Schedule a note but don't flush — the note-on and note-off Tasks should
  // both be pending. reset() must cancel them so we don't get stuck notes
  // when transport restarts.
  sb.transport_position(0, 1);
  var beforeReset = sb._scheduledCount();
  assert.ok(beforeReset >= 2, "expected pending note-on/off Tasks before reset");

  sb.reset();
  sb._flush();

  // Cancelled Tasks should not have emitted note output.
  var emittedAfterReset = sb._notes();
  assert.strictEqual(emittedAfterReset.length, 0,
    "reset should cancel pending note Tasks so they emit nothing on flush");
}

function testGetValueOfSetValueOfRoundtripsEngineState() {
  var sb = makeMaxSandbox();
  sb._clear();
  sb.steps(8);
  sb.channels(2);
  sb.swing(40);
  sb.midi_channel(7);
  sb.duration_ms(250);
  sb.cell(1, 1, 1, 1, 64, "random", 30);
  sb.channel_label(1, "Sub");
  sb.channel_note(2, 50);
  sb._flush();

  var serialized = sb.getvalueof();
  assert.strictEqual(typeof serialized, "string");
  var parsed = JSON.parse(serialized);
  assert.strictEqual(parsed.stepCount, 8);
  assert.strictEqual(parsed.channelCount, 2);
  assert.strictEqual(parsed.swing, 40);
  assert.strictEqual(parsed.midiChannel, 7);
  assert.strictEqual(parsed.noteDurationMs, 250);
  assert.strictEqual(parsed.channels[0].label, "Sub");
  assert.strictEqual(parsed.channels[1].note, 50);

  // Roundtrip into a fresh sandbox to prove the wire format is reloadable.
  var sb2 = makeMaxSandbox();
  sb2._clear();
  sb2.setvalueof(serialized);
  sb2._flush();
  assert.strictEqual(sb2.kshEngine.stepCount, 8);
  assert.strictEqual(sb2.kshEngine.channelCount, 2);
  assert.strictEqual(sb2.kshEngine.swing, 40);
  assert.strictEqual(sb2.kshEngine.midiChannel, 7);
  assert.strictEqual(sb2.kshEngine.noteDurationMs, 250);
  assert.strictEqual(sb2.kshEngine.channels[0].label, "Sub");
  assert.strictEqual(sb2.kshEngine.channels[1].note, 50);
  assert.strictEqual(sb2.kshEngine.sources[0][0][0].enabled, 1);
  assert.strictEqual(sb2.kshEngine.sources[0][0][0].gateMode, "random");
  assert.strictEqual(sb2.kshEngine.sources[0][0][0].random, 30);

  // setvalueof should emit an engine_state event so the UIs resync.
  var engineStateEvents = eventsOn(sb2, "engine_state");
  assert.ok(engineStateEvents.length >= 1, "setvalueof should emit engine_state");
}

function testEditorActiveEnablesCurrentStepEmission() {
  var sb = makeMaxSandbox();
  sb._clear();
  sb.editor_active(0);
  sb.steps(4);
  sb.channels(1);
  sb.cell(1, 1, 1, 1, 100, "always", 100);
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
  assert.doesNotThrow(function () { sb.cell(1, 1, 1, 1, 100, "always", 100); });
  assert.doesNotThrow(function () { sb._flush(); });
  assert.doesNotThrow(function () { sb.transport_position(0, 1); });
  assert.doesNotThrow(function () { sb._flush(); });
  assert.doesNotThrow(function () { sb.reset(); });

  assert.ok(thrown > 0, "the throwing messnamed stub should have been invoked");
}

testMaxWrapperBootsEngineAndExposesHandlers();
testCellMessageWritesToEngineSourceAndCoalescesPreview();
testTransportPositionFiresNoteOnAndScheduledNoteOff();
testResetCancelsPendingNoteTasks();
testGetValueOfSetValueOfRoundtripsEngineState();
testEditorActiveEnablesCurrentStepEmission();
testMessnamedFailuresAreSwallowed();

console.log("ksh_engine max wrapper tests passed");
