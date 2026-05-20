autowatch = 1;
inlets = 1;
outlets = 1;

include("ksh_ui_shared.js");

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

var MAX_STEPS = ksh_shared.MAX_STEPS;
var MAX_LANES = ksh_shared.MAX_LANES;
var SOURCE_COUNT = ksh_shared.SOURCE_COUNT;
var GRID_CELL_W = 25;
var GRID_CELL_H = 22;
var EDITOR_LAYOUT = {
  MAIN_TOP: 68,
  FOOTER_H: 28,
  FOOTER_GAP: 8,
  CELL_EDITOR_W: 278,
  CELL_EDITOR_H: 248,
  RIGHT_MARGIN: 12,
  EDITOR_GAP: 24,
  LANE_PANEL_X: 12,
  LANE_PANEL_W: 158,
  LABEL_COL_W: 84,
  HEADER_MIN_WIDTH: 868
};
var WIDTH = 968;
var HEIGHT = 352;
var uiPatcher = null;
var editorWasVisible = false;
var windowResizeTaskImmediate = null;
var windowResizeTaskSettle = null;

function computeEditorDimensions() {
  var gridX0 = EDITOR_LAYOUT.LANE_PANEL_X + EDITOR_LAYOUT.LANE_PANEL_W + EDITOR_LAYOUT.LABEL_COL_W;
  var gridW = state.stepCount * GRID_CELL_W;
  var editorX = gridX0 + gridW + EDITOR_LAYOUT.EDITOR_GAP;
  var sourceGridY0 = EDITOR_LAYOUT.MAIN_TOP + 56;
  var sourceBlockH = state.laneCount * GRID_CELL_H;
  var generatedGridY0 = sourceGridY0 + sourceBlockH + 60;
  var generatedBottom = generatedGridY0 + state.laneCount * GRID_CELL_H;
  var mainContentBottom = Math.max(generatedBottom, EDITOR_LAYOUT.MAIN_TOP + EDITOR_LAYOUT.CELL_EDITOR_H);
  var footerY = mainContentBottom + EDITOR_LAYOUT.FOOTER_GAP;
  var width = Math.max(
    EDITOR_LAYOUT.HEADER_MIN_WIDTH,
    editorX + EDITOR_LAYOUT.CELL_EDITOR_W + EDITOR_LAYOUT.RIGHT_MARGIN
  );

  return {
    width: width,
    height: footerY + EDITOR_LAYOUT.FOOTER_H,
    footerY: footerY,
    gridX0: gridX0,
    gridW: gridW,
    editorX: editorX,
    editorW: EDITOR_LAYOUT.CELL_EDITOR_W
  };
}

function rememberUiContext() {
  if (typeof this !== "undefined" && this.patcher) {
    uiPatcher = this.patcher;
  }
}

function runWindowResize() {
  ksh_shared.resizePatcherWindow(uiPatcher, WIDTH, HEIGHT);
  mgraphics.redraw();
}

// Resize twice: once on the next tick (fast feedback) and once after the
// window has settled (~120ms). A single Task can only hold one pending fire,
// so we use two distinct Tasks — the previous implementation called
// schedule(0) then schedule(120) on the same Task, which silently cancelled
// the immediate pass.
function scheduleWindowResize() {
  if (typeof Task !== "function") {
    runWindowResize();
    return;
  }

  if (windowResizeTaskImmediate) {
    windowResizeTaskImmediate.cancel();
  }
  if (windowResizeTaskSettle) {
    windowResizeTaskSettle.cancel();
  }

  windowResizeTaskImmediate = new Task(runWindowResize, this);
  windowResizeTaskImmediate.schedule(0);

  windowResizeTaskSettle = new Task(runWindowResize, this);
  windowResizeTaskSettle.schedule(120);
}

function applyEditorSize() {
  var dims = computeEditorDimensions();
  var changed = dims.width !== WIDTH || dims.height !== HEIGHT;

  WIDTH = dims.width;
  HEIGHT = dims.height;
  ksh_shared.applyViewSize(WIDTH, HEIGHT, { patcher: uiPatcher });
  scheduleWindowResize();

  return changed;
}

