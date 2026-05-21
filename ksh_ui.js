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
var GRID_SCALE = 2;
var GRID_CELL_W = 50;
var GRID_CELL_H = 44;
var ROW_HEADER_FONT_SIZE = 13;
var ROW_HEADER_ICON_RADIUS = 7;
var EDITOR_LAYOUT = {
  MAIN_TOP: 68,
  FOOTER_H: 28,
  FOOTER_GAP: 8,
  RIGHT_MARGIN: 12,
  PATTERN_MIN_RIGHT_PAD: 56,
  ROW_CONTROLS_X: 20,
  ROW_LABEL_W: 56,
  ROW_NOTE_W: 24,
  ROW_LOOP_W: 28,
  ROW_LOCK_W: 28,
  ROW_SHIFT_W: 10,
  ROW_MUTE_W: 18,
  ROW_CONTROL_GAP: 6,
  GRID_CONTROL_GAP: 8,
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

function rowControlsRight(scale) {
  return EDITOR_LAYOUT.ROW_CONTROLS_X +
    (EDITOR_LAYOUT.ROW_LABEL_W +
      EDITOR_LAYOUT.ROW_NOTE_W +
      EDITOR_LAYOUT.ROW_LOOP_W +
      EDITOR_LAYOUT.ROW_LOCK_W +
      EDITOR_LAYOUT.ROW_SHIFT_W * 2 +
      EDITOR_LAYOUT.ROW_MUTE_W +
      EDITOR_LAYOUT.ROW_CONTROL_GAP * 6) * scale;
}

function computeEditorDimensions() {
  var scale = GRID_SCALE;
  var cellH = GRID_CELL_H;
  var minGridX0 = rowControlsRight(scale) + EDITOR_LAYOUT.GRID_CONTROL_GAP * scale;
  var gridW = state.stepCount * GRID_CELL_W;
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
  var scale = GRID_SCALE;
  var mainTop = EDITOR_LAYOUT.MAIN_TOP;
  var sourceStepY = mainTop + EDITOR_LAYOUT.PATTERN_TOP_PAD + 22;
  var sourceGridY0 = sourceStepY + 16 * scale;
  var availableLeft = rowControlsRight(scale) + EDITOR_LAYOUT.GRID_CONTROL_GAP * scale;
  var availableRight = WIDTH - EDITOR_LAYOUT.RIGHT_MARGIN - EDITOR_LAYOUT.PATTERN_MIN_RIGHT_PAD * scale;
  var centeredGridX0 = Math.floor(availableLeft + (availableRight - availableLeft - dims.gridW) / 2);
  var gridX0 = Math.max(dims.minGridX0, centeredGridX0);

  return {
    rowControlsX: EDITOR_LAYOUT.ROW_CONTROLS_X,
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
colors.downbeatCellOff = [0.06, 0.065, 0.075, 1];
colors.mutedCellOff = [0.12, 0.13, 0.14, 1];
colors.inactiveCell = [0.075, 0.082, 0.095, 1];
colors.inactiveStroke = [0.16, 0.18, 0.21, 1];
colors.inactiveText = [0.36, 0.39, 0.43, 1];

var state = makeState();
var previewData = null;
var playingStep = 0;
var selectedSource = 0;
var selectedLane = 0;
var selectedStep = 0;
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
var headerValueDrag = null;
var rowLoopDrag = null;
var VELOCITY_DRAG_THRESHOLD = 4;
var HEADER_VALUE_DRAG_SCALE = 4;
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

function quantizedDragOffset(delta, scale, deadZone) {
  var sign;
  var activeDelta;

  if (Math.abs(delta) <= deadZone) {
    return 0;
  }

  sign = delta < 0 ? -1 : 1;
  activeDelta = Math.abs(delta) - deadZone;
  return sign * Math.round(activeDelta / scale);
}

function sourceLayerLabel(mode) {
  mode = normalizeSourceLayerMode(mode);
  if (mode === "cycle") {
    return "Cycle";
  }
  if (mode === "probability") {
    return "Probability";
  }
  return "Velocity";
}

function sourceLayerControlWidth() {
  var ext;

  mgraphics.select_font_face("Ableton Sans Medium");
  mgraphics.set_font_size(12);
  ext = mgraphics.text_measure("Probability");
  return Math.ceil(ext[0]) + 8;
}

function drawHeaderValueCell(id, label, value, x, y, w, h) {
  var active = headerValueDrag && headerValueDrag.id === id;

  ksh_shared.text(label, x, y - 6, 10, colors.muted);
  ksh_shared.rect(x, y, w, h, colors.panel2);
  ksh_shared.strokeRect(x, y, w, h, active ? colors.amber : colors.strokeSoft, 1);
  ksh_shared.text(String(value), x + w / 2, y + h / 2 + 4, 12, active ? colors.amber : colors.text, "center");
  ksh_shared.zone(hitZones, "header_value", x, y, w, h, { id: id });
}

function drawVerticalDivider(x, y, w, h) {
  ksh_shared.rect(x, y, w, h, colors.strokeSoft);
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
  drawFooter();
}

function drawHeader() {
  var i;
  var sourceX = 14;
  var sourceBtnW = 26;
  var sourceBtnGap = 2;
  var headerControlY = 18;
  var headerControlH = 25;
  var sourceEndX = sourceX + SOURCE_COUNT * (sourceBtnW + sourceBtnGap) - sourceBtnGap;
  var modeW = 78;
  var toggleW = 42;
  var toggleGap = 6;
  var onX = WIDTH - 12 - toggleW;
  var dcX = onX - toggleGap - toggleW;
  var layerW = sourceLayerControlWidth();
  var dividerW = 2;
  var dividerGap = 12;
  var groupedControlGap = 8;
  var sourceDividerX = sourceEndX + dividerGap;
  var stepsX = sourceDividerX + dividerW + dividerGap;
  var rateX = stepsX + sourceBtnW + groupedControlGap;
  var rightLayerDividerX = dcX - dividerGap - dividerW;
  var layerX = rightLayerDividerX - dividerGap - layerW;
  var leftLayerDividerX = layerX - dividerGap - dividerW;
  var refreshX = leftLayerDividerX - dividerGap - sourceBtnW;
  var modeX = refreshX - dividerGap - modeW;
  var rightHumanizeDividerX = modeX - dividerGap - dividerW;
  var timingHumanizeX = rightHumanizeDividerX - dividerGap - sourceBtnW;
  var velocityHumanizeX = timingHumanizeX - groupedControlGap - sourceBtnW;
  var swingX = velocityHumanizeX - groupedControlGap - sourceBtnW;
  var leftHumanizeDividerX = swingX - dividerGap - dividerW;
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

  drawVerticalDivider(sourceDividerX, 12, dividerW, 36);
  drawHeaderValueCell("steps", "Steps", state.stepCount, stepsX, headerControlY, sourceBtnW, headerControlH);
  ksh_shared.text("Step Value", rateX, 12, 10, colors.muted);
  ksh_shared.button(hitZones, "rate", state.rate, rateX, headerControlY, 62, headerControlH, false);
  drawVerticalDivider(leftHumanizeDividerX, 12, dividerW, 36);
  drawHeaderValueCell("swing", "Swing", state.swing, swingX, headerControlY, sourceBtnW, headerControlH);
  drawHeaderValueCell("velocity_humanize", "Vel %", state.velocityHumanize, velocityHumanizeX, headerControlY, sourceBtnW, headerControlH);
  drawHeaderValueCell("timing_humanize", "Time %", state.timingHumanize, timingHumanizeX, headerControlY, sourceBtnW, headerControlH);
  drawVerticalDivider(rightHumanizeDividerX, 12, dividerW, 36);
  ksh_shared.button(hitZones, "mode", ksh_shared.generationModeLabel(state.generationMode), modeX, headerControlY, modeW, headerControlH, false);
  drawHeaderValueCell("refresh", "Refresh", state.refreshSteps, refreshX, headerControlY, sourceBtnW, headerControlH);
  drawVerticalDivider(leftLayerDividerX, 12, dividerW, 36);
  ksh_shared.text("Layer", layerX, 12, 10, colors.muted);
  ksh_shared.rect(layerX, 18, layerW, 25, colors.panel2);
  ksh_shared.strokeRect(layerX, 18, layerW, 25, hoverLayerMode ? colors.amber : colors.strokeSoft, 1);
  ksh_shared.text(sourceLayerLabel(layerMode), layerX + layerW / 2, 18 + 16, 12, hoverLayerMode ? colors.amber : colors.text, "center");
  drawVerticalDivider(rightLayerDividerX, 12, dividerW, 36);
  ksh_shared.button(hitZones, "dc_colors", "DC", dcX, 18, toggleW, 25, dcColors);
  ksh_shared.button(hitZones, "device_active", "ON", onX, 18, toggleW, 25, state.deviceActive);
}

function rowHeaderTextY(y, h) {
  return y + h / 2 + ROW_HEADER_FONT_SIZE * 0.35;
}

function drawMuteCircle(cx, cy, r, muted) {
  mgraphics.new_path();
  mgraphics.arc(cx, cy, r, 0, Math.PI * 2);
  if (muted) {
    ksh_shared.setSourceRGBA(colors.amber);
    mgraphics.set_line_width(1.5);
    mgraphics.stroke();
  } else {
    ksh_shared.setSourceRGBA(colors.amber);
    mgraphics.fill();
  }
}

function drawShiftArrow(cx, cy, direction) {
  var w = 7;
  var h = 11;

  mgraphics.new_path();
  if (direction < 0) {
    mgraphics.move_to(cx - w / 2, cy);
    mgraphics.line_to(cx + w / 2, cy - h / 2);
    mgraphics.line_to(cx + w / 2, cy + h / 2);
  } else {
    mgraphics.move_to(cx + w / 2, cy);
    mgraphics.line_to(cx - w / 2, cy - h / 2);
    mgraphics.line_to(cx - w / 2, cy + h / 2);
  }
  mgraphics.close_path();
  ksh_shared.setSourceRGBA(colors.amber);
  mgraphics.fill();
}

function drawSourceRowControls(layout, lane, y, cellH, muted, scale) {
  var gap = EDITOR_LAYOUT.ROW_CONTROL_GAP * scale;
  var labelW = EDITOR_LAYOUT.ROW_LABEL_W * scale;
  var noteW = EDITOR_LAYOUT.ROW_NOTE_W * scale;
  var loopW = EDITOR_LAYOUT.ROW_LOOP_W * scale;
  var lockW = EDITOR_LAYOUT.ROW_LOCK_W * scale;
  var shiftW = EDITOR_LAYOUT.ROW_SHIFT_W * scale;
  var muteW = EDITOR_LAYOUT.ROW_MUTE_W * scale;
  var x = layout.rowControlsX;
  var noteX = x + labelW + gap;
  var loopX = noteX + noteW + gap;
  var lockX = loopX + loopW + gap;
  var shiftLeftX = lockX + lockW + gap;
  var shiftRightX = shiftLeftX + shiftW + gap;
  var muteX = shiftRightX + shiftW + gap;
  var textY = rowHeaderTextY(y, cellH);
  var lockLabel = state.lanes[lane].lock < 0 ? "R" : "S" + (state.lanes[lane].lock + 1);
  var loopActive = rowLoopDrag && rowLoopDrag.lane === lane;
  var zoneY = y + 2 * scale;
  var zoneH = cellH - 4 * scale;
  var iconY = y + cellH / 2;

  ksh_shared.text(state.lanes[lane].label, x, textY, ROW_HEADER_FONT_SIZE, muted ? colors.muted : colors.text);
  ksh_shared.text(String(state.lanes[lane].note), noteX + noteW / 2, textY, ROW_HEADER_FONT_SIZE, muted ? colors.muted : colors.blue, "center");
  ksh_shared.text("L" + state.lanes[lane].loopLength, loopX + loopW / 2, textY, ROW_HEADER_FONT_SIZE, loopActive ? colors.amber : muted ? colors.muted : colors.blue, "center");
  ksh_shared.text(lockLabel, lockX + lockW / 2, textY, ROW_HEADER_FONT_SIZE, muted ? colors.muted : colors.amber, "center");
  drawShiftArrow(shiftLeftX + shiftW / 2, iconY, -1);
  drawShiftArrow(shiftRightX + shiftW / 2, iconY, 1);
  drawMuteCircle(muteX + muteW / 2, iconY, ROW_HEADER_ICON_RADIUS, muted);

  ksh_shared.zone(hitZones, "lane_label", x, y, labelW, cellH, { lane: lane });
  ksh_shared.zone(hitZones, "lane_note", noteX, zoneY, noteW, zoneH, { lane: lane });
  ksh_shared.zone(hitZones, "lane_loop_length", loopX, zoneY, loopW, zoneH, { lane: lane });
  ksh_shared.zone(hitZones, "lane_lock", lockX, zoneY, lockW, zoneH, { lane: lane });
  ksh_shared.zone(hitZones, "source_row_shift", shiftLeftX, zoneY, shiftW, zoneH, { lane: lane, direction: -1 });
  ksh_shared.zone(hitZones, "source_row_shift", shiftRightX, zoneY, shiftW, zoneH, { lane: lane, direction: 1 });
  ksh_shared.zone(hitZones, "source_row_mute", muteX, y, muteW, cellH, { lane: lane });
}

function stepLabelColor(stepIndex) {
  return playingStep > 0 && stepIndex + 1 === playingStep ? colors.text : colors.muted;
}

function drawStepNumberLabels(x0, cellW, y) {
  var step;
  var scale = GRID_SCALE;

  for (step = 0; step < state.stepCount; step += 1) {
    ksh_shared.text(String(step + 1), x0 + step * cellW + cellW / 2, y, 10 * scale, stepLabelColor(step), "center");
  }
}

function drawSourceGrid() {
  var layout = uiLayout();
  var x0 = layout.gridX0;
  var y0 = layout.sourceGridY0;
  var layerMode = effectiveSourceLayerMode();
  var scale = GRID_SCALE;
  var cellW = GRID_CELL_W;
  var cellH = GRID_CELL_H;
  var cellPad = 2 * scale;
  var lane;
  var step;
  var x;
  var y;
  var cell;
  var muted;
  var offColor;
  var baseColor;
  var lightColor;
  var layerValue;
  var loopLength;
  var inactive;

  drawStepNumberLabels(x0, cellW, layout.sourceStepY);

  for (lane = 0; lane < state.laneCount; lane += 1) {
    muted = state.sourceChannelMutes[selectedSource] && state.sourceChannelMutes[selectedSource][lane];
    loopLength = ksh_shared.clamp(state.lanes[lane].loopLength, 1, state.stepCount);
    y = y0 + lane * cellH;
    drawSourceRowControls(layout, lane, y, cellH, muted, scale);
    for (step = 0; step < state.stepCount; step += 1) {
      x = x0 + step * cellW;
      cell = state.sources[selectedSource][lane][step];
      inactive = step >= loopLength;
      if (inactive) {
        ksh_shared.rect(x + cellPad, y + cellPad, cellW - cellPad * 2, cellH - cellPad * 2, colors.inactiveCell);
        if (cell.enabled) {
          ksh_shared.text(String(sourceLayerValue(cell, layerMode)), x + cellW / 2, y + 14 * scale, 9 * scale, colors.inactiveText, "center");
        }
      } else if (cell.enabled) {
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
        offColor = step % 4 === 0 ? colors.downbeatCellOff : colors.off;
        ksh_shared.rect(x + cellPad, y + cellPad, cellW - cellPad * 2, cellH - cellPad * 2, muted ? colors.mutedCellOff : offColor);
      }
      ksh_shared.strokeRect(x + cellPad, y + cellPad, cellW - cellPad * 2, cellH - cellPad * 2, inactive ? colors.inactiveStroke : selectedLane === lane && selectedStep === step ? colors.text : muted ? colors.muted : colors.strokeSoft, 1);
      if (!inactive) {
        ksh_shared.zone(hitZones, "source_cell", x + cellPad, y + cellPad, cellW - cellPad * 2, cellH - cellPad * 2, { lane: lane, step: step });
      }
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

function sendChannelLoopLength(lane) {
  send("channel_loop_length", lane + 1, state.lanes[lane].loopLength);
}

function selectSource(source) {
  selectedSource = ksh_shared.clamp(source, 0, SOURCE_COUNT - 1);
  state.staticSource = selectedSource;
  send("static_source", selectedSource + 1);
}

function resetSourceChannelRow(source, lane) {
  var step;

  state.sourceChannelMutes[source][lane] = 0;
  state.lanes[lane].loopLength = state.stepCount;
  for (step = 0; step < MAX_STEPS; step += 1) {
    state.sources[source][lane][step] = ksh_shared.defaultCell();
  }
  send("source_channel_reset", source + 1, lane + 1);
}

function shiftSourceChannelRow(lane, direction) {
  var source = selectedSource;
  var row = state.sources[source][lane];
  var shifted = [];
  var step;
  var fromStep;

  if (state.stepCount <= 1) {
    return;
  }

  for (step = 0; step < state.stepCount; step += 1) {
    fromStep = direction < 0 ?
      (step + 1) % state.stepCount :
      (step - 1 + state.stepCount) % state.stepCount;
    shifted[step] = ksh_shared.cloneCell(row[fromStep]);
  }

  for (step = 0; step < state.stepCount; step += 1) {
    row[step] = shifted[step];
    sendCell(source, lane, step);
  }
}

function showLaneLabelEdit(z, lane) {
  var editH = ROW_HEADER_FONT_SIZE + 8;
  var editY = z.y + (z.h - editH) / 2;

  editingLane = lane;
  selectedLane = lane;
  send("label_edit_set", state.lanes[lane].label);
  send(
    "label_edit_show",
    Math.round(z.x),
    Math.round(editY),
    Math.round(z.w),
    Math.round(editH)
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
  return zoneId === "lane_label";
}

// Detect rename in onclick; do not use jsui ondblclick (it suppresses onclick).
// Every click on a row label auditions the channel. A second click on the same
// label within LANE_RENAME_MS additionally opens the rename overlay; the
// audition is NOT swallowed by that detection.
function handleLaneLabelClick(z, button) {
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

function handleSourceRowMuteClick(z, button) {
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
  var loopLength;

  if (!velocityDrag || velocityDrag.mode !== "paint") {
    return;
  }

  lo = Math.min(fromStep, toStep);
  hi = Math.max(fromStep, toStep);
  loopLength = ksh_shared.clamp(state.lanes[velocityDrag.lane].loopLength, 1, state.stepCount);
  hi = Math.min(hi, loopLength - 1);
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
  var enabledChanged;

  if (!velocityDrag || velocityDrag.mode === "paint") {
    return;
  }

  if (!velocityDrag.mode) {
    velocityDrag.mode = "value";
  }

  velocityDrag.moved = true;
  cell = state.sources[selectedSource][velocityDrag.lane][velocityDrag.step];
  enabledChanged = !cell.enabled;
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

  delta = velocityDrag.startY - y;
  nextValue = ksh_shared.clamp(
    startValue + quantizedDragOffset(delta, scale, VELOCITY_DRAG_THRESHOLD),
    minValue,
    maxValue
  );
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
  } else if (enabledChanged) {
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

function headerValue(id) {
  if (id === "steps") {
    return state.stepCount;
  }
  if (id === "refresh") {
    return state.refreshSteps;
  }
  if (id === "swing") {
    return state.swing;
  }
  if (id === "velocity_humanize") {
    return state.velocityHumanize;
  }
  if (id === "timing_humanize") {
    return state.timingHumanize;
  }
  return 0;
}

function headerValueMin(id) {
  if (id === "swing" || id === "velocity_humanize" || id === "timing_humanize") {
    return 0;
  }
  return 1;
}

function headerValueMax(id) {
  if (id === "steps") {
    return MAX_STEPS;
  }
  if (id === "refresh") {
    return state.stepCount;
  }
  return 100;
}

function setHeaderValue(id, value) {
  var lane;

  value = ksh_shared.clamp(value, headerValueMin(id), headerValueMax(id));

  if (id === "steps" && state.stepCount !== value) {
    state.stepCount = value;
    state.refreshSteps = ksh_shared.clamp(state.refreshSteps, 1, state.stepCount);
    for (lane = 0; lane < MAX_LANES; lane += 1) {
      state.lanes[lane].loopLength = ksh_shared.clamp(state.lanes[lane].loopLength, 1, state.stepCount);
    }
    send("steps", state.stepCount);
    send("refresh_steps", state.refreshSteps);
    applyEditorSize();
  } else if (id === "refresh" && state.refreshSteps !== value) {
    state.refreshSteps = value;
    send("refresh_steps", state.refreshSteps);
  } else if (id === "swing" && state.swing !== value) {
    state.swing = value;
    send("swing", state.swing);
  } else if (id === "velocity_humanize" && state.velocityHumanize !== value) {
    state.velocityHumanize = value;
    send("velocity_humanize", state.velocityHumanize);
  } else if (id === "timing_humanize" && state.timingHumanize !== value) {
    state.timingHumanize = value;
    send("timing_humanize", state.timingHumanize);
  }
}

function beginHeaderValueInteraction(z, y) {
  headerValueDrag = {
    id: z.data.id,
    startY: y,
    startValue: headerValue(z.data.id)
  };
}

function applyHeaderValueDrag(y) {
  var delta;
  var nextValue;

  if (!headerValueDrag) {
    return;
  }

  delta = headerValueDrag.startY - y;
  nextValue = headerValueDrag.startValue + quantizedDragOffset(delta, HEADER_VALUE_DRAG_SCALE, VELOCITY_DRAG_THRESHOLD);
  setHeaderValue(headerValueDrag.id, nextValue);
  mgraphics.redraw();
}

function endHeaderValueInteraction() {
  if (!headerValueDrag) {
    return;
  }

  headerValueDrag = null;
  mgraphics.redraw();
}

function beginRowLoopInteraction(z, y) {
  selectedLane = z.data.lane;
  rowLoopDrag = {
    lane: selectedLane,
    startY: y,
    startValue: state.lanes[selectedLane].loopLength
  };
}

function setRowLoopLength(lane, value) {
  value = ksh_shared.clamp(value, 1, state.stepCount);
  if (state.lanes[lane].loopLength === value) {
    return;
  }

  state.lanes[lane].loopLength = value;
  if (selectedLane === lane && selectedStep >= value) {
    selectedStep = value - 1;
  }
  sendChannelLoopLength(lane);
}

function applyRowLoopDrag(y) {
  var delta;
  var nextValue;

  if (!rowLoopDrag) {
    return;
  }

  delta = rowLoopDrag.startY - y;
  nextValue = rowLoopDrag.startValue + quantizedDragOffset(delta, HEADER_VALUE_DRAG_SCALE, VELOCITY_DRAG_THRESHOLD);
  setRowLoopLength(rowLoopDrag.lane, nextValue);
  mgraphics.redraw();
}

function endRowLoopInteraction() {
  if (!rowLoopDrag) {
    return;
  }

  rowLoopDrag = null;
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
    selectedStep = ksh_shared.clamp(selectedStep, 0, ksh_shared.clamp(state.lanes[selectedLane].loopLength, 1, state.stepCount) - 1);
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
      endHeaderValueInteraction();
      endRowLoopInteraction();
    }
    mgraphics.redraw();
    return;
  }

  if (button === 0 && velocityDrag && z.id !== "source_cell") {
    endSourceCellInteraction();
  }
  if (button === 0 && rowLoopDrag && z.id !== "lane_loop_length") {
    endRowLoopInteraction();
  }

  if (z.id === "source_pick") {
    selectSource(z.data.source);
  } else if (z.id === "mode") {
    ksh_shared.cycleGenerationMode(state);
    send("mode", state.generationMode);
  } else if (z.id === "rate") {
    ksh_shared.cycleRate(state, shift ? -1 : 1);
    send("rate", state.rate);
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
  } else if (z.id === "header_value") {
    if (button === 0) {
      endHeaderValueInteraction();
    } else {
      beginHeaderValueInteraction(z, y);
    }
  } else if (z.id === "lane_loop_length") {
    if (button === 0) {
      endRowLoopInteraction();
    } else {
      beginRowLoopInteraction(z, y);
    }
  } else if (z.id === "source_row_mute") {
    handleSourceRowMuteClick(z, button);
  } else if (z.id === "source_row_shift") {
    if (button !== 0) {
      selectedLane = z.data.lane;
      shiftSourceChannelRow(z.data.lane, z.data.direction);
    }
  } else if (isLanePreviewZone(z.id)) {
    handleLaneLabelClick(z, button);
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
  }

  mgraphics.redraw();
}

function ondrag(x, y, button) {
  if (button === 0) {
    if (velocityDrag) {
      endSourceCellInteraction();
    }
    if (headerValueDrag) {
      endHeaderValueInteraction();
    }
    if (rowLoopDrag) {
      endRowLoopInteraction();
    }
    return;
  }

  if (headerValueDrag) {
    applyHeaderValueDrag(y);
    return;
  }

  if (rowLoopDrag) {
    applyRowLoopDrag(y);
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
      selectedStep = ksh_shared.clamp(selectedStep, 0, ksh_shared.clamp(state.lanes[selectedLane].loopLength, 1, state.stepCount) - 1);
      applyEditorSize();
    } else if (messagename === "channel_loop_length") {
      selectedStep = ksh_shared.clamp(selectedStep, 0, ksh_shared.clamp(state.lanes[selectedLane].loopLength, 1, state.stepCount) - 1);
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
