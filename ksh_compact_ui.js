autowatch = 1;
inlets = 1;
outlets = 2;

include("ksh_ui_shared.js");

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

var COMPACT_BASE_WIDTH = 880;
var WIDTH = COMPACT_BASE_WIDTH;
var HEIGHT = 160;
var MAX_STEPS = ksh_shared.MAX_STEPS;
var MAX_LANES = ksh_shared.MAX_LANES;
var colors = ksh_shared.colors;

var state = makeState();
var previewData = null;
var hitZones = [];

function computeCompactWidth() {
  var previewX0 = 82;
  var previewCellW = 18;

  if (state.stepCount <= 16) {
    return COMPACT_BASE_WIDTH;
  }

  return Math.max(COMPACT_BASE_WIDTH, previewX0 + state.stepCount * previewCellW + 460);
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
      lock: -1
    };
  }

  return {
    stepCount: 16,
    laneCount: 3,
    refreshSteps: 1,
    generationMode: "stack",
    rate: "16n",
    swing: 0,
    lanes: lanes
  };
}

function paint() {
  hitZones = [];
  ksh_shared.rect(0, 0, WIDTH, HEIGHT, colors.bg);
  drawHeader();
  drawPreview();
}

function drawHeader() {
  ksh_shared.rect(0, 0, WIDTH, 58, colors.panel2);
  ksh_shared.text("Kick Snare Hat", 14, 24, 17, colors.text);
  ksh_shared.button(hitZones, "mode", state.generationMode === "stack" ? "Stack" : "Per Lane", 250, 18, 78, 25, false);
  ksh_shared.valueBox(hitZones, "steps", "Steps", state.stepCount, 342, 18, 78);
  ksh_shared.valueBox(hitZones, "lanes", "Lanes", state.laneCount, 434, 18, 78);
  ksh_shared.valueBox(hitZones, "refresh", "Refresh", state.refreshSteps, 526, 18, 84);
  ksh_shared.button(hitZones, "rate", state.rate, 624, 18, 62, 25, false);
  ksh_shared.valueBox(hitZones, "swing", "Swing", state.swing, 700, 18, 78);
  ksh_shared.button(hitZones, "open_editor", "Edit", 792, 18, 58, 25, true);
}

function drawPreview() {
  var x0 = 82;
  var y0 = 84;
  var cellW = 18;
  var cellH = 14;
  var lane;
  var step;
  var cell;
  var maxPreviewLanes = Math.min(4, state.laneCount);

  ksh_shared.text("Generated", 14, 78, 11, colors.muted);
  for (lane = 0; lane < maxPreviewLanes; lane += 1) {
    ksh_shared.text(state.lanes[lane].label, x0 - 10, y0 + lane * cellH + 11, 9, colors.muted, "right");
    for (step = 0; step < state.stepCount; step += 1) {
      cell = previewData && previewData.generated && previewData.generated[lane] ? previewData.generated[lane][step] : null;
      ksh_shared.rect(x0 + step * cellW, y0 + lane * cellH, cellW - 3, cellH - 3, cell && cell.enabled ? colors.blue : colors.off);
    }
  }
  ksh_shared.text(
    "Open editor for source patterns, lane locks, velocity, probability, and cycle values.",
    Math.max(400, x0 + state.stepCount * cellW + 24),
    105,
    10,
    colors.muted
  );
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
  send("request_state");
  send("snapshot");
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
  } catch (error) {}
}

function onclick(x, y, button, cmd, shift) {
  var z = ksh_shared.findZone(hitZones, x, y);

  if (!z) {
    return;
  }

  if (z.id === "open_editor") {
    send("open_editor");
  } else if (z.id === "mode") {
    state.generationMode = state.generationMode === "stack" ? "per_channel" : "stack";
    send("mode", state.generationMode);
  } else if (z.id === "rate") {
    ksh_shared.cycleRate(state, shift ? -1 : 1);
    send("rate", state.rate);
  } else {
    handleStepper(z.id);
  }
  mgraphics.redraw();
}

function handleStepper(id) {
  if (id === "steps_inc" || id === "steps_dec") {
    state.stepCount = ksh_shared.clamp(state.stepCount + (id === "steps_inc" ? 1 : -1), 1, MAX_STEPS);
    state.refreshSteps = ksh_shared.clamp(state.refreshSteps, 1, state.stepCount);
    send("steps", state.stepCount);
    send("refresh_steps", state.refreshSteps);
    applyCompactSize();
  } else if (id === "lanes_inc" || id === "lanes_dec") {
    state.laneCount = ksh_shared.clamp(state.laneCount + (id === "lanes_inc" ? 1 : -1), 1, MAX_LANES);
    send("channels", state.laneCount);
  } else if (id === "refresh_inc" || id === "refresh_dec") {
    state.refreshSteps = ksh_shared.clamp(state.refreshSteps + (id === "refresh_inc" ? 1 : -1), 1, state.stepCount);
    send("refresh_steps", state.refreshSteps);
  } else if (id === "swing_inc" || id === "swing_dec") {
    state.swing = ksh_shared.clamp(state.swing + (id === "swing_inc" ? 1 : -1), 0, 100);
    send("swing", state.swing);
  }
}

function preview(json) {
  if (typeof json !== "string") {
    json = arrayfromargs(arguments).join(" ");
  }
  try {
    previewData = JSON.parse(json);
    mgraphics.redraw();
  } catch (error) {}
}

function anything() {
  if (messagename === "preview") {
    preview.apply(this, arrayfromargs(arguments));
  } else if (messagename === "engine_state") {
    engine_state.apply(this, arrayfromargs(arguments));
  } else if (messagename === "current_step") {
    return;
  } else {
    ksh_shared.applyStatusMessage(state, messagename, arrayfromargs(arguments));
    if (messagename === "steps") {
      applyCompactSize();
    }
    mgraphics.redraw();
  }
}