function uiLayout() {
  var dims = computeEditorDimensions();
  var mainTop = EDITOR_LAYOUT.MAIN_TOP;
  var sectionTitleY = mainTop + 22;
  var sourceTitleY = sectionTitleY;
  var sourceStepY = sourceTitleY + 18;
  var sourceGridY0 = sourceStepY + 16;
  var sourceBlockH = state.laneCount * GRID_CELL_H;
  var generatedTitleY = sourceGridY0 + sourceBlockH + 28;
  var generatedStepY = generatedTitleY + 18;
  var generatedGridY0 = generatedStepY + 14;

  return {
    lanePanelX: EDITOR_LAYOUT.LANE_PANEL_X,
    lanePanelW: EDITOR_LAYOUT.LANE_PANEL_W,
    lanePanelTop: mainTop,
    lanePanelH: dims.footerY - mainTop - EDITOR_LAYOUT.FOOTER_GAP,
    labelRight: dims.gridX0 - 10,
    gridX0: dims.gridX0,
    gridW: dims.gridW,
    sourceTitleY: sourceTitleY,
    sourceStepY: sourceStepY,
    sourceGridY0: sourceGridY0,
    generatedTitleY: generatedTitleY,
    generatedStepY: generatedStepY,
    generatedGridY0: generatedGridY0,
    editorX: dims.editorX,
    editorY: mainTop,
    editorW: dims.editorW,
    footerY: dims.footerY
  };
}

var colors = {};
var key;
for (key in ksh_shared.colors) {
  if (ksh_shared.colors.hasOwnProperty(key)) {
    colors[key] = ksh_shared.colors[key];
  }
}
colors.green = [0.45, 0.76, 0.48, 1];
colors.edit = [0.96, 0.62, 0.22, 1];
colors.editLight = [0.58, 0.80, 0.97, 1];
colors.generated = [0.36, 0.66, 0.95, 1];

var state = makeState();
var previewData = null;
var playingStep = 0;
var selectedSource = 0;
var selectedLane = 0;
var selectedStep = 0;
var hitZones = [];
var editingLabel = false;
var velocityDrag = null;
var VELOCITY_DRAG_THRESHOLD = 4;
var SOURCE_PAINT_DRAG_THRESHOLD = 4;
var VELOCITY_DRAG_SCALE = 2;

function makeSource() {
  var source = [];
  var lane;
  var step;

  for (lane = 0; lane < MAX_LANES; lane += 1) {
    source[lane] = [];
    for (step = 0; step < MAX_STEPS; step += 1) {
      source[lane][step] = ksh_shared.defaultCell();
    }
  }

  return source;
}

function makeState() {
  var sources = [];
  var lanes = [];
  var i;

  for (i = 0; i < SOURCE_COUNT; i += 1) {
    sources[i] = makeSource();
  }

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
    midiChannel: 1,
    noteDurationMs: 100,
    lanes: lanes,
    sources: sources
  };
}

function paint() {
  hitZones = [];
  ksh_shared.rect(0, 0, WIDTH, HEIGHT, colors.bg);
  drawHeader();
  drawSourceGrid();
  drawGeneratedGrid();
  drawLaneControls();
  drawCellEditor();
  drawFooter();
}

function drawHeader() {
  var i;
  var sourceX = 14;
  var sourceBtnW = 26;
  var sourceBtnGap = 2;
  var modeX = sourceX + SOURCE_COUNT * (sourceBtnW + sourceBtnGap) - sourceBtnGap + 10;
  var durationX = WIDTH - 12 - 104;
  var midiX = durationX - 8 - 84;

  ksh_shared.rect(0, 0, WIDTH, 58, colors.panel2);

  ksh_shared.text("Source", sourceX, 12, 10, colors.muted);
  for (i = 0; i < SOURCE_COUNT; i += 1) {
    ksh_shared.button(
      hitZones,
      "source_pick",
      String(i + 1),
      sourceX,
      18,
      sourceBtnW,
      25,
      selectedSource === i,
      { source: i }
    );
    sourceX += sourceBtnW + sourceBtnGap;
  }

  ksh_shared.button(hitZones, "mode", state.generationMode === "stack" ? "Stack" : "Per Lane", modeX, 18, 78, 25, false);
  ksh_shared.valueBox(hitZones, "steps", "Steps", state.stepCount, modeX + 92, 18, 78, 30, 13);
  ksh_shared.valueBox(hitZones, "lanes", "Lanes", state.laneCount, modeX + 184, 18, 78, 30, 13);
  ksh_shared.valueBox(hitZones, "refresh", "Refresh", state.refreshSteps, modeX + 276, 18, 84, 30, 13);
  ksh_shared.button(hitZones, "rate", state.rate, modeX + 374, 18, 62, 25, false);
  ksh_shared.valueBox(hitZones, "swing", "Swing", state.swing, modeX + 450, 18, 78, 30, 13);
  ksh_shared.valueBox(hitZones, "midi", "MIDI Channel", state.midiChannel, midiX, 18, 84, 30, 13);
  ksh_shared.valueBox(hitZones, "duration", "Duration (ms)", state.noteDurationMs, durationX, 18, 104, 30, 13);
}

