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
        engine.setCell(source, channel, step, 0, 100, 100, 1);
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
  engine.setCell(0, 0, 0, 1, 10, 100, 1);
  engine.setCell(0, 0, 1, 0, 10, 100, 1);
  engine.setCell(1, 0, 0, 0, 10, 100, 1);
  engine.setCell(1, 0, 1, 1, 20, 100, 1);
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
  engine.setCell(3, 0, 0, 1, 111, 100, 1);
  engine.setCell(3, 1, 0, 1, 88, 100, 1);
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
  engine.setCell(0, 0, 0, 1, 70, 100, 1);
  engine.setCell(3, 1, 0, 1, 90, 100, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0, 0.76]);
  engine.transportPosition(0, 1);

  assert.strictEqual(engine._notes.length, 2);
  assert.strictEqual(engine._notes[0].source, 1);
  assert.strictEqual(engine._notes[1].source, 4);
}

function testStaticModeUsesSelectedSource() {
  var engine = makeEngine([0.99]);
  clearAll(engine);
  engine.setChannelCount(2);
  engine.setGenerationMode("static");
  engine.setStaticSource(2);
  engine.setChannelLock(0, 0);
  engine.setCell(0, 0, 0, 1, 40, 100, 1);
  engine.setCell(2, 0, 0, 1, 70, 100, 1);
  engine.setCell(2, 1, 0, 1, 90, 100, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0.99]);
  engine.transportPosition(0, 1);

  assert.strictEqual(engine._notes.length, 2);
  assert.strictEqual(engine._notes[0].source, 3);
  assert.strictEqual(engine._notes[0].velocity, 70);
  assert.strictEqual(engine._notes[1].source, 3);
  assert.strictEqual(engine._notes[1].velocity, 90);
}

function testRandomSourceIgnoresEmptySources() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 0, 1, 55, 100, 1);
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
  engine.setCell(0, 0, 0, 1, 55, 100, 1);
  engine.setCell(1, 1, 0, 1, 99, 100, 1);
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
  engine.setCell(2, 0, 0, 1, 66, 100, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0, 0.99]);
  engine.transportPosition(0, 1);

  assert.strictEqual(engine._notes.length, 1);
  assert.strictEqual(engine._notes[0].source, 3);
  assert.strictEqual(engine._notes[0].velocity, 66);
}

function testSourceChannelMuteSuppressesGeneratedOutput() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("per_channel");
  engine.setCell(0, 0, 0, 1, 77, 100, 1);
  engine.setSourceChannelMute(0, 0, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0]);
  engine.transportPosition(0, 1);

  assert.strictEqual(engine.generated[0][0].source, 0);
  assert.strictEqual(engine.generated[0][0].enabled, 0);
  assert.strictEqual(engine.generated[0][0].velocity, 100);
  assert.strictEqual(engine._notes.length, 0);
}

function testMutedSourceChannelDoesNotMakeSourceActive() {
  var engine = makeEngine([0.99]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 0, 1, 55, 100, 1);
  engine.setCell(1, 0, 0, 1, 88, 100, 1);
  engine.setSourceChannelMute(1, 0, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0.99]);
  engine.transportPosition(0, 1);

  assert.strictEqual(engine._notes.length, 1);
  assert.strictEqual(engine._notes[0].source, 1);
  assert.strictEqual(engine._notes[0].velocity, 55);
}

function testSourceChannelResetClearsCellsAndMute() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 44, 30, 3);
  engine.setCell(0, 0, 1, 1, 45, 40, 4);
  engine.setSourceChannelMute(0, 0, 1);
  engine.resetSourceChannel(0, 0);

  assert.strictEqual(engine.sourceChannelMutes[0][0], 0);
  assert.strictEqual(engine.sources[0][0][0].enabled, 0);
  assert.strictEqual(engine.sources[0][0][0].velocity, 100);
  assert.strictEqual(engine.sources[0][0][0].probability, 100);
  assert.strictEqual(engine.sources[0][0][0].cycle, 1);
  assert.strictEqual(engine.sources[0][0][1].enabled, 0);
}

function testChannelLockOverridesRandomSource() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setChannelLock(0, 2);
  engine.setCell(2, 0, 0, 1, 101, 100, 1);
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
  engine.setCell(0, 0, 0, 1, 100, 100, 2);
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
  engine.setCell(0, 0, 0, 1, 100, 50, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0, 0.10, 0, 0.90]);

  engine.transportPosition(0, 1);
  engine.transportPosition(0.25, 1);

  assert.strictEqual(engine._notes.length, 1);
}

