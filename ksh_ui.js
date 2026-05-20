autowatch = 1;
inlets = 1;
outlets = 2;

include("ksh_ui_shared.js");

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

var WIDTH = 1040;
var HEIGHT = 520;
var MAX_STEPS = ksh_shared.MAX_STEPS;
var MAX_LANES = ksh_shared.MAX_LANES;
var SOURCE_COUNT = ksh_shared.SOURCE_COUNT;
var GRID_CELL_W = 25;
var GRID_CELL_H = 22;

function uiLayout() {
  var lanePanelX = 12;
  var lanePanelW = 158;
  var labelColW = 84;
  var gridX0 = lanePanelX + lanePanelW + labelColW;
  var gridW = state.stepCount * GRID_CELL_W;
  var visibleRows = state.laneCount;
  var mainTop = 68;
  var sectionTitleY = mainTop + 22;
  var sourceTitleY = sectionTitleY;
  var sourceStepY = sourceTitleY + 18;
  var sourceGridY0 = sourceStepY + 16;
  var sourceBlockH = visibleRows * GRID_CELL_H;
  var generatedTitleY = sourceGridY0 + sourceBlockH + 28;
  var generatedStepY = generatedTitleY + 18;
  var generatedGridY0 = generatedStepY + 14;
  var editorX = gridX0 + gridW + 24;
  var footerY = HEIGHT - 28;

  return {
    lanePanelX: lanePanelX,
    lanePanelW: lanePanelW,
    lanePanelTop: mainTop,
    lanePanelH: footerY - 68 - 8,
    labelRight: gridX0 - 10,
    gridX0: gridX0,
    gridW: gridW,
    sourceTitleY: sourceTitleY,
    sourceStepY: sourceStepY,
    sourceGridY0: sourceGridY0,
    generatedTitleY: generatedTitleY,
    generatedStepY: generatedStepY,
    generatedGridY0: generatedGridY0,
    editorX: editorX,
    editorY: mainTop,
    editorW: Math.max(260, WIDTH - editorX - 12),
    footerY: footerY
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
colors.generated = [0.36, 0.66, 0.95, 1];

var state = makeState();
var previewData = null;
var playingStep = 0;
var selectedSource = 0;
var selectedLane = 0;
var selectedStep = 0;
var hitZones = [];
var editingLabel = false;
var sourceDropdownOpen = false;
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
  drawSourceDropdownOverlay();
}

function drawHeader() {
  var x = 14;
  var modeX = 110;
  var durationX = WIDTH - 12 - 104;
  var midiX = durationX - 8 - 84;

  ksh_shared.rect(0, 0, WIDTH, 58, colors.panel2);

  ksh_shared.text("Source", x, 12, 10, colors.muted);
  ksh_shared.button(hitZones, "source_select", "SRC " + (selectedSource + 1) + " v", x, 18, 82, 25, sourceDropdownOpen);
  ksh_shared.button(hitZones, "mode", state.generationMode === "stack" ? "Stack" : "Per Lane", modeX, 18, 78, 25, false);
  ksh_shared.valueBox(hitZones, "steps", "Steps", state.stepCount, 202, 18, 78, 30, 13);
  ksh_shared.valueBox(hitZones, "lanes", "Lanes", state.laneCount, 294, 18, 78, 30, 13);
  ksh_shared.valueBox(hitZones, "refresh", "Refresh", state.refreshSteps, 386, 18, 84, 30, 13);
  ksh_shared.button(hitZones, "rate", state.rate, 484, 18, 62, 25, false);
  ksh_shared.valueBox(hitZones, "swing", "Swing", state.swing, 560, 18, 78, 30, 13);
  ksh_shared.valueBox(hitZones, "midi", "MIDI Ch", state.midiChannel, midiX, 18, 84, 30, 13);
  ksh_shared.valueBox(hitZones, "duration", "Dur ms", state.noteDurationMs, durationX, 18, 104, 30, 13);
}

function drawSourceDropdownOverlay() {
  var i;
  var x = 14;
  var y = 44;

  if (!sourceDropdownOpen) {
    return;
  }

  ksh_shared.rect(x, y, 82, 98, colors.panel2);
  ksh_shared.strokeRect(x, y, 82, 98, colors.stroke, 1);
  for (i = 0; i < SOURCE_COUNT; i += 1) {
    ksh_shared.rect(x + 3, y + 3 + i * 23, 76, 21, selectedSource === i ? colors.amber : colors.panel);
    ksh_shared.text("SRC " + (i + 1), x + 41, y + 18 + i * 23, 11, selectedSource === i ? colors.off : colors.text, "center");
    ksh_shared.zone(hitZones, "source_option", x + 3, y + 3 + i * 23, 76, 21, { source: i });
  }
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

  ksh_shared.text("Source Pattern", x0, layout.sourceTitleY, 13, colors.text);
  drawStepNumberLabels(x0, cellW, layout.sourceStepY);

  for (lane = 0; lane < state.laneCount; lane += 1) {
    ksh_shared.text(state.lanes[lane].label, layout.labelRight, y0 + lane * cellH + 16, 10, colors.muted, "right");
    for (step = 0; step < state.stepCount; step += 1) {
      x = x0 + step * cellW;
      y = y0 + lane * cellH;
      cell = state.sources[selectedSource][lane][step];
      active = cell.enabled ? colors.edit : colors.off;
      ksh_shared.rect(x + 2, y + 2, cellW - 4, cellH - 4, active);
      ksh_shared.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4, selectedLane === lane && selectedStep === step ? colors.text : colors.strokeSoft, 1);
      if (cell.enabled) {
        ksh_shared.text(cell.gateMode === "always" ? String(cell.velocity) : cell.gateMode.charAt(0).toUpperCase(), x + cellW / 2, y + 14, 9, colors.off, "center");
      }
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
  ksh_shared.text("SRC " + (selectedSource + 1) + " / " + state.lanes[selectedLane].label + " / Step " + (selectedStep + 1), x + 14, y + 44, 11, colors.muted);

  ksh_shared.button(hitZones, "cell_enabled", cell.enabled ? "On" : "Off", x + 14, y + 62, 62, 28, cell.enabled);
  ksh_shared.button(hitZones, "gate", "Always", x + 14, y + 104, 72, 26, cell.gateMode === "always", { gate: "always" });
  ksh_shared.button(hitZones, "gate", "Random", x + 94, y + 104, 78, 26, cell.gateMode === "random", { gate: "random" });
  ksh_shared.button(hitZones, "gate", "Cycle", x + 180, y + 104, 70, 26, cell.gateMode === "cycle", { gate: "cycle" });
  ksh_shared.valueBox(hitZones, "velocity", "Velocity", cell.velocity, x + 14, y + 156, 104, 30, 13);
  ksh_shared.valueBox(hitZones, "random", "Random %", cell.random, x + 14, y + 212, 112, 30, 13);
  ksh_shared.valueBox(hitZones, "cycle", "Every N", cell.cycle, x + 146, y + 212, 104, 30, 13);
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

function open() {
  sync_all();
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
    mgraphics.redraw();
  } catch (error) {}
}

function onclick(x, y, button, cmd, shift, capslock, option, ctrl) {
  var z = ksh_shared.findZone(hitZones, x, y);
  var cell;

  if (!z) {
    if (button === 0) {
      endSourceCellInteraction();
    }
    editingLabel = false;
    sourceDropdownOpen = false;
    mgraphics.redraw();
    return;
  }

  if (button === 0 && velocityDrag && z.id !== "source_cell") {
    endSourceCellInteraction();
  }

  if (z.id !== "lane_select") {
    editingLabel = false;
  }

  if (z.id === "source_select") {
    sourceDropdownOpen = !sourceDropdownOpen;
  } else if (z.id === "source_option") {
    selectedSource = z.data.source;
    sourceDropdownOpen = false;
  } else if (z.id === "mode") {
    sourceDropdownOpen = false;
    state.generationMode = state.generationMode === "stack" ? "per_channel" : "stack";
    send("mode", state.generationMode);
  } else if (z.id === "rate") {
    sourceDropdownOpen = false;
    ksh_shared.cycleRate(state, shift ? -1 : 1);
    send("rate", state.rate);
  } else if (z.id === "source_cell") {
    sourceDropdownOpen = false;
    if (button === 0) {
      endSourceCellInteraction();
    } else {
      beginSourceCellInteraction(z, x, y, shift);
    }
  } else if (z.id === "lane_select") {
    sourceDropdownOpen = false;
    selectedLane = z.data.lane;
    editingLabel = true;
  } else if (z.id === "lane_note") {
    sourceDropdownOpen = false;
    selectedLane = z.data.lane;
    state.lanes[selectedLane].note = ksh_shared.clamp(state.lanes[selectedLane].note + (shift ? -1 : 1), 0, 127);
    sendLane(selectedLane);
  } else if (z.id === "lane_lock") {
    sourceDropdownOpen = false;
    selectedLane = z.data.lane;
    state.lanes[selectedLane].lock += 1;
    if (state.lanes[selectedLane].lock >= SOURCE_COUNT) {
      state.lanes[selectedLane].lock = -1;
    }
    sendLane(selectedLane);
  } else if (z.id === "cell_enabled") {
    sourceDropdownOpen = false;
    cell = state.sources[selectedSource][selectedLane][selectedStep];
    cell.enabled = cell.enabled ? 0 : 1;
    sendCell(selectedSource, selectedLane, selectedStep);
  } else if (z.id === "gate") {
    sourceDropdownOpen = false;
    cell = state.sources[selectedSource][selectedLane][selectedStep];
    cell.gateMode = z.data.gate;
    sendCell(selectedSource, selectedLane, selectedStep);
  } else {
    sourceDropdownOpen = false;
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
  } else if (id === "lanes_inc" || id === "lanes_dec") {
    state.laneCount = ksh_shared.clamp(state.laneCount + (id === "lanes_inc" ? 1 : -1), 1, MAX_LANES);
    selectedLane = ksh_shared.clamp(selectedLane, 0, state.laneCount - 1);
    send("channels", state.laneCount);
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
    ksh_shared.applyStatusMessage(state, messagename, arrayfromargs(arguments));
    if (messagename === "channels") {
      selectedLane = ksh_shared.clamp(selectedLane, 0, state.laneCount - 1);
    }
    mgraphics.redraw();
  }
}

var activeStateTask = null;
if (typeof Task === "function") {
  activeStateTask = new Task(function () {
    if (this.patcher && this.patcher.wind) {
      send("editor_active", this.patcher.wind.visible ? 1 : 0);
    }
  }, this);
  activeStateTask.interval = 500;
  activeStateTask.repeat();
}
