var assert = require("assert");
var KickSnareHatEngine = require("./ksh_engine");

function makeEngine(randomValues) {
  var notes = [];
  var index = 0;
  var engine = new KickSnareHatEngine({
    rng: function () {
      var value = randomValues[index % randomValues.length];
      index += 1;
      return value;
    },
    emitNote: function (note) {
      notes.push(note);
    }
  });

  engine._notes = notes;
  engine._setRandomValues = function (values) {
    randomValues = values;
    index = 0;
  };
  return engine;
}

function clearAll(engine) {
  var source;
  var channel;
  var step;

  for (source = 0; source < 4; source += 1) {
    for (channel = 0; channel < 8; channel += 1) {
      for (step = 0; step < 32; step += 1) {
        engine.setCell(source, channel, step, 0, 100, "always", 100);
      }
    }
  }
  engine._notes.length = 0;
  engine.reset();
}

function testStackModeUsesOneSourcePerStep() {
  var engine = makeEngine([0.76]);
  clearAll(engine);
  engine.setChannelCount(2);
  engine.setGenerationMode("stack");
  engine.setCell(3, 0, 0, 1, 111, "always", 100);
  engine.setCell(3, 1, 0, 1, 88, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0.76]);
  engine.step();

  assert.strictEqual(engine._notes.length, 2);
  assert.strictEqual(engine._notes[0].source, 4);
  assert.strictEqual(engine._notes[1].source, 4);
  assert.strictEqual(engine._notes[0].velocity, 111);
  assert.strictEqual(engine._notes[1].velocity, 88);
}

function testPerChannelModeCanChooseDifferentSources() {
  var engine = makeEngine([0, 0.26, 0.51, 0.76, 0.01, 0.76]);
  clearAll(engine);
  engine.setChannelCount(2);
  engine.setGenerationMode("per_channel");
  engine.setCell(0, 0, 0, 1, 70, "always", 100);
  engine.setCell(3, 1, 0, 1, 90, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0, 0.01, 0.76]);
  engine.step();

  assert.strictEqual(engine._notes.length, 2);
  assert.strictEqual(engine._notes[0].source, 1);
  assert.strictEqual(engine._notes[1].source, 4);
}

function testChannelLockOverridesRandomSource() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setChannelLock(0, 2);
  engine.setCell(2, 0, 0, 1, 101, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0]);
  engine.step();

  assert.strictEqual(engine._notes.length, 1);
  assert.strictEqual(engine._notes[0].source, 3);
  assert.strictEqual(engine._notes[0].velocity, 101);
}

function testCycleGateFiresEveryNthEncounter() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 100, "cycle", 2);
  engine._notes.length = 0;
  engine._setRandomValues([0]);

  engine.step();
  engine.step();
  engine.step();

  assert.strictEqual(engine._notes.length, 2);
}

function testRandomGateUsesPercentage() {
  var engine = makeEngine([0, 0.10, 0, 0.90]);
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 100, "random", 50);
  engine._notes.length = 0;
  engine._setRandomValues([0, 0.10, 0, 0.90]);

  engine.step();
  engine.step();

  assert.strictEqual(engine._notes.length, 1);
}

function testSwingAddsDelayToEverySecondStep() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(2);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setTempo(120);
  engine.setSwing(100);
  engine.setCell(0, 0, 0, 1, 100, "always", 100);
  engine.setCell(0, 0, 1, 1, 100, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0]);

  engine.step();
  engine.step();

  assert.strictEqual(engine._notes[0].delayMs, 0);
  assert.strictEqual(engine._notes[1].delayMs, 62.5);
}

function testDeserializeAcceptsUILaneSchema() {
  var engine = makeEngine([0]);
  var restored = makeEngine([0]);
  var uiState;

  clearAll(engine);
  clearAll(restored);
  engine.setChannelCount(4);
  engine.setChannelLabel(0, "Sub");
  engine.setChannelNote(0, 35);
  engine.setChannelLock(0, 1);
  engine.setCell(1, 0, 2, 1, 77, "random", 25);

  uiState = JSON.parse(JSON.stringify(engine.serialize()));
  uiState.laneCount = uiState.channelCount;
  uiState.lanes = uiState.channels;
  delete uiState.channelCount;
  delete uiState.channels;

  restored.deserialize(uiState);

  assert.strictEqual(restored.channelCount, 4);
  assert.strictEqual(restored.channels[0].label, "Sub");
  assert.strictEqual(restored.channels[0].note, 35);
  assert.strictEqual(restored.channels[0].lock, 1);
  assert.strictEqual(restored.sources[1][0][2].enabled, 1);
  assert.strictEqual(restored.sources[1][0][2].velocity, 77);
  assert.strictEqual(restored.sources[1][0][2].gateMode, "random");
  assert.strictEqual(restored.sources[1][0][2].random, 25);
}

function testSerializeDeserializeRestoresSourceData() {
  var engine = makeEngine([0]);
  var restored = makeEngine([0]);
  var state;

  clearAll(engine);
  clearAll(restored);
  engine.setStepCount(7);
  engine.setChannelCount(4);
  engine.setChannelLabel(0, "Sub");
  engine.setChannelNote(0, 35);
  engine.setChannelLock(0, 1);
  engine.setCell(1, 0, 2, 1, 77, "random", 25);
  state = engine.serialize();

  restored.deserialize(JSON.parse(JSON.stringify(state)));

  assert.strictEqual(restored.stepCount, 7);
  assert.strictEqual(restored.channelCount, 4);
  assert.strictEqual(restored.channels[0].label, "Sub");
  assert.strictEqual(restored.channels[0].note, 35);
  assert.strictEqual(restored.channels[0].lock, 1);
  assert.strictEqual(restored.sources[1][0][2].enabled, 1);
  assert.strictEqual(restored.sources[1][0][2].velocity, 77);
  assert.strictEqual(restored.sources[1][0][2].gateMode, "random");
  assert.strictEqual(restored.sources[1][0][2].random, 25);
}

testStackModeUsesOneSourcePerStep();
testPerChannelModeCanChooseDifferentSources();
testChannelLockOverridesRandomSource();
testCycleGateFiresEveryNthEncounter();
testRandomGateUsesPercentage();
testSwingAddsDelayToEverySecondStep();
testDeserializeAcceptsUILaneSchema();
testSerializeDeserializeRestoresSourceData();

console.log("ksh_engine tests passed");