function testProbabilityAndCycleApplyTogether() {
  var engine = makeEngine([0.90, 0.10]);
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 100, 50, 2);
  engine._notes.length = 0;
  engine._setRandomValues([0.90, 0.10]);

  engine.transportPosition(0, 1);
  engine.transportPosition(0.25, 1);
  engine.transportPosition(0.5, 1);
  engine.transportPosition(0.75, 1);

  assert.strictEqual(engine._notes.length, 1);
}

function testCycleIsEvaluatedBeforeProbability() {
  var randomCalls = 0;
  var engine = new KickSnareHatEngine({
    rng: function () {
      randomCalls += 1;
      return 0;
    }
  });
  engine._notes = [];

  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setGenerationMode("per_channel");
  engine.setChannelLock(0, 0);
  engine.setCell(0, 0, 0, 1, 100, 50, 2);
  randomCalls = 0;

  engine.transportPosition(0, 1);
  engine.transportPosition(0.25, 1);

  assert.strictEqual(randomCalls, 1);
}

function testDefaultGateValuesBehaveLikeAlways() {
  var engine = new KickSnareHatEngine({
    rng: function () {
      throw new Error("probability RNG should not run for 100%");
    },
    emitNote: function (note) {
      engine._notes.push(note);
    }
  });
  engine._notes = [];

  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setGenerationMode("per_channel");
  engine.setChannelLock(0, 0);
  engine.setCell(0, 0, 0, 1, 100, 100, 1);

  engine.transportPosition(0, 1);

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
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine.setCell(0, 0, 1, 1, 100, 100, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0]);

  engine.transportPosition(0, 1);
  engine.transportPosition(0.25, 1);

  assert.strictEqual(engine._notes[0].delayMs, 0);
  assert.strictEqual(engine._notes[1].delayMs, 62.5);
}

function testVelocityHumanizeOffsetsEachHitBidirectionally() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(2);
  engine.setChannelCount(1);
  engine.setGenerationMode("per_channel");
  engine.setChannelLock(0, 0);
  engine.setVelocityHumanize(20);
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine.setCell(0, 0, 1, 1, 100, 100, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0, 1]);

  engine.transportPosition(0, 1);
  engine.transportPosition(0.25, 1);

  assert.strictEqual(engine._notes[0].velocity, 80);
  assert.strictEqual(engine._notes[1].velocity, 120);
}

function testVelocityHumanizeClampsToMidiVelocityRange() {
  var engine = makeEngine([1]);
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setGenerationMode("per_channel");
  engine.setChannelLock(0, 0);
  engine.setVelocityHumanize(100);
  engine.setCell(0, 0, 0, 1, 120, 100, 1);
  engine._notes.length = 0;
  engine._setRandomValues([1]);

  engine.transportPosition(0, 1);

  assert.strictEqual(engine._notes[0].velocity, 127);
}

function testTimingHumanizeCanScheduleNextStepEarlyWithLookahead() {
  var engine = makeEngine([0.5, 0]);
  clearAll(engine);
  engine.setStepCount(2);
  engine.setChannelCount(1);
  engine.setGenerationMode("per_channel");
  engine.setChannelLock(0, 0);
  engine.setRate("16n");
  engine.setTempo(120);
  engine.setTimingHumanize(100);
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine.setCell(0, 0, 1, 1, 100, 100, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0.5, 0]);

  engine.transportPosition(0, 1);
  engine.transportPosition(0.12, 1);

  assert.strictEqual(engine._notes.length, 2);
  assert.strictEqual(engine._notes[1].step, 2);
  assert.strictEqual(engine._notes[1].globalStep, 1);
  assert.ok(Math.abs(engine._notes[1].delayMs - 2.5) < 0.000001);
}

function testTimingHumanizeCurrentStepCannotScheduleIntoThePast() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setGenerationMode("per_channel");
  engine.setChannelLock(0, 0);
  engine.setRate("16n");
  engine.setTempo(120);
  engine.setTimingHumanize(100);
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0]);

  engine.transportPosition(0, 1);

  assert.strictEqual(engine._notes[0].delayMs, 0);
}