function drawLaneControls() {
  var lane;
  var y;
  var lockLabel;
  var layout = uiLayout();
  var panelTop = layout.lanePanelTop;
  var panelHeight = layout.lanePanelH;
  var listTop = panelTop + 36;
  var rowPitch = 28;

  ksh_shared.rect(layout.lanePanelX, panelTop, layout.lanePanelW, panelHeight, colors.panel);
  ksh_shared.text("Lanes", layout.lanePanelX + 12, panelTop + 22, 13, colors.text);

  var lockW = 28;
  var noteW = 26;

  for (lane = 0; lane < state.laneCount; lane += 1) {
    var lockX = layout.lanePanelX + layout.lanePanelW - 12 - lockW;
    var noteX = lockX - noteW;
    var selectX = layout.lanePanelX + 12;
    var selectW = noteX - selectX;

    y = listTop + lane * rowPitch;
    ksh_shared.rect(layout.lanePanelX + 12, y, layout.lanePanelW - 24, 23, lane === selectedLane ? [0.27, 0.29, 0.33, 1] : colors.panel2);
    ksh_shared.strokeRect(layout.lanePanelX + 12, y, layout.lanePanelW - 24, 23, colors.strokeSoft, 1);
    ksh_shared.text(state.lanes[lane].label, layout.lanePanelX + 18, y + 15, 10, colors.text);
    ksh_shared.text(String(state.lanes[lane].note), noteX + noteW / 2, y + 15, 10, colors.blue, "center");
    lockLabel = state.lanes[lane].lock < 0 ? "R" : "S" + (state.lanes[lane].lock + 1);
    ksh_shared.text(lockLabel, lockX + lockW / 2, y + 15, 10, colors.amber, "center");
    ksh_shared.zone(hitZones, "lane_select", selectX, y, selectW, 23, { lane: lane });
    ksh_shared.zone(hitZones, "lane_note", noteX, y, noteW, 23, { lane: lane });
    ksh_shared.zone(hitZones, "lane_lock", lockX, y, lockW, 23, { lane: lane });
  }
}

function stepLabelColor(stepIndex) {
  return playingStep > 0 && stepIndex + 1 === playingStep ? colors.text : colors.muted;
}

function drawStepNumberLabels(x0, cellW, y) {
  var step;

  for (step = 0; step < state.stepCount; step += 1) {
    ksh_shared.text(String(step + 1), x0 + step * cellW + cellW / 2, y, 10, stepLabelColor(step), "center");
  }
}

function drawSourceGrid() {
  var layout = uiLayout();
  var x0 = layout.gridX0;
  var y0 = layout.sourceGridY0;
  var cellW = GRID_CELL_W;
  var cellH = GRID_CELL_H;
  var lane;
  var step;
  var x;
  var y;
  var cell;
  var active;

  ksh_shared.text("Source " + (selectedSource + 1) + " Pattern", x0, layout.sourceTitleY, 13, colors.text);
  drawStepNumberLabels(x0, cellW, layout.sourceStepY);

  for (lane = 0; lane < state.laneCount; lane += 1) {
    ksh_shared.text(state.lanes[lane].label, layout.labelRight, y0 + lane * cellH + 16, 10, colors.muted, "right");
    for (step = 0; step < state.stepCount; step += 1) {
      x = x0 + step * cellW;
      y = y0 + lane * cellH;
      cell = state.sources[selectedSource][lane][step];
      if (cell.enabled) {
        ksh_shared.sourceCellBackground(
          x + 2,
          y + 2,
          cellW - 4,
          cellH - 4,
          cell.gateMode,
          colors.edit,
          colors.editLight
        );
        ksh_shared.text(String(cell.velocity), x + cellW / 2, y + 14, 9, colors.off, "center");
      } else {
        ksh_shared.rect(x + 2, y + 2, cellW - 4, cellH - 4, colors.off);
      }
      ksh_shared.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4, selectedLane === lane && selectedStep === step ? colors.text : colors.strokeSoft, 1);
      ksh_shared.zone(hitZones, "source_cell", x + 2, y + 2, cellW - 4, cellH - 4, { lane: lane, step: step });
    }
  }
}

