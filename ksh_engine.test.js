var assert = require("assert");
var KickSnareHatEngine = require("./ksh_engine");

function nativeHitRow(note, velocity, duration, midiCh, delayMs, uiChannel, generatedStep, source, sourceStep) {
  return [note, velocity, duration, midiCh, delayMs, uiChannel, generatedStep, source, sourceStep];
}

function makeEngine(randomValues) {
  var notes = [];
  var statuses = [];
  var index = 0;
  var engine = new KickSnareHatEngine({
    rng: function () {
      var value = randomValues[index % randomValues.length];
      index += 1;
      return value;
    },
    emitNote: function (note) {
      notes.push(note);
    },
    emitStatus: function (message) {
      statuses.push(String(message));
    }
  });

  engine._notes = notes;
  engine._statuses = statuses;
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
  if (engine._statuses) {
    engine._statuses.length = 0;
  }
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
  engine._setRandomValues([0.76]);
  engine.generateWindow(0, engine.stepCount, true);

  assert.strictEqual(engine.generated[0][0].source, 3);
  assert.strictEqual(engine.generated[1][0].source, 3);
  assert.strictEqual(engine.generated[0][0].velocity, 111);
  assert.strictEqual(engine.generated[1][0].velocity, 88);
}

function testPerChannelModeCanChooseDifferentSources() {
  var engine = makeEngine([0, 0.26, 0.51, 0.76, 0.01, 0.76]);
  clearAll(engine);
  engine.setChannelCount(2);
  engine.setGenerationMode("per_channel");
  engine.setCell(0, 0, 0, 1, 70, 100, 1);
  engine.setCell(3, 1, 0, 1, 90, 100, 1);
  engine._setRandomValues([0, 0.76]);
  engine.generateWindow(0, engine.stepCount, true);

  assert.strictEqual(engine.generated[0][0].source, 0);
  assert.strictEqual(engine.generated[1][0].source, 3);
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
  engine.generateWindow(0, engine.stepCount, true);

  assert.strictEqual(engine.generated[0][0].source, 2);
  assert.strictEqual(engine.generated[0][0].velocity, 70);
  assert.strictEqual(engine.generated[1][0].source, 2);
  assert.strictEqual(engine.generated[1][0].velocity, 90);
}

function testRandomSourceIgnoresEmptySources() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 0, 1, 55, 100, 1);
  engine._setRandomValues([0.99]);
  engine.generateWindow(0, engine.stepCount, true);

  assert.strictEqual(engine.generated[0][0].source, 0);
  assert.strictEqual(engine.generated[0][0].velocity, 55);
}

function testInactiveChannelContentDoesNotMakeSourceActive() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 0, 1, 55, 100, 1);
  engine.setCell(1, 1, 0, 1, 99, 100, 1);
  engine._setRandomValues([0.99]);
  engine.generateWindow(0, engine.stepCount, true);

  assert.strictEqual(engine.generated[0][0].source, 0);
  assert.strictEqual(engine.generated[0][0].velocity, 55);
}

function testRandomSourceUsesOnlyPopulatedSourceWhenOthersEmpty() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("per_channel");
  engine.setCell(2, 0, 0, 1, 66, 100, 1);
  engine._setRandomValues([0, 0.99]);
  engine.generateWindow(0, engine.stepCount, true);

  assert.strictEqual(engine.generated[0][0].source, 2);
  assert.strictEqual(engine.generated[0][0].velocity, 66);
}

function testSourceChannelMuteSuppressesGeneratedOutput() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("per_channel");
  engine.setCell(0, 0, 0, 1, 77, 100, 1);
  engine.setSourceChannelMute(0, 0, 1);
  engine._setRandomValues([0]);
  engine.generateWindow(0, engine.stepCount, true);

  assert.strictEqual(engine.generated[0][0].source, 0);
  assert.strictEqual(engine.generated[0][0].enabled, 0);
  assert.strictEqual(engine.generated[0][0].velocity, 100);
}

function testMutedSourceChannelDoesNotMakeSourceActive() {
  var engine = makeEngine([0.99]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 0, 1, 55, 100, 1);
  engine.setCell(1, 0, 0, 1, 88, 100, 1);
  engine.setSourceChannelMute(1, 0, 1);
  engine._setRandomValues([0.99]);
  engine.generateWindow(0, engine.stepCount, true);

  assert.strictEqual(engine.generated[0][0].source, 0);
  assert.strictEqual(engine.generated[0][0].velocity, 55);
}

