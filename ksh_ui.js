autowatch = 0;
inlets = 1;
outlets = 1;

include("ksh_ui_shared.js");

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

var MAX_STEPS = ksh_shared.MAX_STEPS;
var MAX_LANES = ksh_shared.MAX_LANES;
var DEFAULT_CHANNEL_COUNT = ksh_shared.constants.DEFAULT_CHANNEL_COUNT;
var DEFAULT_GENERATION_MODE = ksh_shared.constants.DEFAULT_GENERATION_MODE;
var SOURCE_COUNT = ksh_shared.SOURCE_COUNT;
var BASE_GRID_CELL_W = 25;
var BASE_GRID_CELL_H = 22;
var EDITOR_LAYOUT = {
  MAIN_TOP: 68,
  FOOTER_H: 28,
  FOOTER_GAP: 8,
  RIGHT_MARGIN: 12,
  PATTERN_MIN_RIGHT_PAD: 56,
  LANE_PANEL_X: 12,
  LANE_PANEL_W: 158,
  LABEL_COL_W: 84,
  PATTERN_TOP_PAD: 12,
  PATTERN_BOTTOM_PAD: 18,
  HEADER_MIN_WIDTH: 1160
};
var WIDTH = 968;
var HEIGHT = 352;
var uiPatcher = null;
var editorWasVisible = false;
var windowResizeTaskImmediate = null;
var windowResizeTaskSettle = null;