function drawGeneratedGrid() {
  var layout = uiLayout();
  var x0 = layout.gridX0;
  var y0 = layout.generatedGridY0;
  var cellW = GRID_CELL_W;
  var cellH = GRID_CELL_H;
  var lane;
  var step;
  var x;
  var y;
  var cell;

  ksh_shared.text("Generated Pattern", x0, layout.generatedTitleY, 13, colors.text);
  drawStepNumberLabels(x0, cellW, layout.generatedStepY);

  for (lane = 0; lane < state.laneCount; lane += 1) {
    ksh_shared.text(state.lanes[lane].label, layout.labelRight, y0 + lane * cellH + 16, 10, colors.muted, "right");
    for (step = 0; step < state.stepCount; step += 1) {
      x = x0 + step * cellW;
      y = y0 + lane * cellH;
      cell = previewData && previewData.generated && previewData.generated[lane] ? previewData.generated[lane][step] : null;
      ksh_shared.rect(x + 2, y + 2, cellW - 4, cellH - 4, cell && cell.enabled ? colors.generated : colors.off);
      ksh_shared.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4, colors.strokeSoft, 1);
      if (cell && cell.enabled) {
        ksh_shared.text(String(cell.velocity), x + cellW / 2, y + 14, 9, colors.off, "center");
      }
    }
  }
}

function drawCellEditor() {
  var layout = uiLayout();
  var x = layout.editorX;
  var y = layout.editorY;
  var cell = state.sources[selectedSource][selectedLane][selectedStep];

  ksh_shared.rect(x, y, layout.editorW, 248, colors.panel);
  ksh_shared.text("Cell Editor", x + 14, y + 22, 13, colors.text);

  ksh_shared.button(hitZones, "cell_enabled", cell.enabled ? "On" : "Off", x + 14, y + 44, 62, 28, cell.enabled);
  ksh_shared.button(hitZones, "gate", "Always", x + 14, y + 86, 72, 26, cell.gateMode === "always", { gate: "always" });
  ksh_shared.button(hitZones, "gate", "Probability", x + 94, y + 86, 96, 26, cell.gateMode === "random", { gate: "random" });
  ksh_shared.button(hitZones, "gate", "Cycle", x + 198, y + 86, 70, 26, cell.gateMode === "cycle", { gate: "cycle" });
  ksh_shared.valueBox(hitZones, "velocity", "Velocity", cell.velocity, x + 14, y + 138, 104, 30, 13);
  ksh_shared.valueBox(hitZones, "random", "Probability %", cell.random, x + 14, y + 194, 112, 30, 13);
  ksh_shared.valueBox(hitZones, "cycle", "Every N", cell.cycle, x + 146, y + 194, 104, 30, 13);
}

function drawFooter() {
  var layout = uiLayout();

  ksh_shared.rect(0, layout.footerY, WIDTH, 28, colors.panel2);
  ksh_shared.text("Click source cells to toggle. Shift-click to select only. Drag horizontally to paint, vertically for velocity.", 18, layout.footerY + 16, 10, colors.muted);
}

function send() {
  var args = arrayfromargs(arguments);
  outlet.apply(this, [0].concat(args));
  if (args[0] !== "open_editor" && typeof messnamed === "function") {
    messnamed.apply(this, ["ksh_engine_commands"].concat(args));
  }
}

function sendLane(lane) {
  send("channel_label", lane + 1, state.lanes[lane].label);
  send("channel_note", lane + 1, state.lanes[lane].note);
  if (state.lanes[lane].lock < 0) {
    send("channel_lock", lane + 1, "random");
  } else {
    send("channel_lock", lane + 1, state.lanes[lane].lock + 1);
  }
}

function sendCell(source, lane, step) {
  var cell = state.sources[source][lane][step];
  var value = cell.gateMode === "cycle" ? cell.cycle : cell.random;
  send("cell", source + 1, lane + 1, step + 1, cell.enabled, cell.velocity, cell.gateMode, value);
}

function sync_all() {
  rememberUiContext.call(this);
  applyEditorSize();
  send("request_state");
  send("snapshot");
  mgraphics.redraw();
}

function loadbang() {
  rememberUiContext.call(this);
  sync_all.call(this);
}