function testSourceChannelResetClearsCellsAndMute() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(8);
  engine.setChannelCount(1);
  engine.setChannelLoopLength(0, 3);
  engine.setCell(0, 0, 0, 1, 44, 30, 3);
  engine.setCell(0, 0, 1, 1, 45, 40, 4);
  engine.setSourceChannelMute(0, 0, 1);
  engine.resetSourceChannel(0, 0);

  assert.strictEqual(engine.sourceChannelMutes[0][0], 0);
  assert.strictEqual(engine.channels[0].loopLength, 8);
  assert.strictEqual(engine.sources[0][0][0].enabled, 0);
  assert.strictEqual(engine.sources[0][0][0].velocity, 100);
  assert.strictEqual(engine.sources[0][0][0].probability, 100);
  assert.strictEqual(engine.sources[0][0][0].cycle, 1);
  assert.strictEqual(engine.sources[0][0][1].enabled, 0);
}

function testChannelLoopLengthWrapsSourceStepLookup() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(8);
  engine.setChannelCount(1);
  engine.setGenerationMode("static");
  engine.setStaticSource(0);
  engine.setChannelLoopLength(0, 3);
  engine.setCell(0, 0, 0, 1, 10, 100, 1);
  engine.setCell(0, 0, 1, 1, 20, 100, 1);
  engine.setCell(0, 0, 2, 1, 30, 100, 1);
  engine.setCell(0, 0, 3, 1, 99, 100, 1);
  engine.generateWindow(0, 8, true);

  assert.strictEqual(engine.generated[0][0].velocity, 10);
  assert.strictEqual(engine.generated[0][1].velocity, 20);
  assert.strictEqual(engine.generated[0][2].velocity, 30);
  assert.strictEqual(engine.generated[0][3].velocity, 10);
  assert.strictEqual(engine.generated[0][4].velocity, 20);
  assert.strictEqual(engine.generated[0][5].velocity, 30);
  assert.strictEqual(engine.generated[0][6].velocity, 10);
  assert.strictEqual(engine.generated[0][7].velocity, 20);
}

function testChannelLoopLengthRefreshesAllWrappedGeneratedCells() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(8);
  engine.setChannelCount(1);
  engine.setGenerationMode("static");
  engine.setStaticSource(0);
  engine.setChannelLoopLength(0, 3);
  engine.setCell(0, 0, 0, 1, 10, 100, 1);
  engine.setCell(0, 0, 1, 1, 20, 100, 1);
  engine.setCell(0, 0, 2, 1, 30, 100, 1);
  engine.generateWindow(0, 8, true);

  engine.setCellVelocity(0, 0, 0, 88);

  assert.strictEqual(engine.generated[0][0].velocity, 88);
  assert.strictEqual(engine.generated[0][3].velocity, 88);
  assert.strictEqual(engine.generated[0][6].velocity, 88);
  assert.strictEqual(engine.generated[0][1].velocity, 20);

  engine.setCellVelocity(0, 0, 5, 44);
  assert.strictEqual(engine.generated[0][5].velocity, 30);
}

function testChannelLoopLengthClampsToStepCount() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(16);
  engine.setChannelLoopLength(0, 12);
  engine.setStepCount(8);

  assert.strictEqual(engine.channels[0].loopLength, 8);

  engine.setStepCount(16);
  assert.strictEqual(engine.channels[0].loopLength, 8);
}

function testTrailingCellsDoNotMakeSourceActive() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(8);
  engine.setChannelCount(1);
  engine.setChannelLoopLength(0, 3);
  engine.setCell(0, 0, 5, 1, 99, 100, 1);

  assert.deepStrictEqual(engine.activeSourceIndices(), []);
}

function testChannelLockOverridesRandomSource() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setGenerationMode("stack");
  engine.setChannelLock(0, 2);
  engine.setCell(2, 0, 0, 1, 101, 100, 1);
  engine._setRandomValues([0]);
  engine.generateWindow(0, engine.stepCount, true);

  assert.strictEqual(engine.generated[0][0].source, 2);
  assert.strictEqual(engine.generated[0][0].velocity, 101);
}

