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

function testStackModeMatchesOneSourceAcrossWindow() {
  var engine = makeEngine([0.5]);
  var step;
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 0, 1, 10, "always", 100);
  engine.setCell(0, 0, 1, 0, 10, "always", 100);
  engine.setCell(1, 0, 0, 0, 10, "always", 100);
  engine.setCell(1, 0, 1, 1, 20, "always", 100);
  engine._setRandomValues([0.5]);
  engine.generateWindow(0, 4, true);

  for (step = 0; step < 4; step += 1) {
    assert.strictEqual(engine.generated[0][step].source, 1);
  }
  assert.strictEqual(engine.generated[0][0].enabled, 0);
  assert.strictEqual(engine.generated[0][0].velocity, 10);
  assert.strictEqual(engine.generated[0][1].enabled, 1);
  assert.strictEqual(engine.generated[0][1].velocity, 20);
}

function testStackModeUsesOneSourceForAllLanesOnStep() {
  var engine = makeEngine([0.76]);
  clearAll(engine);
  engine.setChannelCount(2);
  engine.setGenerationMode("stack");
  engine.setCell(3, 0, 0, 1, 111, "always", 100);
  engine.setCell(3, 1, 0, 1, 88, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0.76]);
  engine.transportPosition(0, 1);

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
  engine._setRandomValues([0, 0.76]);
  engine.transportPosition(0, 1);

  assert.strictEqual(engine._notes.length, 2);
  assert.strictEqual(engine._notes[0].source, 1);
  assert.strictEqual(engine._notes[1].source, 4);
}

function testRandomSourceIgnoresEmptySources() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 0, 1, 55, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0.99]);
  engine.transportPosition(0, 1);

  assert.strictEqual(engine._notes.length, 1);
  assert.strictEqual(engine._notes[0].source, 1);
  assert.strictEqual(engine._notes[0].velocity, 55);
}

function testInactiveChannelContentDoesNotMakeSourceActive() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 0, 1, 55, "always", 100);
  engine.setCell(1, 1, 0, 1, 99, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0.99]);
  engine.transportPosition(0, 1);

  assert.strictEqual(engine._notes.length, 1);
  assert.strictEqual(engine._notes[0].source, 1);
  assert.strictEqual(engine._notes[0].velocity, 55);
}

function testRandomSourceUsesOnlyPopulatedSourceWhenOthersEmpty() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("per_channel");
  engine.setCell(2, 0, 0, 1, 66, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0, 0.99]);
  engine.transportPosition(0, 1);

  assert.strictEqual(engine._notes.length, 1);
  assert.strictEqual(engine._notes[0].source, 3);
  assert.strictEqual(engine._notes[0].velocity, 66);
}

function testChannelLockOverridesRandomSource() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setChannelLock(0, 2);
  engine.setCell(2, 0, 0, 1, 101, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0]);
  engine.transportPosition(0, 1);

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

  engine.transportPosition(0, 1);
  engine.transportPosition(0.25, 1);
  engine.transportPosition(0.5, 1);

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

  engine.transportPosition(0, 1);
  engine.transportPosition(0.25, 1);

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

  engine.transportPosition(0, 1);
  engine.transportPosition(0.25, 1);

  assert.strictEqual(engine._notes[0].delayMs, 0);
  assert.strictEqual(engine._notes[1].delayMs, 62.5);
}

function testTransportPositionFiresOnlyWhenLiveStepChanges() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setCell(0, 0, 0, 1, 10, "always", 100);
  engine.setCell(0, 0, 1, 1, 20, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0]);

  engine.transportPosition(0, 1);
  engine.transportPosition(0.1, 1);
  engine.transportPosition(0.249, 1);
  engine.transportPosition(0.25, 1);

  assert.strictEqual(engine._notes.length, 2);
  assert.strictEqual(engine._notes[0].step, 1);
  assert.strictEqual(engine._notes[0].globalStep, 0);
  assert.strictEqual(engine._notes[0].velocity, 10);
  assert.strictEqual(engine._notes[1].step, 2);
  assert.strictEqual(engine._notes[1].globalStep, 1);
  assert.strictEqual(engine._notes[1].velocity, 20);
}

function testTransportPositionAnchorsJumpsToLiveBeat() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setCell(0, 0, 0, 1, 100, "always", 100);
  engine.setCell(0, 0, 1, 1, 80, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0]);

  engine.transportPosition(0, 1);
  engine.transportPosition(1, 1);

  assert.strictEqual(engine._notes.length, 2);
  assert.strictEqual(engine._notes[0].step, 1);
  assert.strictEqual(engine._notes[0].globalStep, 0);
  assert.strictEqual(engine._notes[1].step, 1);
  assert.strictEqual(engine._notes[1].globalStep, 4);
}