function init() {
  rememberUiContext.call(this);
  sync_all.call(this);
}

function open() {
  rememberUiContext.call(this);
  sync_all.call(this);
}

function onresize(width, height) {
  WIDTH = width;
  HEIGHT = height;
  mgraphics.redraw();
}

function sourceStepFromX(x) {
  var layout = uiLayout();

  return ksh_shared.clamp(
    Math.floor((x - layout.gridX0) / GRID_CELL_W),
    0,
    state.stepCount - 1
  );
}

function applySourcePaintRange(fromStep, toStep) {
  var lo;
  var hi;
  var step;
  var cell;
  var changed;

  if (!velocityDrag || velocityDrag.mode !== "paint") {
    return;
  }

  lo = Math.min(fromStep, toStep);
  hi = Math.max(fromStep, toStep);
  changed = false;

  for (step = lo; step <= hi; step += 1) {
    cell = state.sources[selectedSource][velocityDrag.lane][step];
    if (cell.enabled !== velocityDrag.paintEnabled) {
      cell.enabled = velocityDrag.paintEnabled;
      sendCell(selectedSource, velocityDrag.lane, step);
      changed = true;
    }
  }

  if (changed) {
    selectedStep = toStep;
    mgraphics.redraw();
  }
}

function beginSourceCellInteraction(z, x, y, selectOnly) {
  var cell;

  selectedLane = z.data.lane;
  selectedStep = z.data.step;
  cell = state.sources[selectedSource][selectedLane][selectedStep];
  velocityDrag = {
    lane: selectedLane,
    step: selectedStep,
    startX: x,
    startY: y,
    startVelocity: cell.velocity,
    paintEnabled: cell.enabled ? 0 : 1,
    mode: null,
    moved: false,
    selectOnly: selectOnly ? 1 : 0
  };
}

function applySourceCellDrag(x, y) {
  var dx;
  var dy;
  var step;

  if (!velocityDrag) {
    return;
  }

  dx = x - velocityDrag.startX;
  dy = y - velocityDrag.startY;

  if (!velocityDrag.mode) {
    if (
      !velocityDrag.selectOnly &&
      Math.abs(dx) >= SOURCE_PAINT_DRAG_THRESHOLD &&
      Math.abs(dx) > Math.abs(dy)
    ) {
      velocityDrag.mode = "paint";
      velocityDrag.moved = true;
      applySourcePaintRange(velocityDrag.step, sourceStepFromX(x));
    } else if (Math.abs(dy) >= VELOCITY_DRAG_THRESHOLD) {
      velocityDrag.mode = "velocity";
      applyVelocityDrag(y);
    }
    return;
  }

  if (velocityDrag.mode === "paint") {
    step = sourceStepFromX(x);
    applySourcePaintRange(velocityDrag.step, step);
  } else {
    applyVelocityDrag(y);
  }
}

function applyVelocityDrag(y) {
  var cell;
  var delta;
  var nextVelocity;

  if (!velocityDrag || velocityDrag.mode === "paint") {
    return;
  }

  if (!velocityDrag.mode) {
    velocityDrag.mode = "velocity";
  }

  delta = velocityDrag.startY - y;
  if (Math.abs(delta) < VELOCITY_DRAG_THRESHOLD) {
    return;
  }

  velocityDrag.moved = true;
  cell = state.sources[selectedSource][velocityDrag.lane][velocityDrag.step];
  if (cell.gateMode !== "always") {
    return;
  }

  if (!cell.enabled) {
    cell.enabled = 1;
  }

  nextVelocity = ksh_shared.clamp(
    velocityDrag.startVelocity + Math.round(delta / VELOCITY_DRAG_SCALE),
    1,
    127
  );
  if (cell.velocity !== nextVelocity) {
    cell.velocity = nextVelocity;
    sendCell(selectedSource, velocityDrag.lane, velocityDrag.step);
    mgraphics.redraw();
  }
}

function endSourceCellInteraction() {
  var cell;

  if (!velocityDrag) {
    return;
  }

  cell = state.sources[selectedSource][velocityDrag.lane][velocityDrag.step];
  if (!velocityDrag.moved && !velocityDrag.selectOnly) {
    cell.enabled = cell.enabled ? 0 : 1;
    sendCell(selectedSource, velocityDrag.lane, velocityDrag.step);
  }

  velocityDrag = null;
  mgraphics.redraw();
}