function testNativePlaybackRowsIncludeDeterministicHitsAndSwing() {
  var engine = makeEngine([0]);
  var rows;
  clearAll(engine);
  engine.setStepCount(2);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setTempo(120);
  engine.setSwing(100);
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine.setCell(0, 0, 1, 1, 80, 100, 1);

  rows = engine.buildNativePlaybackRows();

  assert.deepStrictEqual(rows[0], nativeHitRow(36, 100, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[1], nativeHitRow(36, 80, 100, 1, 62.5, 1, 2, 1, 2));
}

function testNativePlaybackRowsExpandRollsInsideStep() {
  var engine = makeEngine([0]);
  var rows;

  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setTempo(120);
  engine.setCell(0, 0, 0, 1, 100, 100, 1, 0, 0, 4);

  rows = engine.buildNativePlaybackRows();

  assert.deepStrictEqual(rows[0], nativeHitRow(36, 100, 28, 1, 0, 1, 1, 1, 1).concat(
    nativeHitRow(36, 100, 28, 1, 31.25, 1, 1, 1, 1),
    nativeHitRow(36, 100, 28, 1, 62.5, 1, 1, 1, 1),
    nativeHitRow(36, 100, 28, 1, 93.75, 1, 1, 1, 1)
  ));
}

function testNativePlaybackRowsApplySwingOnlyToFirstRollHit() {
  var engine = makeEngine([0]);
  var rows;

  clearAll(engine);
  engine.setStepCount(2);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setTempo(120);
  engine.setSwing(100);
  engine.setCell(0, 0, 1, 1, 80, 100, 1, 0, 0, 4);

  rows = engine.buildNativePlaybackRows();

  assert.deepStrictEqual(rows[1], nativeHitRow(36, 80, 28, 1, 62.5, 1, 2, 1, 2).concat(
    nativeHitRow(36, 80, 28, 1, 31.25, 1, 2, 1, 2),
    nativeHitRow(36, 80, 28, 1, 62.5, 1, 2, 1, 2),
    nativeHitRow(36, 80, 28, 1, 93.75, 1, 2, 1, 2)
  ));
}

function testNativePlaybackRowsPrecomputeCycleGates() {
  var engine = makeEngine([0]);
  var rows;
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 100, 100, 3);

  rows = engine.buildNativePlaybackRows();

  assert.strictEqual(engine.nativePlaybackStepCount, 3);
  assert.deepStrictEqual(rows[0], nativeHitRow(36, 100, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[1], []);
  assert.deepStrictEqual(rows[2], []);
}

function testNativePlaybackRowsPrecomputeCycleOffsets() {
  var engine = makeEngine([0]);
  var rows;
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 100, 100, 3, 2);

  rows = engine.buildNativePlaybackRows();

  assert.strictEqual(engine.nativePlaybackStepCount, 3);
  assert.deepStrictEqual(rows[0], []);
  assert.deepStrictEqual(rows[1], []);
  assert.deepStrictEqual(rows[2], nativeHitRow(36, 100, 100, 1, 0, 1, 1, 1, 1));
}