function testTransportPositionFiresOnlyWhenLiveStepChanges() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setCell(0, 0, 0, 1, 10, 100, 1);
  engine.setCell(0, 0, 1, 1, 20, 100, 1);
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
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine.setCell(0, 0, 1, 1, 80, 100, 1);
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
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0]);

  engine.transportPosition(0, 0);
  engine.transportPosition(0.25, 0);

  assert.strictEqual(engine._notes.length, 0);
}

function testDeviceInactiveSuppressesTransportAndAudition() {
  var engine = makeEngine([0]);
  var restored = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0]);

  engine.setDeviceActive(0);
  engine.transportPosition(0, 1);
  engine.auditionChannel(0);

  assert.strictEqual(engine._notes.length, 0);
  assert.strictEqual(engine.playingStepOneBased, 0);

  engine.setDeviceActive(1);
  engine.transportPosition(0, 1);

  assert.strictEqual(engine._notes.length, 1);

  restored.deserialize({ deviceActive: false });
  assert.strictEqual(restored.deviceActive, false);
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
  engine.setCell(1, 0, 2, 1, 77, 25, 1);

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
  assert.strictEqual(restored.sources[1][0][2].probability, 25);
  assert.strictEqual(restored.sources[1][0][2].cycle, 1);
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
  engine.setCell(0, 0, 31, 1, 123, 100, 1);
  engine.setCell(0, 0, 20, 1, 77, 50, 1);

  assert.strictEqual(engine.sources[0][0][31].enabled, 1);
  assert.strictEqual(engine.sources[0][0][31].velocity, 123);
  assert.strictEqual(engine.sources[0][0][20].enabled, 1);
  assert.strictEqual(engine.sources[0][0][20].velocity, 77);
  assert.strictEqual(engine.sources[0][0][20].probability, 50);
  assert.strictEqual(engine.sources[0][0][20].cycle, 1);

  engine.setCellVelocity(0, 0, 28, 64);
  assert.strictEqual(engine.sources[0][0][28].velocity, 64);

  engine.setCellEnabled(0, 0, 24, 1);
  assert.strictEqual(engine.sources[0][0][24].enabled, 1);

  engine.setCellCycle(0, 0, 17, 4);
  assert.strictEqual(engine.sources[0][0][17].probability, 100);
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
  engine.setCell(0, 0, 0, 1, 50, 100, 1);
  engine.setCell(2, 0, 0, 1, 90, 100, 1);
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
  engine.setCell(0, 0, 0, 1, 50, 100, 1);
  engine.setCell(2, 0, 0, 1, 90, 100, 1);
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
  engine.setCell(1, 0, 0, 1, 64, 100, 1);
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
  engine.setDeviceActive(0);
  engine.setVelocityHumanize(12);
  engine.setTimingHumanize(8);
  engine.setGenerationMode("static");
  engine.setStaticSource(2);
  engine.setCell(1, 0, 2, 1, 77, 25, 1);
  engine.setSourceChannelMute(1, 0, 1);
  state = engine.serialize();

  restored.deserialize(JSON.parse(JSON.stringify(state)));

  assert.strictEqual(restored.stepCount, 7);
  assert.strictEqual(restored.channelCount, 4);
  assert.strictEqual(restored.channels[0].label, "Sub");
  assert.strictEqual(restored.channels[0].note, 35);
  assert.strictEqual(restored.channels[0].lock, 1);
  assert.strictEqual(restored.deviceActive, false);
  assert.strictEqual(restored.velocityHumanize, 12);
  assert.strictEqual(restored.timingHumanize, 8);
  assert.strictEqual(restored.generationMode, "static");
  assert.strictEqual(restored.staticSource, 2);
  assert.strictEqual(restored.sources[1][0][2].enabled, 1);
  assert.strictEqual(restored.sources[1][0][2].velocity, 77);
  assert.strictEqual(restored.sources[1][0][2].probability, 25);
  assert.strictEqual(restored.sources[1][0][2].cycle, 1);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(state.sources[1][0][2], "gateMode"), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(state.sources[1][0][2], "random"), false);
  assert.strictEqual(restored.sourceChannelMutes[1][0], 1);
}

