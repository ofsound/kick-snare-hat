autowatch = 0;
inlets = 1;
outlets = 1;

include("ksh_ui_shared.js");

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

var COMPACT_BASE_WIDTH = 736;
var WIDTH = COMPACT_BASE_WIDTH;
var HEIGHT = 176;
var MAX_STEPS = ksh_shared.MAX_STEPS;
var MAX_LANES = ksh_shared.MAX_LANES;
var DEFAULT_CHANNEL_COUNT = ksh_shared.constants.DEFAULT_CHANNEL_COUNT;
var DEFAULT_GENERATION_MODE = ksh_shared.constants.DEFAULT_GENERATION_MODE;
var ACTION_COLUMN_WIDTH = 86;
var PREVIEW_CELL_W = 18;
var PREVIEW_GRID_X = ACTION_COLUMN_WIDTH + 50;
var PREVIEW_GRID_Y = 18;
var PREVIEW_CELL_H = 18;
var colors = ksh_shared.colors;
var inactiveStepColor = [0.14, 0.16, 0.19, 1];
var NOTE_HIT_FLASH_MS = 80;

var state = makeState();
var previewData = null;
var hitZones = [];
var noteHitFlashes = [];
var noteHitFlashTask = null;

function computeCompactWidth() {
  return COMPACT_BASE_WIDTH;
}

function applyCompactSize() {
  var newWidth = computeCompactWidth();
  var changed = newWidth !== WIDTH;

  WIDTH = newWidth;
  ksh_shared.applyViewSize(WIDTH, HEIGHT, { resizePatcher: false });

  return changed;
}

function makeState() {
  var lanes = [];
  var i;

  for (i = 0; i < MAX_LANES; i += 1) {
    lanes[i] = {
      label: ksh_shared.defaultLabels[i],
      note: ksh_shared.defaultNotes[i],
      lock: -1,
      loopLength: 16
    };
  }

  return {
    stepCount: 16,
    laneCount: DEFAULT_CHANNEL_COUNT,
    refreshSteps: 1,
    generationMode: DEFAULT_GENERATION_MODE,
    staticSource: 0,
    rate: "16n",
    swing: 0,
    lanes: lanes
  };
}

function paint() {
  hitZones = [];
  ksh_shared.rect(0, 0, WIDTH, HEIGHT, colors.bg);
  drawActionColumn();
  drawPreview();
}

function drawActionColumn() {
  ksh_shared.rect(0, 0, ACTION_COLUMN_WIDTH, HEIGHT, colors.panel2);
  ksh_shared.button(hitZones, "open_editor", "Edit", 14, 18, 58, 25, true);
}

function drawPreview() {
  var lane;
  var step;
  var cell;
  var maxPreviewLanes = Math.min(MAX_LANES, state.laneCount);
  var activeStep;
  var fillColor;
  var now = Date.now();

  for (lane = 0; lane < maxPreviewLanes; lane += 1) {
    ksh_shared.text(state.lanes[lane].label, PREVIEW_GRID_X - 10, PREVIEW_GRID_Y + lane * PREVIEW_CELL_H + 12, 9, colors.muted, "right");
    for (step = 0; step < MAX_STEPS; step += 1) {
      activeStep = step < state.stepCount;
      cell = previewData && previewData.generated && previewData.generated[lane] ? previewData.generated[lane][step] : null;
      fillColor = activeStep ? (cell && cell.enabled ? colors.blue : colors.off) : inactiveStepColor;
      if (noteHitFlashes[lane] && noteHitFlashes[lane][step] && noteHitFlashes[lane][step] > now) {
        fillColor = colors.text;
      }
      ksh_shared.rect(PREVIEW_GRID_X + step * PREVIEW_CELL_W, PREVIEW_GRID_Y + lane * PREVIEW_CELL_H, PREVIEW_CELL_W - 3, PREVIEW_CELL_H - 3, fillColor);
    }
  }
}

function scheduleNoteHitFlashClear() {
  if (typeof Task !== "function") {
    return;
  }
  if (noteHitFlashTask) {
    noteHitFlashTask.cancel();
  }
  noteHitFlashTask = new Task(function () {
    noteHitFlashTask = null;
    mgraphics.redraw();
  }, this);
  noteHitFlashTask.schedule(NOTE_HIT_FLASH_MS);
}

function note_hit(channel, stepIndex) {
  var lane = ksh_shared.clamp(channel - 1, 0, MAX_LANES - 1);
  var step = ksh_shared.clamp(stepIndex - 1, 0, MAX_STEPS - 1);

  if (!noteHitFlashes[lane]) {
    noteHitFlashes[lane] = [];
  }
  noteHitFlashes[lane][step] = Date.now() + NOTE_HIT_FLASH_MS;
  mgraphics.redraw();
  scheduleNoteHitFlashClear();
}

function send() {
  var args = arrayfromargs(arguments);
  outlet.apply(this, [0].concat(args));
  if (args[0] !== "open_editor" && typeof messnamed === "function") {
    messnamed.apply(this, ["ksh_engine_commands"].concat(args));
  }
}

function sync_all() {
  applyCompactSize();
  send("sync_all");
  mgraphics.redraw();
}

function loadbang() {
  sync_all();
}

function init() {
  sync_all();
}

function engine_state(json) {
  var engineState;

  if (typeof json !== "string") {
    json = arrayfromargs(arguments).join(" ");
  }

  try {
    engineState = JSON.parse(json);
    ksh_shared.applyEngineState(state, engineState);
    applyCompactSize();
    mgraphics.redraw();
  } catch (error) {
    ksh_shared.constants.debugPost("compact engine_state JSON failed", error);
  }
}

function onclick(x, y, button, cmd, shift) {
  var z = ksh_shared.findZone(hitZones, x, y);

  if (!z) {
    return;
  }

  if (z.id === "open_editor") {
    send("open_editor");
  }
  mgraphics.redraw();
}

function preview(json) {
  if (typeof json !== "string") {
    json = arrayfromargs(arguments).join(" ");
  }
  try {
    previewData = JSON.parse(json);
    mgraphics.redraw();
  } catch (error) {
    ksh_shared.constants.debugPost("compact preview JSON failed", error);
  }
}

function anything() {
  if (messagename === "preview") {
    preview.apply(this, arrayfromargs(arguments));
  } else if (messagename === "engine_state") {
    engine_state.apply(this, arrayfromargs(arguments));
  } else if (messagename === "current_step") {
    return;
  } else if (messagename === "note_hit") {
    note_hit.apply(this, arrayfromargs(arguments));
  } else {
    ksh_shared.applyStatusMessage(state, messagename, arrayfromargs(arguments));
    if (messagename === "steps") {
      applyCompactSize();
    }
    mgraphics.redraw();
  }
}