function testNativePlaybackRowsPrecomputeCycleInversion() {
  var engine = makeEngine([0]);
  var rows;
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 100, 100, 4, 0, 1);

  rows = engine.buildNativePlaybackRows();

  assert.strictEqual(engine.nativePlaybackStepCount, 4);
  assert.deepStrictEqual(rows[0], []);
  assert.deepStrictEqual(rows[1], nativeHitRow(36, 100, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[2], nativeHitRow(36, 100, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[3], nativeHitRow(36, 100, 100, 1, 0, 1, 1, 1, 1));
}

function testNativePlaybackRowsUseLeastCommonCyclePeriod() {
  var engine = makeEngine([0]);
  var rows;
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(2);
  engine.setCell(0, 0, 0, 1, 100, 100, 2);
  engine.setCell(0, 1, 0, 1, 90, 100, 3);

  rows = engine.buildNativePlaybackRows();

  assert.strictEqual(engine.nativePlaybackStepCount, 6);
  assert.deepStrictEqual(rows[0], nativeHitRow(engine.channels[0].note, 100, 100, 1, 0, 1, 1, 1, 1).concat(
    nativeHitRow(engine.channels[1].note, 90, 100, 1, 0, 2, 1, 1, 1)
  ));
  assert.deepStrictEqual(rows[1], []);
  assert.deepStrictEqual(rows[2], nativeHitRow(engine.channels[0].note, 100, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[3], nativeHitRow(engine.channels[1].note, 90, 100, 1, 0, 2, 1, 1, 1));
  assert.deepStrictEqual(rows[4], nativeHitRow(engine.channels[0].note, 100, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[5], []);
}

function testNativePlaybackRowsPrerollProbability() {
  var engine = makeEngine([0.1, 0.9, 0.2, 0.8]);
  var rows;
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 100, 50, 1);

  engine._setRandomValues([0.1, 0.9, 0.2, 0.8]);
  rows = engine.buildNativePlaybackRows();

  assert.strictEqual(engine.nativePlaybackStepCount, 16);
  assert.deepStrictEqual(rows[0], nativeHitRow(36, 100, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[1], []);
  assert.deepStrictEqual(rows[2], nativeHitRow(36, 100, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[3], []);
}

function testNativePlaybackRowsEvaluateProbabilityOncePerRollStep() {
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
  engine.setCell(0, 0, 0, 1, 100, 50, 1, 0, 0, 4);

  randomCalls = 0;
  engine.buildNativePlaybackRows();

  assert.strictEqual(randomCalls, 16);
}

function testNativePlaybackRowsEvaluateCycleBeforeProbability() {
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
  engine.setCell(0, 0, 0, 1, 100, 50, 2);

  randomCalls = 0;
  engine.buildNativePlaybackRows();

  assert.strictEqual(engine.nativePlaybackStepCount, 32);
  assert.strictEqual(randomCalls, 16);
}

function testNativePlaybackRowsPrerollVelocityHumanize() {
  var engine = makeEngine([0, 1, 0.5]);
  var rows;
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setVelocityHumanize(20);
  engine.setCell(0, 0, 0, 1, 100, 100, 1);

  engine._setRandomValues([0, 1, 0.5]);
  rows = engine.buildNativePlaybackRows();

  assert.strictEqual(engine.nativePlaybackStepCount, 16);
  assert.deepStrictEqual(rows[0], nativeHitRow(36, 80, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[1], nativeHitRow(36, 120, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[2], nativeHitRow(36, 100, 100, 1, 0, 1, 1, 1, 1));
}

function testNativePlaybackRowsShareVariationExpansionForProbabilityAndVelocity() {
  var engine = makeEngine([0, 0, 0, 0]);
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setVelocityHumanize(20);
  engine.setCell(0, 0, 0, 1, 100, 50, 1);

  engine._setRandomValues([0, 0, 0, 0]);
  engine.buildNativePlaybackRows();

  assert.strictEqual(engine.nativePlaybackStepCount, 16);
}

function testNativePlaybackRowsPrerollLateTimingHumanize() {
  var engine = makeEngine([1]);
  var rows;
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setTempo(120);
  engine.setTimingHumanize(100);
  engine.setCell(0, 0, 0, 1, 100, 100, 1);

  engine._setRandomValues([1]);
  rows = engine.buildNativePlaybackRows();

  assert.strictEqual(engine.nativePlaybackStepCount, 16);
  assert.deepStrictEqual(rows[0], nativeHitRow(36, 100, 100, 1, 25, 1, 1, 1, 1));
}

function testNativePlaybackRowsPrerollEarlyTimingHumanize() {
  var engine = makeEngine([0]);
  var rows;
  clearAll(engine);
  engine.setStepCount(2);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setTempo(120);
  engine.setTimingHumanize(100);
  engine.setCell(0, 0, 1, 1, 100, 100, 1);

  engine._setRandomValues([0]);
  rows = engine.buildNativePlaybackRows();

  assert.strictEqual(engine.nativePlaybackStepCount, 32);
  assert.deepStrictEqual(rows[0], nativeHitRow(36, 100, 100, 1, 100, 1, 2, 1, 2));
  assert.deepStrictEqual(rows[1], []);
}

function testNativePlaybackRowsClampFirstStepEarlyTiming() {
  var engine = makeEngine([0]);
  var rows;
  clearAll(engine);
  engine.setStepCount(2);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setTempo(120);
  engine.setTimingHumanize(100);
  engine.setCell(0, 0, 0, 1, 100, 100, 1);

  engine._setRandomValues([0]);
  rows = engine.buildNativePlaybackRows();

  assert.deepStrictEqual(rows[0], nativeHitRow(36, 100, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[1], nativeHitRow(36, 100, 100, 1, 100, 1, 1, 1, 1));
}

function testNativePlaybackRowsIncludeNoteHitMetadata() {
  var engine = makeEngine([0]);
  var rows;
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine.generateWindow(0, 1, true);
  engine.generated[0][0].sourceStep = 3;

  rows = engine.buildNativePlaybackRows();

  assert.strictEqual(rows[0].length, 9);
  assert.strictEqual(rows[0][5], 1);
  assert.strictEqual(rows[0][6], 1);
  assert.strictEqual(rows[0][7], 1);
  assert.strictEqual(rows[0][8], 4);
}

function testReversePlaybackMirrorsTransportPositionAcrossActiveLength() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setChannelPlaybackMode(0, "reverse");

  assert.strictEqual(engine.playbackStepForChannel(0, 0), 3);
  assert.strictEqual(engine.playbackStepForChannel(0, 1), 2);
  assert.strictEqual(engine.playbackStepForChannel(0, 2), 1);
  assert.strictEqual(engine.playbackStepForChannel(0, 3), 0);
}

function testBoomerangPlaybackRepeatsEndpointsAcrossActiveLength() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setGenerationMode("static");
  engine.setChannelLoopLength(0, 3);
  engine.setChannelPlaybackMode(0, "boomerang");
  engine.setCell(0, 0, 0, 1, 10, 100, 1);
  engine.setCell(0, 0, 1, 1, 20, 100, 1);
  engine.setCell(0, 0, 2, 1, 30, 100, 1);

  assert.deepStrictEqual([
    engine.playbackStepForChannel(0, 0) + 1,
    engine.playbackStepForChannel(0, 1) + 1,
    engine.playbackStepForChannel(0, 2) + 1,
    engine.playbackStepForChannel(0, 3) + 1,
    engine.playbackStepForChannel(0, 4) + 1,
    engine.playbackStepForChannel(0, 5) + 1
  ], [1, 2, 3, 3, 2, 1]);
}

function testNativePlaybackRowsApplyPlaybackModesToMetadata() {
  var engine = makeEngine([0]);
  var rows;
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setGenerationMode("static");
  engine.setChannelLoopLength(0, 3);
  engine.setChannelPlaybackMode(0, "boomerang");
  engine.setCell(0, 0, 0, 1, 10, 100, 1);
  engine.setCell(0, 0, 1, 1, 20, 100, 1);
  engine.setCell(0, 0, 2, 1, 30, 100, 1);
  engine.generateWindow(0, 4, true);

  rows = engine.buildNativePlaybackRows();

  assert.strictEqual(engine.nativePlaybackStepCount, 12);
  assert.deepStrictEqual(rows[0], nativeHitRow(36, 10, 100, 1, 0, 1, 1, 1, 1));
  assert.deepStrictEqual(rows[2], nativeHitRow(36, 30, 100, 1, 0, 1, 3, 1, 3));
  assert.deepStrictEqual(rows[3], nativeHitRow(36, 30, 100, 1, 0, 1, 3, 1, 3));
  assert.deepStrictEqual(rows[5], nativeHitRow(36, 10, 100, 1, 0, 1, 1, 1, 1));
}

function testEngineUsesNativePlaybackByDefault() {
  var engine = makeEngine([0]);
  assert.strictEqual(engine.nativePlaybackActive(), true);
}

function testTransportUsesNativePlaybackOnly() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine._notes.length = 0;

  engine.transportPosition(0, 1);

  assert.strictEqual(engine.nativePlaybackActive(), true);
  assert.strictEqual(engine._notes.length, 0);
}

function testNativePlaybackSupportsCycleGates() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(1);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 100, 100, 2);
  engine._notes.length = 0;

  engine.transportPosition(0, 1);

  assert.strictEqual(engine.nativePlaybackActive(), true);
  assert.strictEqual(engine._notes.length, 0);
}

function testNativePlaybackSupportsProbabilityPreroll() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setCell(0, 0, 0, 1, 100, 50, 1);
  engine._notes.length = 0;
  engine._setRandomValues([0]);

  engine.transportPosition(0, 1);

  assert.strictEqual(engine.nativePlaybackActive(), true);
  assert.strictEqual(engine._notes.length, 0);
}

function testNativePlaybackSupportsVelocityHumanizePreroll() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setVelocityHumanize(20);
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine._notes.length = 0;

  engine.transportPosition(0, 1);

  assert.strictEqual(engine.nativePlaybackActive(), true);
  assert.strictEqual(engine._notes.length, 0);
}