function testTransportPositionDoesNotFireWhileStopped() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setCell(0, 0, 0, 1, 100, "always", 100);
  engine._notes.length = 0;
  engine._setRandomValues([0]);

  engine.transportPosition(0, 0);
  engine.transportPosition(0.25, 0);

  assert.strictEqual(engine._notes.length, 0);
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

function testDeserializeRestoresZeroSwing() {
  var restored = makeEngine([0]);

  restored.setSwing(50);
  restored.deserialize({ swing: 0 });

  assert.strictEqual(restored.swing, 0);
}

function testDeserializePreservesMissingChannelKeys() {
  var restored = makeEngine([0]);

  restored.setChannelLabel(0, "");
  restored.setChannelNote(0, 35);
  restored.setChannelLock(0, 2);
  restored.deserialize({
    channels: [
      {}
    ]
  });

  assert.strictEqual(restored.channels[0].label, "");
  assert.strictEqual(restored.channels[0].note, 35);
  assert.strictEqual(restored.channels[0].lock, 2);
}

function testCellEditsReachStepsBeyondSixteen() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(32);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setCell(0, 0, 31, 1, 123, "always", 100);
  engine.setCell(0, 0, 20, 1, 77, "random", 50);

  assert.strictEqual(engine.sources[0][0][31].enabled, 1);
  assert.strictEqual(engine.sources[0][0][31].velocity, 123);
  assert.strictEqual(engine.sources[0][0][20].enabled, 1);
  assert.strictEqual(engine.sources[0][0][20].velocity, 77);
  assert.strictEqual(engine.sources[0][0][20].gateMode, "random");
  assert.strictEqual(engine.sources[0][0][20].random, 50);

  engine.setCellVelocity(0, 0, 28, 64);
  assert.strictEqual(engine.sources[0][0][28].velocity, 64);

  engine.setCellEnabled(0, 0, 24, 1);
  assert.strictEqual(engine.sources[0][0][24].enabled, 1);

  engine.setCellGate(0, 0, 17, "cycle", 4);
  assert.strictEqual(engine.sources[0][0][17].gateMode, "cycle");
  assert.strictEqual(engine.sources[0][0][17].cycle, 4);

  // setCell at the original 16-step boundary (the bug capped step at 15) must
  // not bleed into step 15 anymore.
  assert.strictEqual(engine.sources[0][0][15].enabled, 0);
  assert.strictEqual(engine.sources[0][0][16].enabled, 0);
}

function testCellEditDoesNotReRollGeneratedSources() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 0, 1, 50, "always", 100);
  engine.setCell(2, 0, 0, 1, 90, "always", 100);
  // Seed the generated grid with a known stack roll: rng 0.99 picks the last
  // active source, which is source 2 here.
  engine._setRandomValues([0.99]);
  engine.generateWindow(0, 4, true);

  var step;
  for (step = 0; step < 4; step += 1) {
    assert.strictEqual(engine.generated[0][step].source, 2);
  }

  // An interactive cell edit must not re-roll the visible preview. Even if
  // the next rng value would pick a different source, the existing source
  // assignments must be preserved.
  engine._setRandomValues([0]);
  engine.setCellVelocity(0, 0, 0, 77);
  for (step = 0; step < 4; step += 1) {
    assert.strictEqual(engine.generated[0][step].source, 2);
  }
}

function testCellEditOnlyMutatesGeneratedWhenSourceMatches() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 0, 1, 50, "always", 100);
  engine.setCell(2, 0, 0, 1, 90, "always", 100);
  engine._setRandomValues([0.99]);
  engine.generateWindow(0, 4, true);

  var step;
  for (step = 0; step < 4; step += 1) {
    assert.strictEqual(engine.generated[0][step].source, 2);
  }
  assert.strictEqual(engine.generated[0][0].velocity, 90);

  // Editing the source the generated cell actually came from must propagate.
  engine.setCellVelocity(2, 0, 0, 33);
  assert.strictEqual(engine.generated[0][0].velocity, 33);

  // Editing a different source must NOT touch the generated cell.
  engine.setCellVelocity(0, 0, 0, 7);
  assert.strictEqual(engine.generated[0][0].velocity, 33);
  assert.strictEqual(engine.sources[0][0][0].velocity, 7);

  // Same for enabled.
  engine.setCellEnabled(0, 0, 0, 0);
  assert.strictEqual(engine.generated[0][0].enabled, 1);
  assert.strictEqual(engine.sources[0][0][0].enabled, 0);

  engine.setCellEnabled(2, 0, 0, 0);
  assert.strictEqual(engine.generated[0][0].enabled, 0);
}