function computeEditorDimensions() {
  var scale = patternGridScale();
  var cellH = gridCellH();
  var minGridX0 = EDITOR_LAYOUT.LANE_PANEL_X + EDITOR_LAYOUT.LANE_PANEL_W + EDITOR_LAYOUT.LABEL_COL_W * scale;
  var gridW = state.stepCount * gridCellW();
  var minPatternRight = minGridX0 + gridW + EDITOR_LAYOUT.PATTERN_MIN_RIGHT_PAD * scale;
  var sourceGridY0 = EDITOR_LAYOUT.MAIN_TOP + EDITOR_LAYOUT.PATTERN_TOP_PAD + 22 + 18 * scale;
  var sourceBlockH = state.laneCount * cellH;
  var sourceBottom = sourceGridY0 + sourceBlockH + EDITOR_LAYOUT.PATTERN_BOTTOM_PAD;
  var footerY = sourceBottom + EDITOR_LAYOUT.FOOTER_GAP;
  var width = Math.max(
    EDITOR_LAYOUT.HEADER_MIN_WIDTH,
    minPatternRight + EDITOR_LAYOUT.RIGHT_MARGIN
  );

  return {
    width: width,
    height: footerY + EDITOR_LAYOUT.FOOTER_H,
    footerY: footerY,
    minGridX0: minGridX0,
    gridW: gridW
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
  var scale = patternGridScale();
  var cellH = gridCellH();
  var mainTop = EDITOR_LAYOUT.MAIN_TOP;
  var sourceStepY = mainTop + EDITOR_LAYOUT.PATTERN_TOP_PAD + 22;
  var sourceGridY0 = sourceStepY + 16 * scale;
  var availableLeft = EDITOR_LAYOUT.LANE_PANEL_X + EDITOR_LAYOUT.LANE_PANEL_W;
  var availableRight = WIDTH - EDITOR_LAYOUT.RIGHT_MARGIN - EDITOR_LAYOUT.PATTERN_MIN_RIGHT_PAD * scale;
  var centeredGridX0 = Math.floor(availableLeft + (availableRight - availableLeft - dims.gridW) / 2);
  var gridX0 = Math.max(dims.minGridX0, centeredGridX0);

  return {
    lanePanelX: EDITOR_LAYOUT.LANE_PANEL_X,
    lanePanelW: EDITOR_LAYOUT.LANE_PANEL_W,
    lanePanelTop: mainTop,
    lanePanelH: dims.footerY - mainTop - EDITOR_LAYOUT.FOOTER_GAP,
    labelRight: gridX0 - 10 * scale,
    gridX0: gridX0,
    gridW: dims.gridW,
    sourceStepY: sourceStepY,
    sourceGridY0: sourceGridY0,
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
colors.edit = [0.96, 0.62, 0.22, 1];
colors.editLight = [0.58, 0.80, 0.97, 1];
colors.mutedCellOff = [0.12, 0.13, 0.14, 1];

var state = makeState();
var previewData = null;
var playingStep = 0;
var selectedSource = 0;
var selectedLane = 0;
var selectedStep = 0;
var patternZoom2x = 1;
var dcColors = 1;
var sourceLayerMode = "velocity";
var hoverLayerMode = null;
var hitZones = [];
var editingLane = -1;
var lastLaneAuditionLane = -1;
var lastLaneAuditionAt = 0;
var LANE_AUDITION_DEBOUNCE_MS = 60;
var laneRenameTap = { lane: -1, at: 0 };
var sourceRowResetTap = { lane: -1, at: 0 };
var LANE_RENAME_MS = 450;
var velocityDrag = null;
var VELOCITY_DRAG_THRESHOLD = 4;
var SOURCE_PAINT_DRAG_THRESHOLD = 4;
var VELOCITY_DRAG_SCALE = 2;
var PROBABILITY_DRAG_SCALE = 2;
var CYCLE_DRAG_SCALE = 4;
var DC_LANE_COLORS = [
  [0.86, 0.25, 0.28, 1],
  [0.93, 0.55, 0.36, 1],
  [0.82, 0.66, 0.40, 1],
  [0.25, 0.68, 0.82, 1],
  [0.32, 0.72, 0.61, 1],
  [0.55, 0.72, 0.32, 1],
  [0.92, 0.68, 0.14, 1],
  [0.65, 0.43, 0.23, 1]
];
var DC_LANE_COLORS_LIGHT = [
  [0.96, 0.35, 0.38, 1],
  [1.00, 0.65, 0.46, 1],
  [0.92, 0.76, 0.50, 1],
  [0.35, 0.78, 0.92, 1],
  [0.42, 0.82, 0.71, 1],
  [0.65, 0.82, 0.42, 1],
  [1.00, 0.78, 0.24, 1],
  [0.75, 0.53, 0.33, 1]
];

function patternGridScale() {
  return patternZoom2x ? 2 : 1;
}

function gridCellW() {
  return BASE_GRID_CELL_W * patternGridScale();
}

function gridCellH() {
  return BASE_GRID_CELL_H * patternGridScale();
}

function sourceCellColor(lane, light) {
  if (!dcColors) {
    return light ? colors.editLight : colors.edit;
  }
  return (light ? DC_LANE_COLORS_LIGHT : DC_LANE_COLORS)[lane % DC_LANE_COLORS.length];
}

function mutedSourceCellColor(color) {
  var gray = (color[0] + color[1] + color[2]) / 3;

  return [
    gray * 0.56 + color[0] * 0.12,
    gray * 0.56 + color[1] * 0.12,
    gray * 0.56 + color[2] * 0.12,
    color[3]
  ];
}

function normalizeSourceLayerMode(mode) {
  mode = String(mode || "").toLowerCase();
  if (mode === "cycle") {
    return "cycle";
  }
  if (mode === "probability") {
    return "probability";
  }
  return "velocity";
}

function modifierLayerMode(shift, option) {
  if (option) {
    return "probability";
  }
  if (shift) {
    return "cycle";
  }
  return null;
}

function effectiveSourceLayerMode() {
  if (velocityDrag && velocityDrag.layerMode) {
    return velocityDrag.layerMode;
  }
  return hoverLayerMode || sourceLayerMode;
}

function setHoverLayerMode(mode) {
  mode = mode ? normalizeSourceLayerMode(mode) : null;
  if (hoverLayerMode !== mode) {
    hoverLayerMode = mode;
    mgraphics.redraw();
  }
}

function setSourceLayerMode(mode) {
  sourceLayerMode = normalizeSourceLayerMode(mode);
  hoverLayerMode = null;
  mgraphics.redraw();
}

function sourceLayerValue(cell, mode) {
  mode = normalizeSourceLayerMode(mode);
  if (mode === "cycle") {
    return cell.cycle;
  }
  if (mode === "probability") {
    return cell.probability;
  }
  return cell.velocity;
}

function sourceLayerLabel(mode) {
  mode = normalizeSourceLayerMode(mode);
  if (mode === "cycle") {
    return "2 Cycle";
  }
  if (mode === "probability") {
    return "3 Probability";
  }
  return "1 Velocity";
}

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

function makeSourceChannelMutes() {
  return ksh_shared.makeSourceChannelMutes();
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
    laneCount: DEFAULT_CHANNEL_COUNT,
    refreshSteps: 1,
    generationMode: DEFAULT_GENERATION_MODE,
    staticSource: 0,
    rate: "16n",
    swing: 0,
    velocityHumanize: 0,
    timingHumanize: 0,
    deviceActive: 1,
    lanes: lanes,
    sourceChannelMutes: makeSourceChannelMutes(),
    sources: sources
  };
}

function paint() {
  hitZones = [];
  ksh_shared.rect(0, 0, WIDTH, HEIGHT, colors.bg);
  drawHeader();
  drawSourceGrid();
  drawLaneControls();
  drawFooter();
}

function drawHeader() {
  var i;
  var sourceX = 14;
  var sourceBtnW = 26;
  var sourceBtnGap = 2;
  var modeX = sourceX + SOURCE_COUNT * (sourceBtnW + sourceBtnGap) - sourceBtnGap + 10;
  var toggleW = 42;
  var toggleGap = 6;
  var onX = WIDTH - 12 - toggleW;
  var zoomX = onX - toggleGap - toggleW;
  var dcX = zoomX - toggleGap - toggleW;
  var layerW = 132;
  var layerX = dcX - 8 - layerW;
  var layerMode = effectiveSourceLayerMode();

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

  ksh_shared.button(hitZones, "mode", ksh_shared.generationModeLabel(state.generationMode), modeX, 18, 78, 25, false);
  ksh_shared.valueBox(hitZones, "steps", "Steps", state.stepCount, modeX + 92, 18, 78, 30, 13);
  ksh_shared.valueBox(hitZones, "lanes", "Lanes", state.laneCount, modeX + 184, 18, 78, 30, 13);
  ksh_shared.valueBox(hitZones, "refresh", "Refresh", state.refreshSteps, modeX + 276, 18, 84, 30, 13);
  ksh_shared.button(hitZones, "rate", state.rate, modeX + 374, 18, 62, 25, false);
  ksh_shared.valueBox(hitZones, "swing", "Swing", state.swing, modeX + 450, 18, 78, 30, 13);
  ksh_shared.valueBox(hitZones, "velocity_humanize", "Vel Hum", state.velocityHumanize, modeX + 542, 18, 82, 30, 13);
  ksh_shared.valueBox(hitZones, "timing_humanize", "Time Hum", state.timingHumanize, modeX + 638, 18, 88, 30, 13);
  ksh_shared.text("Layer", layerX, 12, 10, colors.muted);
  ksh_shared.rect(layerX, 18, layerW, 25, colors.panel2);
  ksh_shared.strokeRect(layerX, 18, layerW, 25, hoverLayerMode ? colors.amber : colors.strokeSoft, 1);
  ksh_shared.text(sourceLayerLabel(layerMode), layerX + layerW / 2, 18 + 16, 12, hoverLayerMode ? colors.amber : colors.text, "center");
  ksh_shared.button(hitZones, "dc_colors", "DC", dcX, 18, toggleW, 25, dcColors);
  ksh_shared.button(hitZones, "pattern_zoom", "2x", zoomX, 18, toggleW, 25, patternZoom2x);
  ksh_shared.button(hitZones, "device_active", "ON", onX, 18, toggleW, 25, state.deviceActive);
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
    var labelX = layout.lanePanelX + 18;
    var labelW = Math.max(24, noteX - labelX - 4);

    y = listTop + lane * rowPitch;
    ksh_shared.rect(layout.lanePanelX + 12, y, layout.lanePanelW - 24, 23, colors.panel2);
    ksh_shared.strokeRect(layout.lanePanelX + 12, y, layout.lanePanelW - 24, 23, colors.strokeSoft, 1);
    ksh_shared.text(
      state.lanes[lane].label,
      layout.lanePanelX + 18,
      y + 15,
      10,
      colors.text
    );
    ksh_shared.text(String(state.lanes[lane].note), noteX + noteW / 2, y + 15, 10, colors.blue, "center");
    lockLabel = state.lanes[lane].lock < 0 ? "R" : "S" + (state.lanes[lane].lock + 1);
    ksh_shared.text(lockLabel, lockX + lockW / 2, y + 15, 10, colors.amber, "center");
    ksh_shared.zone(hitZones, "lane_select", selectX, y, selectW, 23, { lane: lane });
    ksh_shared.zone(hitZones, "lane_label", labelX, y + 2, labelW, 19, { lane: lane });
    ksh_shared.zone(hitZones, "lane_note", noteX, y, noteW, 23, { lane: lane });
    ksh_shared.zone(hitZones, "lane_lock", lockX, y, lockW, 23, { lane: lane });
  }
}

function stepLabelColor(stepIndex) {
  return playingStep > 0 && stepIndex + 1 === playingStep ? colors.text : colors.muted;
}

function drawStepNumberLabels(x0, cellW, y) {
  var step;
  var scale = patternGridScale();

  for (step = 0; step < state.stepCount; step += 1) {
    ksh_shared.text(String(step + 1), x0 + step * cellW + cellW / 2, y, 10 * scale, stepLabelColor(step), "center");
  }
}

function drawSourceGrid() {
  var layout = uiLayout();
  var x0 = layout.gridX0;
  var y0 = layout.sourceGridY0;
  var layerMode = effectiveSourceLayerMode();
  var scale = patternGridScale();
  var cellW = gridCellW();
  var cellH = gridCellH();
  var cellPad = 2 * scale;
  var lane;
  var step;
  var x;
  var y;
  var cell;
  var muted;
  var labelZoneW = EDITOR_LAYOUT.LABEL_COL_W * scale;
  var labelZoneX = layout.gridX0 - labelZoneW;
  var baseColor;
  var lightColor;
  var layerValue;

  drawStepNumberLabels(x0, cellW, layout.sourceStepY);

  for (lane = 0; lane < state.laneCount; lane += 1) {
    muted = state.sourceChannelMutes[selectedSource] && state.sourceChannelMutes[selectedSource][lane];
    y = y0 + lane * cellH;
    ksh_shared.text(state.lanes[lane].label, layout.labelRight, y + 16 * scale, 10 * scale, muted ? colors.text : colors.muted, "right");
    ksh_shared.zone(hitZones, "source_row_label", labelZoneX, y, labelZoneW - 4 * scale, cellH, { lane: lane });
    for (step = 0; step < state.stepCount; step += 1) {
      x = x0 + step * cellW;
      cell = state.sources[selectedSource][lane][step];
      if (cell.enabled) {
        layerValue = sourceLayerValue(cell, layerMode);
        baseColor = sourceCellColor(lane, 0);
        lightColor = sourceCellColor(lane, 1);
        if (muted) {
          baseColor = mutedSourceCellColor(baseColor);
          lightColor = mutedSourceCellColor(lightColor);
        }
        ksh_shared.sourceCellBackground(
          x + cellPad,
          y + cellPad,
          cellW - cellPad * 2,
          cellH - cellPad * 2,
          layerMode,
          baseColor,
          lightColor,
          layerValue
        );
        ksh_shared.text(String(layerValue), x + cellW / 2, y + 14 * scale, 9 * scale, muted ? colors.muted : colors.off, "center");
      } else {
        ksh_shared.rect(x + cellPad, y + cellPad, cellW - cellPad * 2, cellH - cellPad * 2, muted ? colors.mutedCellOff : colors.off);
      }
      ksh_shared.strokeRect(x + cellPad, y + cellPad, cellW - cellPad * 2, cellH - cellPad * 2, selectedLane === lane && selectedStep === step ? colors.text : muted ? colors.muted : colors.strokeSoft, 1);
      ksh_shared.zone(hitZones, "source_cell", x + cellPad, y + cellPad, cellW - cellPad * 2, cellH - cellPad * 2, { lane: lane, step: step });
    }
  }
}

function drawFooter() {
  var layout = uiLayout();

  ksh_shared.rect(0, layout.footerY, WIDTH, 28, colors.panel2);
  ksh_shared.text("Click cells to toggle; drag horizontally to paint; drag vertically to edit the active layer.", 18, layout.footerY + 16, 10, colors.muted);
}

// Messages handled inside the editor subpatcher (lane rename overlay).
// They must reach the patch wiring via `outlet` but must NOT be re-broadcast
// to ksh_engine_commands.
var LOCAL_OUTLET_MESSAGES = {
  open_editor: 1,
  label_edit_show: 1,
  label_edit_set: 1,
  label_edit_hide: 1
};

function send() {
  var args = arrayfromargs(arguments);
  outlet.apply(this, [0].concat(args));
  if (!LOCAL_OUTLET_MESSAGES[args[0]] && typeof messnamed === "function") {
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
  send("cell", source + 1, lane + 1, step + 1, cell.enabled, cell.velocity, cell.probability, cell.cycle);
}

function sendSourceChannelMute(source, lane) {
  send("source_channel_mute", source + 1, lane + 1, state.sourceChannelMutes[source][lane]);
}

function selectSource(source) {
  selectedSource = ksh_shared.clamp(source, 0, SOURCE_COUNT - 1);
  state.staticSource = selectedSource;
  send("static_source", selectedSource + 1);
}

function resetSourceChannelRow(source, lane) {
  var step;

  state.sourceChannelMutes[source][lane] = 0;
  for (step = 0; step < MAX_STEPS; step += 1) {
    state.sources[source][lane][step] = ksh_shared.defaultCell();
  }
  send("source_channel_reset", source + 1, lane + 1);
}

function showLaneLabelEdit(z, lane) {
  editingLane = lane;
  selectedLane = lane;
  send("label_edit_set", state.lanes[lane].label);
  send(
    "label_edit_show",
    Math.round(z.x),
    Math.round(z.y),
    Math.round(z.w),
    Math.round(z.h)
  );
}

function auditionLane(lane, keepLabelEditor) {
  if (!keepLabelEditor && editingLane >= 0) {
    send("label_edit_hide");
    editingLane = -1;
  }
  send("channel_audition", lane + 1);
}

// jsui may invoke onclick once per click (button 1) or on both press and release.
function auditionLaneOnce(lane, keepLabelEditor) {
  var now = Date.now();

  if (
    lastLaneAuditionLane === lane &&
    now - lastLaneAuditionAt < LANE_AUDITION_DEBOUNCE_MS
  ) {
    return;
  }

  lastLaneAuditionLane = lane;
  lastLaneAuditionAt = now;
  auditionLane(lane, keepLabelEditor);
}

function isLanePreviewZone(zoneId) {
  return zoneId === "lane_select" || zoneId === "lane_label";
}

// Detect rename in onclick; do not use jsui ondblclick (it suppresses onclick).
// Every click on a lane row auditions the channel. A second click on the same
// label within LANE_RENAME_MS additionally opens the rename overlay; the
// audition is NOT swallowed by that detection.
function handleLanePanelClick(z, button) {
  var lane = z.data.lane;
  var now = Date.now();
  var isRenameTap;

  if (button === 0) {
    return;
  }

  isRenameTap =
    z.id === "lane_label" &&
    laneRenameTap.lane === lane &&
    now - laneRenameTap.at <= LANE_RENAME_MS;

  auditionLaneOnce(lane, isRenameTap);

  if (isRenameTap) {
    laneRenameTap.lane = -1;
    laneRenameTap.at = 0;
    showLaneLabelEdit(z, lane);
    mgraphics.redraw();
    return;
  }

  laneRenameTap.lane = lane;
  laneRenameTap.at = now;
}

function handleSourceRowLabelClick(z, button) {
  var lane = z.data.lane;
  var now = Date.now();

  if (button === 0) {
    return;
  }

  if (sourceRowResetTap.lane === lane && now - sourceRowResetTap.at <= LANE_RENAME_MS) {
    sourceRowResetTap.lane = -1;
    sourceRowResetTap.at = 0;
    resetSourceChannelRow(selectedSource, lane);
    mgraphics.redraw();
    return;
  }

  sourceRowResetTap.lane = lane;
  sourceRowResetTap.at = now;
  selectedLane = lane;
  state.sourceChannelMutes[selectedSource][selectedLane] = state.sourceChannelMutes[selectedSource][selectedLane] ? 0 : 1;
  sendSourceChannelMute(selectedSource, selectedLane);
}

function sync_all() {
  rememberUiContext.call(this);
  applyEditorSize();
  // Make sure no stale rename overlay is left visible after a re-open.
  editingLane = -1;
  lastLaneAuditionLane = -1;
  lastLaneAuditionAt = 0;
  laneRenameTap.lane = -1;
  laneRenameTap.at = 0;
  sourceRowResetTap.lane = -1;
  sourceRowResetTap.at = 0;
  send("label_edit_hide");
  send("sync_all");
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
    Math.floor((x - layout.gridX0) / gridCellW()),
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

function beginSourceCellInteraction(z, x, y, layerMode) {
  var cell;

  selectedLane = z.data.lane;
  selectedStep = z.data.step;
  cell = state.sources[selectedSource][selectedLane][selectedStep];
  layerMode = layerMode || effectiveSourceLayerMode();
  velocityDrag = {
    lane: selectedLane,
    step: selectedStep,
    startX: x,
    startY: y,
    startVelocity: cell.velocity,
    startProbability: cell.probability,
    startCycle: cell.cycle,
    layerMode: layerMode,
    paintEnabled: cell.enabled ? 0 : 1,
    mode: null,
    moved: false
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
      Math.abs(dx) >= SOURCE_PAINT_DRAG_THRESHOLD &&
      Math.abs(dx) > Math.abs(dy)
    ) {
      velocityDrag.mode = "paint";
      velocityDrag.moved = true;
      applySourcePaintRange(velocityDrag.step, sourceStepFromX(x));
    } else if (Math.abs(dy) >= VELOCITY_DRAG_THRESHOLD) {
      velocityDrag.mode = "value";
      applySourceValueDrag(y);
    }
    return;
  }

  if (velocityDrag.mode === "paint") {
    step = sourceStepFromX(x);
    applySourcePaintRange(velocityDrag.step, step);
  } else {
    applySourceValueDrag(y);
  }
}

function applySourceValueDrag(y) {
  var cell;
  var delta;
  var nextValue;
  var layerMode;
  var scale;
  var minValue;
  var maxValue;
  var startValue;

  if (!velocityDrag || velocityDrag.mode === "paint") {
    return;
  }

  if (!velocityDrag.mode) {
    velocityDrag.mode = "value";
  }

  delta = velocityDrag.startY - y;
  if (Math.abs(delta) < VELOCITY_DRAG_THRESHOLD) {
    return;
  }

  velocityDrag.moved = true;
  cell = state.sources[selectedSource][velocityDrag.lane][velocityDrag.step];
  if (!cell.enabled) {
    cell.enabled = 1;
  }

  layerMode = normalizeSourceLayerMode(velocityDrag.layerMode);
  if (layerMode === "probability") {
    startValue = velocityDrag.startProbability;
    scale = PROBABILITY_DRAG_SCALE;
    minValue = 0;
    maxValue = 100;
  } else if (layerMode === "cycle") {
    startValue = velocityDrag.startCycle;
    scale = CYCLE_DRAG_SCALE;
    minValue = 1;
    maxValue = 64;
  } else {
    startValue = velocityDrag.startVelocity;
    scale = VELOCITY_DRAG_SCALE;
    minValue = 1;
    maxValue = 127;
  }

  nextValue = ksh_shared.clamp(startValue + Math.round(delta / scale), minValue, maxValue);
  if (layerMode === "probability" && cell.probability !== nextValue) {
    cell.probability = nextValue;
    sendCell(selectedSource, velocityDrag.lane, velocityDrag.step);
    mgraphics.redraw();
  } else if (layerMode === "cycle" && cell.cycle !== nextValue) {
    cell.cycle = nextValue;
    sendCell(selectedSource, velocityDrag.lane, velocityDrag.step);
    mgraphics.redraw();
  } else if (layerMode === "velocity" && cell.velocity !== nextValue) {
    cell.velocity = nextValue;
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
  if (!velocityDrag.moved) {
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
    selectedSource = ksh_shared.clamp(state.staticSource, 0, SOURCE_COUNT - 1);
    selectedLane = ksh_shared.clamp(selectedLane, 0, state.laneCount - 1);
    selectedStep = ksh_shared.clamp(selectedStep, 0, state.stepCount - 1);
    applyEditorSize();
    mgraphics.redraw();
  } catch (error) {
    ksh_shared.constants.debugPost("editor engine_state JSON failed", error);
  }
}

function onclick(x, y, button, cmd, shift, capslock, option, ctrl) {
  var z = ksh_shared.findZone(hitZones, x, y);

  rememberUiContext.call(this);

  if (!z) {
    if (button === 0) {
      endSourceCellInteraction();
    }
    mgraphics.redraw();
    return;
  }

  if (button === 0 && velocityDrag && z.id !== "source_cell") {
    endSourceCellInteraction();
  }

  if (z.id === "source_pick") {
    selectSource(z.data.source);
  } else if (z.id === "mode") {
    ksh_shared.cycleGenerationMode(state);
    send("mode", state.generationMode);
  } else if (z.id === "rate") {
    ksh_shared.cycleRate(state, shift ? -1 : 1);
    send("rate", state.rate);
  } else if (z.id === "pattern_zoom") {
    patternZoom2x = patternZoom2x ? 0 : 1;
    applyEditorSize();
  } else if (z.id === "dc_colors") {
    dcColors = dcColors ? 0 : 1;
  } else if (z.id === "device_active") {
    state.deviceActive = state.deviceActive ? 0 : 1;
    send("device_active", state.deviceActive);
  } else if (z.id === "source_cell") {
    if (button === 0) {
      endSourceCellInteraction();
    } else {
      beginSourceCellInteraction(z, x, y, modifierLayerMode(shift, option));
    }
  } else if (z.id === "source_row_label") {
    handleSourceRowLabelClick(z, button);
  } else if (isLanePreviewZone(z.id)) {
    handleLanePanelClick(z, button);
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
  } else {
    handleStepper(z.id);
  }

  mgraphics.redraw();
}

function ondrag(x, y, button) {
  if (button === 0) {
    if (velocityDrag) {
      endSourceCellInteraction();
    }
    return;
  }

  if (!velocityDrag) {
    return;
  }

  applySourceCellDrag(x, y);
}

function onidle(x, y, button, cmd, shift, capslock, option, ctrl) {
  setHoverLayerMode(modifierLayerMode(shift, option));
}

function onidleout(x, y, button, cmd, shift, capslock, option, ctrl) {
  setHoverLayerMode(null);
}

function onkeydown(keycode, textcharacter, updown, cmd, shift, capslock, option, ctrl) {
  var key = textcharacter || keycode;

  if (updown === 0) {
    return 0;
  }

  if (key === 49 || key === "1") {
    setSourceLayerMode("velocity");
    return 1;
  }
  if (key === 50 || key === "2") {
    setSourceLayerMode("cycle");
    return 1;
  }
  if (key === 51 || key === "3") {
    setSourceLayerMode("probability");
    return 1;
  }

  return 0;
}

function source_layer_mode(mode) {
  setSourceLayerMode(mode);
}

// Receives the committed text from the textedit overlay (Enter pressed).
function label_edit_done() {
  var args = arrayfromargs(arguments);
  var lane = editingLane;
  var text;

  editingLane = -1;
  send("label_edit_hide");

  if (lane < 0) {
    return;
  }

  text = args.join(" ").replace(/^\s+|\s+$/g, "");
  if (!text) {
    text = ksh_shared.defaultLabels[lane] || String(lane + 1);
  }

  state.lanes[lane].label = text;
  send("channel_label", lane + 1, text);
  mgraphics.redraw();
}

function handleStepper(id) {
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
  } else if (id === "velocity_humanize_inc" || id === "velocity_humanize_dec") {
    state.velocityHumanize = ksh_shared.clamp(state.velocityHumanize + (id === "velocity_humanize_inc" ? 1 : -1), 0, 100);
    send("velocity_humanize", state.velocityHumanize);
  } else if (id === "timing_humanize_inc" || id === "timing_humanize_dec") {
    state.timingHumanize = ksh_shared.clamp(state.timingHumanize + (id === "timing_humanize_inc" ? 1 : -1), 0, 100);
    send("timing_humanize", state.timingHumanize);
  }
}

function preview(json) {
  if (typeof json !== "string") {
    json = arrayfromargs(arguments).join(" ");
  }
  try {
    previewData = JSON.parse(json);
    mgraphics.redraw();
  } catch (error) {
    ksh_shared.constants.debugPost("editor preview JSON failed", error);
  }
}

function anything() {
  if (messagename === "preview") {
    preview.apply(this, arrayfromargs(arguments));
  } else if (messagename === "engine_state") {
    engine_state.apply(this, arrayfromargs(arguments));
  } else if (messagename === "open" || messagename === "front" || messagename === "init") {
    sync_all();
  } else if (messagename === "current_step") {
    playingStep = ksh_shared.clamp(arrayfromargs(arguments)[0], 0, MAX_STEPS);
    mgraphics.redraw();
  } else {
    rememberUiContext.call(this);
    ksh_shared.applyStatusMessage(state, messagename, arrayfromargs(arguments));
    if (messagename === "static_source") {
      selectedSource = ksh_shared.clamp(state.staticSource, 0, SOURCE_COUNT - 1);
    }
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