function testNativePlaybackSupportsTimingHumanizePreroll() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(4);
  engine.setChannelCount(1);
  engine.setTimingHumanize(20);
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine._notes.length = 0;

  engine.transportPosition(0, 1);

  assert.strictEqual(engine.nativePlaybackActive(), true);
  assert.strictEqual(engine._notes.length, 0);
}

function testNativePlaybackRefreshesGeneratedWindowOnTransportBoundary() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(8);
  engine.setChannelCount(1);
  engine.setRate("16n");
  engine.setRefreshSteps(4);
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 4, 1, 44, 100, 1);
  engine.setCell(3, 0, 4, 1, 99, 100, 1);
  engine._setRandomValues([0]);
  engine.generateWindow(4, 4, true);
  assert.strictEqual(engine.generated[0][4].source, 0);
  assert.strictEqual(engine.generated[0][4].velocity, 44);

  engine._notes.length = 0;
  engine._setRandomValues([0, 0.99, 0]);
  engine.transportPosition(0, 1);
  engine.transportPosition(0.25, 1);
  engine.transportPosition(0.5, 1);
  engine.transportPosition(0.75, 1);
  engine.transportPosition(1, 1);

  assert.strictEqual(engine.nativePlaybackActive(), true);
  assert.strictEqual(engine._notes.length, 0);
  assert.strictEqual(engine.generated[0][4].source, 3);
  assert.strictEqual(engine.generated[0][4].velocity, 99);
  assert.deepStrictEqual(engine.nativePlaybackRows[4], nativeHitRow(36, 99, 100, 1, 0, 1, 5, 4, 5));

  engine.transportPosition(1.01, 1);
  assert.strictEqual(engine.generated[0][4].source, 3);
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

  assert.strictEqual(engine._notes.length, 0);

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
  engine.setCell(1, 0, 2, 1, 77, 25, 1, 0, 0, 5);

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
  assert.strictEqual(restored.sources[1][0][2].roll, 5);
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