function testChannelLockRoutesSourceEditsToGenerated() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(2);
  engine.setChannelCount(1);
  engine.setChannelLock(0, 1);
  engine.setCell(1, 0, 0, 1, 64, "always", 100);
  engine._setRandomValues([0]);
  engine.generateWindow(0, 2, true);
  assert.strictEqual(engine.generated[0][0].source, 1);

  // Edit to the locked source should be reflected immediately.
  engine.setCellVelocity(1, 0, 0, 99);
  assert.strictEqual(engine.generated[0][0].velocity, 99);

  // Edit to a different source must not bleed in via the lock.
  engine.setCellVelocity(2, 0, 0, 5);
  assert.strictEqual(engine.generated[0][0].velocity, 99);
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

function testGenerateWindowScansActiveSourcesOnce() {
  var engine = makeEngine([0, 0.2, 0.4, 0.6]);
  var originalActiveSourceIndices;
  var calls = 0;

  clearAll(engine);
  engine.setStepCount(16);
  engine.setChannelCount(8);
  engine.setGenerationMode("per_channel");
  engine.setCell(0, 0, 0, 1, 80, "always", 100);
  engine.setCell(1, 1, 1, 1, 90, "always", 100);
  engine.setCell(2, 2, 2, 1, 100, "always", 100);
  engine.setCell(3, 3, 3, 1, 110, "always", 100);

  originalActiveSourceIndices = engine.activeSourceIndices;
  engine.activeSourceIndices = function () {
    calls += 1;
    return originalActiveSourceIndices.apply(engine, arguments);
  };

  engine.generateWindow(0, 16, true);

  assert.strictEqual(calls, 1);
}

function testDeserializeDoesNotEmitIntermediateStatuses() {
  var statuses = [];
  var engine = new KickSnareHatEngine({
    rng: function () { return 0; },
    emitStatus: function (message) {
      statuses.push(message);
    }
  });

  engine.deserialize({
    stepCount: 8,
    channelCount: 2,
    refreshSteps: 4,
    generationMode: "per_channel",
    rate: "8n",
    tempo: 100,
    swing: 20,
    midiChannel: 3,
    noteDurationMs: 150,
    channels: [
      { label: "Sub", note: 35, lock: 1 }
    ],
    sources: [
      [
        [
          { enabled: 1, velocity: 64, gateMode: "always", random: 100, cycle: 1 }
        ]
      ]
    ]
  });

  assert.deepStrictEqual(statuses, []);
  assert.strictEqual(engine.stepCount, 8);
  assert.strictEqual(engine.channelCount, 2);
  assert.strictEqual(engine.refreshSteps, 4);
  assert.strictEqual(engine.generationMode, "per_channel");
  assert.strictEqual(engine.rate, "8n");
  assert.strictEqual(engine.tempo, 100);
  assert.strictEqual(engine.swing, 20);
  assert.strictEqual(engine.midiChannel, 3);
  assert.strictEqual(engine.noteDurationMs, 150);
  assert.strictEqual(engine.channels[0].label, "Sub");
  assert.strictEqual(engine.channels[0].note, 35);
  assert.strictEqual(engine.channels[0].lock, 1);
  assert.strictEqual(engine.sources[0][0][0].enabled, 1);
}

testStackModeMatchesOneSourceAcrossWindow();
testStackModeUsesOneSourceForAllLanesOnStep();
testPerChannelModeCanChooseDifferentSources();
testRandomSourceIgnoresEmptySources();
testInactiveChannelContentDoesNotMakeSourceActive();
testRandomSourceUsesOnlyPopulatedSourceWhenOthersEmpty();
testChannelLockOverridesRandomSource();
testCycleGateFiresEveryNthEncounter();
testRandomGateUsesPercentage();
testSwingAddsDelayToEverySecondStep();
testTransportPositionFiresOnlyWhenLiveStepChanges();
testTransportPositionAnchorsJumpsToLiveBeat();
testTransportPositionDoesNotFireWhileStopped();
testDeserializeAcceptsUILaneSchema();
testDeserializeRestoresZeroSwing();
testDeserializePreservesMissingChannelKeys();
testCellEditsReachStepsBeyondSixteen();
testCellEditDoesNotReRollGeneratedSources();
testCellEditOnlyMutatesGeneratedWhenSourceMatches();
testChannelLockRoutesSourceEditsToGenerated();
testSerializeDeserializeRestoresSourceData();
testGenerateWindowScansActiveSourcesOnce();
testDeserializeDoesNotEmitIntermediateStatuses();

console.log("ksh_engine tests passed");