function engine_state(json) {
  var engineState;

  if (typeof json !== "string") {
    json = arrayfromargs(arguments).join(" ");
  }

  try {
    engineState = JSON.parse(json);
    ksh_shared.applyEngineState(state, engineState);
    selectedLane = ksh_shared.clamp(selectedLane, 0, state.laneCount - 1);
    selectedStep = ksh_shared.clamp(selectedStep, 0, state.stepCount - 1);
    applyEditorSize();
    mgraphics.redraw();
  } catch (error) {}
}

function onclick(x, y, button, cmd, shift, capslock, option, ctrl) {
  var z = ksh_shared.findZone(hitZones, x, y);
  var cell;

  rememberUiContext.call(this);

  if (!z) {
    if (button === 0) {
      endSourceCellInteraction();
    }
    editingLabel = false;
    mgraphics.redraw();
    return;
  }

  if (button === 0 && velocityDrag && z.id !== "source_cell") {
    endSourceCellInteraction();
  }

  if (z.id !== "lane_select") {
    editingLabel = false;
  }

  if (z.id === "source_pick") {
    selectedSource = z.data.source;
  } else if (z.id === "mode") {
    state.generationMode = state.generationMode === "stack" ? "per_channel" : "stack";
    send("mode", state.generationMode);
  } else if (z.id === "rate") {
    ksh_shared.cycleRate(state, shift ? -1 : 1);
    send("rate", state.rate);
  } else if (z.id === "source_cell") {
    if (button === 0) {
      endSourceCellInteraction();
    } else {
      beginSourceCellInteraction(z, x, y, shift);
    }
  } else if (z.id === "lane_select") {
    selectedLane = z.data.lane;
    editingLabel = true;
  } else if (z.id === "lane_note") {
    selectedLane = z.data.lane;
    state.lanes[selectedLane].note = ksh_shared.clamp(state.lanes[selectedLane].note + (shift ? -1 : 1), 0, 127);
    sendLane(selectedLane);
  } else if (z.id === "lane_lock") {
    selectedLane = z.data.lane;
    state.lanes[selectedLane].lock += 1;
    if (state.lanes[selectedLane].lock >= SOURCE_COUNT) {
      state.lanes[selectedLane].lock = -1;
    }
    sendLane(selectedLane);
  } else if (z.id === "cell_enabled") {
    cell = state.sources[selectedSource][selectedLane][selectedStep];
    cell.enabled = cell.enabled ? 0 : 1;
    sendCell(selectedSource, selectedLane, selectedStep);
  } else if (z.id === "gate") {
    cell = state.sources[selectedSource][selectedLane][selectedStep];
    cell.gateMode = z.data.gate;
    sendCell(selectedSource, selectedLane, selectedStep);
  } else {
    handleStepper(z.id, shift ? -1 : 1);
  }

  mgraphics.redraw();
}

function ondrag(x, y, button) {
  if (!velocityDrag) {
    return;
  }

  if (button === 0) {
    endSourceCellInteraction();
    return;
  }

  applySourceCellDrag(x, y);
}

function handleStepper(id, direction) {
  var cell = state.sources[selectedSource][selectedLane][selectedStep];
  var delta;

  if (id === "steps_inc" || id === "steps_dec") {
    state.stepCount = ksh_shared.clamp(state.stepCount + (id === "steps_inc" ? 1 : -1), 1, MAX_STEPS);
    state.refreshSteps = ksh_shared.clamp(state.refreshSteps, 1, state.stepCount);
    send("steps", state.stepCount);
    send("refresh_steps", state.refreshSteps);
    applyEditorSize();
  } else if (id === "lanes_inc" || id === "lanes_dec") {
    state.laneCount = ksh_shared.clamp(state.laneCount + (id === "lanes_inc" ? 1 : -1), 1, MAX_LANES);
    selectedLane = ksh_shared.clamp(selectedLane, 0, state.laneCount - 1);
    send("channels", state.laneCount);
    applyEditorSize();
  } else if (id === "refresh_inc" || id === "refresh_dec") {
    state.refreshSteps = ksh_shared.clamp(state.refreshSteps + (id === "refresh_inc" ? 1 : -1), 1, state.stepCount);
    send("refresh_steps", state.refreshSteps);
  } else if (id === "swing_inc" || id === "swing_dec") {
    state.swing = ksh_shared.clamp(state.swing + (id === "swing_inc" ? 1 : -1), 0, 100);
    send("swing", state.swing);
  } else if (id === "midi_inc" || id === "midi_dec") {
    state.midiChannel = ksh_shared.clamp(state.midiChannel + (id === "midi_inc" ? 1 : -1), 1, 16);
    send("midi_channel", state.midiChannel);
  } else if (id === "duration_inc" || id === "duration_dec") {
    delta = id === "duration_inc" ? 10 : -10;
    state.noteDurationMs = ksh_shared.clamp(state.noteDurationMs + delta, 10, 5000);
    send("duration_ms", state.noteDurationMs);
  } else if (id === "velocity_inc" || id === "velocity_dec") {
    cell.velocity = ksh_shared.clamp(cell.velocity + (id === "velocity_inc" ? 1 : -1), 1, 127);
    sendCell(selectedSource, selectedLane, selectedStep);
  } else if (id === "random_inc" || id === "random_dec") {
    cell.random = ksh_shared.clamp(cell.random + (id === "random_inc" ? 1 : -1), 0, 100);
    sendCell(selectedSource, selectedLane, selectedStep);
  } else if (id === "cycle_inc" || id === "cycle_dec") {
    cell.cycle = ksh_shared.clamp(cell.cycle + (id === "cycle_inc" ? 1 : -1), 1, 64);
    sendCell(selectedSource, selectedLane, selectedStep);
  }
}