function testCycleOffsetClampsToCycleRange() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(8);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 100, 100, 4, 9);
  assert.strictEqual(engine.sources[0][0][0].cycleOffset, 3);

  engine.setCellCycleOffset(0, 0, 0, 2);
  assert.strictEqual(engine.sources[0][0][0].cycleOffset, 2);

  engine.setCellCycle(0, 0, 0, 2);
  assert.strictEqual(engine.sources[0][0][0].cycleOffset, 1);

  engine.setCellCycle(0, 0, 0, 1);
  assert.strictEqual(engine.sources[0][0][0].cycleOffset, 0);
}

function testCycleInversionClearsWhenCycleIsOne() {
  var engine = makeEngine([0]);
  clearAll(engine);
  engine.setStepCount(8);
  engine.setChannelCount(1);
  engine.setCell(0, 0, 0, 1, 100, 100, 4, 0, 1);
  assert.strictEqual(engine.sources[0][0][0].cycleInverted, 1);

  engine.setCellCycle(0, 0, 0, 1);
  assert.strictEqual(engine.sources[0][0][0].cycleInverted, 0);

  engine.setCellCycleInverted(0, 0, 0, 1);
  assert.strictEqual(engine.sources[0][0][0].cycleInverted, 0);
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
  engine.setGenerationMode("stack");
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
  engine.setChannelLoopLength(0, 5);
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
  assert.strictEqual(restored.channels[0].loopLength, 5);
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
testChannelLoopLengthWrapsSourceStepLookup();
testChannelLoopLengthRefreshesAllWrappedGeneratedCells();
testChannelLoopLengthClampsToStepCount();
testTrailingCellsDoNotMakeSourceActive();
testChannelLockOverridesRandomSource();
testNativePlaybackRowsIncludeDeterministicHitsAndSwing();
testNativePlaybackRowsExpandRollsInsideStep();
testNativePlaybackRowsApplySwingOnlyToFirstRollHit();
testNativePlaybackRowsPrecomputeCycleGates();
testNativePlaybackRowsPrecomputeCycleOffsets();
testNativePlaybackRowsPrecomputeCycleInversion();
testNativePlaybackRowsUseLeastCommonCyclePeriod();
testNativePlaybackRowsPrerollProbability();
testNativePlaybackRowsEvaluateProbabilityOncePerRollStep();
testNativePlaybackRowsEvaluateCycleBeforeProbability();
testNativePlaybackRowsPrerollVelocityHumanize();
testNativePlaybackRowsShareVariationExpansionForProbabilityAndVelocity();
testNativePlaybackRowsPrerollLateTimingHumanize();
testNativePlaybackRowsPrerollEarlyTimingHumanize();
testNativePlaybackRowsClampFirstStepEarlyTiming();
testNativePlaybackRowsIncludeNoteHitMetadata();
testReversePlaybackMirrorsTransportPositionAcrossActiveLength();
testBoomerangPlaybackRepeatsEndpointsAcrossActiveLength();
testNativePlaybackRowsApplyPlaybackModesToMetadata();
testEngineUsesNativePlaybackByDefault();
testTransportUsesNativePlaybackOnly();
testNativePlaybackSupportsCycleGates();
testNativePlaybackSupportsProbabilityPreroll();
testNativePlaybackSupportsVelocityHumanizePreroll();
testNativePlaybackSupportsTimingHumanizePreroll();
testNativePlaybackRefreshesGeneratedWindowOnTransportBoundary();
testTransportPositionDoesNotFireWhileStopped();
testDeviceInactiveSuppressesTransportAndAudition();
testDeserializeAcceptsUILaneSchema();
testDeserializeRestoresZeroSwing();
testDeserializePreservesMissingChannelKeys();
testCellEditsReachStepsBeyondSixteen();
testCycleOffsetClampsToCycleRange();
testCycleInversionClearsWhenCycleIsOne();
testCellEditDoesNotReRollGeneratedSources();
testCellEditOnlyMutatesGeneratedWhenSourceMatches();
testChannelLockRoutesSourceEditsToGenerated();
testSerializeDeserializeRestoresSourceData();
testGenerateWindowScansActiveSourcesOnce();
testChannelAuditionEmitsConfiguredNote();
testDeserializeDoesNotEmitIntermediateStatuses();

function testSerializeForPersistenceRoundtripsSparsePattern() {
  var engine = makeEngine([0.5]);
  var json;
  var restored;
  var payload;

  engine.setStepCount(8);
  engine.setChannelCount(2);
  engine.swing = 25;
  engine.setCell(0, 0, 0, 1, 64, 30, 1, 0, 0, 3);
  engine.channels[0].label = "Sub";
  engine.channels[1].note = 50;

  payload = engine.serializeForPersistence();
  assert.strictEqual(payload.v, 1);
  assert.strictEqual(payload.stepCount, 8);
  assert.strictEqual(payload.channelCount, 2);
  assert.strictEqual(payload.swing, 25);
  assert.strictEqual(payload.nativeTiming, undefined);
  assert.ok(payload.cells.length >= 1);

  json = JSON.stringify(payload);
  assert.ok(json.length < 5000, "compact persistence JSON should stay reasonably small");

  restored = makeEngine([0.5]);
  restored.deserializeForPersistence(JSON.parse(json));

  assert.strictEqual(restored.stepCount, 8);
  assert.strictEqual(restored.channelCount, 2);
  assert.strictEqual(restored.swing, 25);
  assert.strictEqual(restored.sources[0][0][0].enabled, 1);
  assert.strictEqual(restored.sources[0][0][0].velocity, 64);
  assert.strictEqual(restored.sources[0][0][0].roll, 3);
  assert.strictEqual(restored.channels[0].label, "Sub");
  assert.strictEqual(restored.channels[1].note, 50);
}

testSerializeForPersistenceRoundtripsSparsePattern();

function testSerializeForPersistenceIncludesChannelSettings() {
  var engine = makeEngine([0.5]);

  engine.setStepCount(16);
  engine.setChannelCount(8);
  engine.channels[0].note = 36;
  engine.channels[1].note = 38;
  engine.channels[0].loopLength = 16;
  engine.channels[1].lock = 2;
  engine.channels[1].playbackMode = "boomerang";
  engine.setGenerationMode("static");
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine.setCell(1, 1, 4, 1, 80, 50, 4, 3, 1, 6);

  var payload = engine.serializeForPersistence();
  var restored = makeEngine([0.5]);

  restored.deserializeForPersistence(payload);

  assert.strictEqual(restored.channels[0].note, 36);
  assert.strictEqual(restored.channels[1].note, 38);
  assert.strictEqual(restored.channels[0].loopLength, 16);
  assert.strictEqual(restored.channels[1].lock, 2);
  assert.strictEqual(restored.channels[1].playbackMode, "boomerang");
  assert.strictEqual(restored.generationMode, "static");
  assert.strictEqual(restored.sources[0][0][0].enabled, 1);
  assert.strictEqual(restored.sources[1][1][4].enabled, 1);
  assert.strictEqual(restored.sources[1][1][4].velocity, 80);
  assert.strictEqual(restored.sources[1][1][4].probability, 50);
  assert.strictEqual(restored.sources[1][1][4].cycle, 4);
  assert.strictEqual(restored.sources[1][1][4].cycleOffset, 3);
  assert.strictEqual(restored.sources[1][1][4].cycleInverted, 1);
  assert.strictEqual(restored.sources[1][1][4].roll, 6);
}

testSerializeForPersistenceIncludesChannelSettings();

function testTransportDoesNotEmitMidiAfterJump() {
  var engine = makeEngine([0.99, 0.99, 0.99, 0.99]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setStepCount(4);
  engine.setGenerationMode("static");
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine.setCell(0, 0, 1, 1, 100, 100, 1);
  engine.setCell(0, 0, 2, 1, 100, 100, 1);
  engine.setCell(0, 0, 3, 1, 100, 100, 1);
  engine.generateWindow(0, 4, true);
  engine._notes.length = 0;
  engine.transportPosition(0, 1);
  engine._notes.length = 0;
  engine.transportPosition(0.75, 1);
  assert.strictEqual(engine._notes.length, 0, "transport playback should stay on the native patch path after a jump");
  assert.strictEqual(engine.playingStepOneBased, 4);
}

function testTransportReportsStepEdgeWithoutMidiOutlet() {
  var engine = makeEngine([0.99, 0.99, 0.99]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setStepCount(4);
  engine.setGenerationMode("static");
  engine.setCell(0, 0, 0, 1, 100, 100, 1);
  engine.generateWindow(0, 4, true);
  engine._notes.length = 0;
  engine.transportPosition(0, 1);
  assert.strictEqual(engine._notes.length, 0, "transport playback should not emit outlet MIDI");
  assert.strictEqual(engine.playingStepOneBased, 1);
  engine.transportPosition(0.01, 1);
  assert.strictEqual(engine.playingStepOneBased, 1);
}

function testPhaseOffsetShiftsStepBoundaryEarlier() {
  var engine = makeEngine([0.99]);
  clearAll(engine);
  engine.setChannelCount(1);
  engine.setStepCount(4);
  engine.setTempo(120);
  engine.setPhaseOffsetBeats(-0.2);
  assert.strictEqual(engine.globalStepForBeats(0.05), 1);
  assert.strictEqual(engine.globalStepForBeats(0), 0);
}

function testOldNativeTimingPersistenceIsIgnored() {
  var restored = makeEngine([0.5]);
  var payload = {
    v: 1,
    stepCount: 8,
    channelCount: 1,
    refreshSteps: 1,
    generationMode: "static",
    staticSource: 0,
    rate: "16n",
    tempo: 120,
    swing: 0,
    velocityHumanize: 0,
    timingHumanize: 0,
    deviceActive: 1,
    nativeTiming: 0,
    phaseOffsetBeats: 0,
    channels: [["1", 36, -1, 8, "normal"]],
    sourceChannelMutes: [[0], [0], [0], [0]],
    cells: [[0, 0, 0, 1, 64, 100, 1, 0, 0]]
  };

  assert.strictEqual(restored.deserializeForPersistence(payload), true);
  assert.strictEqual(restored.nativePlaybackActive(), true);
  assert.strictEqual(restored.serializeForPersistence().nativeTiming, undefined);
}

function testRenderGeneratedMidiNotesBakesStaticPattern() {
  var engine = makeEngine([0.99]);
  var render;

  clearAll(engine);
  engine.setChannelCount(1);
  engine.setStepCount(4);
  engine.setRate("16n");
  engine.setTempo(120);
  engine.setGenerationMode("static");
  engine.channels[0].note = 42;
  engine.setCell(0, 0, 0, 1, 64, 100, 1);
  engine.generateWindow(0, 4, true);

  render = engine.renderGeneratedMidiNotes(1, 4);

  assert.strictEqual(render.lengthBeats, 4);
  assert.strictEqual(render.notes.length, 4);
  assert.deepStrictEqual(render.notes.map(function (note) { return note.start_time; }), [0, 1, 2, 3]);
  assert.deepStrictEqual(render.notes.map(function (note) { return note.pitch; }), [42, 42, 42, 42]);
  assert.deepStrictEqual(render.notes.map(function (note) { return note.velocity; }), [64, 64, 64, 64]);
}

function testRenderGeneratedMidiNotesIncludesRollHits() {
  var engine = makeEngine([0.99]);
  var render;

  clearAll(engine);
  engine.setChannelCount(1);
  engine.setStepCount(4);
  engine.setRate("4n");
  engine.setTempo(120);
  engine.setGenerationMode("static");
  engine.channels[0].note = 42;
  engine.setCell(0, 0, 0, 1, 64, 100, 1, 0, 0, 4);
  engine.generateWindow(0, 4, true);

  render = engine.renderGeneratedMidiNotes(1, 4);

  assert.deepStrictEqual(render.notes.map(function (note) { return note.start_time; }), [0, 0.25, 0.5, 0.75]);
  assert.deepStrictEqual(render.notes.map(function (note) { return note.duration; }), [0.2, 0.2, 0.2, 0.2]);
}

function testRenderGeneratedMidiNotesRerollsRefreshWindows() {
  var engine = makeEngine([0.1, 0.9]);
  var render;

  clearAll(engine);
  engine.setChannelCount(1);
  engine.setStepCount(8);
  engine.setRefreshSteps(4);
  engine.setRate("16n");
  engine.setGenerationMode("stack");
  engine.setCell(0, 0, 0, 1, 40, 100, 1);
  engine.setCell(1, 0, 4, 1, 90, 100, 1);
  engine._setRandomValues([0.1, 0.9]);

  render = engine.renderGeneratedMidiNotes(1, 4);

  assert.ok(render.notes.length >= 2, "render should include hits from separate refresh windows");
  assert.strictEqual(render.notes[0].start_time, 0);
  assert.strictEqual(render.notes[0].velocity, 40);
  assert.strictEqual(render.notes[1].start_time, 1);
  assert.strictEqual(render.notes[1].velocity, 90);
}

testTransportReportsStepEdgeWithoutMidiOutlet();
testTransportDoesNotEmitMidiAfterJump();
testPhaseOffsetShiftsStepBoundaryEarlier();
testOldNativeTimingPersistenceIsIgnored();
testRenderGeneratedMidiNotesBakesStaticPattern();
testRenderGeneratedMidiNotesIncludesRollHits();
testRenderGeneratedMidiNotesRerollsRefreshWindows();

console.log("ksh_engine tests passed");