function testGenerateWindowScansActiveSourcesOnce() {
  var engine = makeEngine([0, 0.2, 0.4, 0.6]);
  var originalActiveSourceIndices;
  var calls = 0;

  clearAll(engine);
  engine.setStepCount(16);
  engine.setChannelCount(8);
  engine.setGenerationMode("per_channel");
  engine.setCell(0, 0, 0, 1, 80, 100, 1);
  engine.setCell(1, 1, 1, 1, 90, 100, 1);
  engine.setCell(2, 2, 2, 1, 100, 100, 1);
  engine.setCell(3, 3, 3, 1, 110, 100, 1);

  originalActiveSourceIndices = engine.activeSourceIndices;
  engine.activeSourceIndices = function () {
    calls += 1;
    return originalActiveSourceIndices.apply(engine, arguments);
  };

  engine.generateWindow(0, 16, true);

  assert.strictEqual(calls, 1);
}

function testChannelAuditionEmitsConfiguredNote() {
  var engine = makeEngine([]);
  var note;

  clearAll(engine);
  engine.setChannelCount(3);
  engine.setChannelNote(1, 42);
  engine._notes.length = 0;

  note = engine.auditionChannel(1);

  assert.strictEqual(engine._notes.length, 1);
  assert.strictEqual(engine._notes[0], note);
  assert.strictEqual(note.pitch, 42);
  assert.strictEqual(note.velocity, 100);
  assert.strictEqual(note.channel, 1);
  assert.strictEqual(note.durationMs, 100);
  assert.strictEqual(note.delayMs, 0);
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
    velocityHumanize: 12,
    timingHumanize: 8,
    channels: [
      { label: "Sub", note: 35, lock: 1 }
    ],
    sources: [
      [
        [
          { enabled: 1, velocity: 64, probability: 100, cycle: 1 }
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
  assert.strictEqual(engine.velocityHumanize, 12);
  assert.strictEqual(engine.timingHumanize, 8);
  assert.strictEqual(engine.channels[0].label, "Sub");
  assert.strictEqual(engine.channels[0].note, 35);
  assert.strictEqual(engine.channels[0].lock, 1);
  assert.strictEqual(engine.sources[0][0][0].enabled, 1);
  assert.strictEqual(engine.sources[0][0][0].probability, 100);
  assert.strictEqual(engine.sources[0][0][0].cycle, 1);
}

testStackModeMatchesOneSourceAcrossWindow();
testStackModeUsesOneSourceForAllLanesOnStep();
testPerChannelModeCanChooseDifferentSources();
testStaticModeUsesSelectedSource();
testRandomSourceIgnoresEmptySources();
testInactiveChannelContentDoesNotMakeSourceActive();
testRandomSourceUsesOnlyPopulatedSourceWhenOthersEmpty();
testSourceChannelMuteSuppressesGeneratedOutput();
testMutedSourceChannelDoesNotMakeSourceActive();
testSourceChannelResetClearsCellsAndMute();
testChannelLockOverridesRandomSource();
testCycleGateFiresEveryNthEncounter();
testRandomGateUsesPercentage();
testProbabilityAndCycleApplyTogether();
testCycleIsEvaluatedBeforeProbability();
testDefaultGateValuesBehaveLikeAlways();
testSwingAddsDelayToEverySecondStep();
testVelocityHumanizeOffsetsEachHitBidirectionally();
testVelocityHumanizeClampsToMidiVelocityRange();
testTimingHumanizeCanScheduleNextStepEarlyWithLookahead();
testTimingHumanizeCurrentStepCannotScheduleIntoThePast();
testTransportPositionFiresOnlyWhenLiveStepChanges();
testTransportPositionAnchorsJumpsToLiveBeat();
testTransportPositionDoesNotFireWhileStopped();
testDeviceInactiveSuppressesTransportAndAudition();
testDeserializeAcceptsUILaneSchema();
testDeserializeRestoresZeroSwing();
testDeserializePreservesMissingChannelKeys();
testCellEditsReachStepsBeyondSixteen();
testCellEditDoesNotReRollGeneratedSources();
testCellEditOnlyMutatesGeneratedWhenSourceMatches();
testChannelLockRoutesSourceEditsToGenerated();
testSerializeDeserializeRestoresSourceData();
testGenerateWindowScansActiveSourcesOnce();
testChannelAuditionEmitsConfiguredNote();
testDeserializeDoesNotEmitIntermediateStatuses();

console.log("ksh_engine tests passed");