function applyIncomingCell(args) {
  var source;
  var lane;
  var stepIndex;
  var cell;

  source = ksh_shared.clamp(args[0] - 1, 0, SOURCE_COUNT - 1);
  lane = ksh_shared.clamp(args[1] - 1, 0, MAX_LANES - 1);
  stepIndex = ksh_shared.clamp(args[2] - 1, 0, MAX_STEPS - 1);
  cell = state.sources[source][lane][stepIndex];
  cell.enabled = parseInt(args[3], 10) !== 0 ? 1 : 0;
  cell.velocity = ksh_shared.clamp(args[4], 1, 127);
  cell.gateMode = String(args[5] || "always");
  if (cell.gateMode === "cycle") {
    cell.cycle = ksh_shared.clamp(args[6], 1, 64);
  } else {
    cell.random = ksh_shared.clamp(args[6], 0, 100);
  }
}

function onkeydown(key, modifiers, keycode) {
  var label;

  if (!editingLabel) {
    return;
  }

  label = state.lanes[selectedLane].label;
  if (keycode === 13 || keycode === 3) {
    editingLabel = false;
  } else if (keycode === 51 || keycode === 8) {
    label = label.substring(0, Math.max(0, label.length - 1));
  } else if (key && key.length === 1 && label.length < 12) {
    label += key;
  }

  state.lanes[selectedLane].label = label;
  sendLane(selectedLane);
  mgraphics.redraw();
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
  } else if (messagename === "open" || messagename === "front" || messagename === "init") {
    sync_all();
  } else if (messagename === "cell") {
    applyIncomingCell(arrayfromargs(arguments));
    mgraphics.redraw();
  } else if (messagename === "current_step") {
    playingStep = ksh_shared.clamp(arrayfromargs(arguments)[0], 0, MAX_STEPS);
    mgraphics.redraw();
  } else {
    rememberUiContext.call(this);
    ksh_shared.applyStatusMessage(state, messagename, arrayfromargs(arguments));
    if (messagename === "channels") {
      selectedLane = ksh_shared.clamp(selectedLane, 0, state.laneCount - 1);
      applyEditorSize();
    } else if (messagename === "steps") {
      applyEditorSize();
    }
    mgraphics.redraw();
  }
}

var activeStateTask = null;
var lastEditorActiveSent = null;
if (typeof Task === "function") {
  activeStateTask = new Task(function () {
    var visible = false;
    var value;

    if (this.patcher && this.patcher.wind) {
      visible = !!this.patcher.wind.visible;
      value = visible ? 1 : 0;
      // Only send when the editor's visibility actually changes; otherwise
      // we'd flood the engine (and the patch's named-message bus) with a
      // redundant editor_active + current_step every 500ms forever.
      if (value !== lastEditorActiveSent) {
        send("editor_active", value);
        lastEditorActiveSent = value;
      }
      if (visible && !editorWasVisible) {
        rememberUiContext.call(this);
        applyEditorSize();
      }
      editorWasVisible = visible;
    }
  }, this);
  activeStateTask.interval = 500;
  activeStateTask.repeat();
}
