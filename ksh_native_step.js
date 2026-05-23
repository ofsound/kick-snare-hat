// Fires one step from ksh_native_playback dict (Max step-edge path). Not on the
// transport clock — only called when the patch detects a step index change.
autowatch = 0;
inlets = 1;
outlets = 1;

include("ksh_constants.js");

var playbackDict = null;

function ensureDict() {
  if (!playbackDict && typeof Dict === "function") {
    playbackDict = new Dict("ksh_native_playback");
  }
  return playbackDict;
}

function play_step(step) {
  var dict;
  var hits;
  var i;
  var pitch;
  var velocity;

  step = parseInt(step, 10);
  if (isNaN(step)) {
    return;
  }

  dict = ensureDict();
  if (!dict) {
    return;
  }

  hits = dict.get(String(step));
  if (!hits || typeof hits.length !== "number" || !hits.length) {
    return;
  }

  for (i = 0; i < hits.length; i += 2) {
    pitch = parseInt(hits[i], 10);
    velocity = parseInt(hits[i + 1], 10);
    if (isNaN(pitch) || isNaN(velocity)) {
      continue;
    }
    outlet(
      0,
      pitch,
      velocity,
      KSH_CONSTANTS.DEFAULT_NOTE_DURATION_MS,
      KSH_CONSTANTS.DEFAULT_MIDI_CHANNEL,
      0
    );
  }
}
