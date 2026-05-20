autowatch = 1;
inlets = 1;
outlets = 2;

include("ksh_ui_shared.js");

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

var WIDTH = 880;
var HEIGHT = 420;
var MAX_STEPS = ksh_shared.MAX_STEPS;
var MAX_LANES = ksh_shared.MAX_LANES;
var SOURCE_COUNT = ksh_shared.SOURCE_COUNT;
var VISIBLE_LANES = MAX_LANES;

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
var selectedSource = 0;
var selectedLane = 0;
var selectedStep = 0;
var laneOffset = 0;
var hitZones = [];
var editingLabel = false;
var sourceDropdownOpen = false;

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

function clampLaneOffset() {
  var maxOffset = Math.max(0, state.laneCount - VISIBLE_LANES);
  laneOffset = ksh_shared.clamp(laneOffset, 0, maxOffset);
  if (selectedLane < laneOffset) {
    laneOffset = selectedLane;
  } else if (selectedLane >= laneOffset + VISIBLE_LANES) {
    laneOffset = selectedLane - VISIBLE_LANES + 1;
  }
  laneOffset = ksh_shared.clamp(laneOffset, 0, maxOffset);
}

function drawHeader() {
  var x = 172;

  ksh_shared.rect(0, 0, WIDTH, 58, colors.panel2);
  ksh_shared.text("Kick Snare Hat", 14, 24, 17, colors.text);
  ksh_shared.text("source-constrained drum sequencer", 14, 44, 10, colors.muted);

  ksh_shared.text("Source", x, 12, 10, colors.muted);
  ksh_shared.button(hitZones, "source_select", "SRC " + (selectedSource + 1) + " v", x, 18, 82, 25, sourceDropdownOpen);
  ksh_shared.button(hitZones, "mode", state.generationMode === "stack" ? "Stack" : "Per Lane", 268, 18, 78, 25, false);
  ksh_shared.valueBox(hitZones, "steps", "Steps", state.stepCount, 360, 18, 78, 30, 13);
  ksh_shared.valueBox(hitZones, "lanes", "Lanes", state.laneCount, 452, 18, 78, 30, 13);
  ksh_shared.valueBox(hitZones, "refresh", "Refresh", state.refreshSteps, 544, 18, 84, 30, 13);
  ksh_shared.button(hitZones, "rate", state.rate, 642, 18, 62, 25, false);
  ksh_shared.valueBox(hitZones, "swing", "Swing", state.swing, 718, 18, 78, 30, 13);
}

function drawSourceDropdownOverlay() {
  var i;
  var x = 172;
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
  var row;
  var y;
  var lockLabel;
  var maxOffset;
  var thumbY;
  var thumbH;

  clampLaneOffset();
  ksh_shared.rect(12, 78, 142, 306, colors.panel);
  ksh_shared.text("Lanes", 24, 100, 13, colors.text);
  ksh_shared.button(hitZones, "lane_scroll_up", "^", 112, 84, 24, 20, false);
  ksh_shared.button(hitZones, "lane_scroll_down", "v", 112, 110, 24, 20, false);

  maxOffset = Math.max(0, state.laneCount - VISIBLE_LANES);
  ksh_shared.rect(144, 112, 6, 55, colors.panel2);
  if (maxOffset > 0) {
    thumbH = Math.max(14, 55 * (VISIBLE_LANES / state.laneCount));
    thumbY = 112 + (55 - thumbH) * (laneOffset / maxOffset);
  } else {
    thumbH = 55;
    thumbY = 112;
  }
  ksh_shared.rect(144, thumbY, 6, thumbH, colors.amber);
  ksh_shared.zone(hitZones, "lane_scroll_track", 140, 112, 14, 55);

  for (row = 0; row < VISIBLE_LANES; row += 1) {
    lane = laneOffset + row;
    if (lane >= state.laneCount) {
      break;
    }
    y = 112 + row * 28;
    ksh_shared.rect(24, y, 118, 23, lane === selectedLane ? [0.27, 0.29, 0.33, 1] : colors.panel2);
    ksh_shared.strokeRect(24, y, 118, 23, colors.strokeSoft, 1);
    ksh_shared.text(state.lanes[lane].label, 32, y + 15, 10, colors.text);
    ksh_shared.text(String(state.lanes[lane].note), 92, y + 15, 10, colors.blue);
    lockLabel = state.lanes[lane].lock < 0 ? "R" : "S" + (state.lanes[lane].lock + 1);
    ksh_shared.text(lockLabel, 124, y + 15, 10, colors.amber, "center");
    ksh_shared.zone(hitZones, "lane_select", 24, y, 62, 23, { lane: lane });
    ksh_shared.zone(hitZones, "lane_note", 88, y, 26, 23, { lane: lane });
    ksh_shared.zone(hitZones, "lane_lock", 114, y, 28, 23, { lane: lane });
  }

  ksh_shared.text("Showing " + (laneOffset + 1) + "-" + Math.min(state.laneCount, laneOffset + VISIBLE_LANES) + " of " + state.laneCount, 24, 184, 10, colors.muted);
}

function drawSourceGrid() {
  var x0 = 178;
  var y0 = 82;
  var cellW = 25;
  var cellH = 20;
  var lane;
  var step;
  var x;
  var y;
  var cell;
  var active;
  var row;

  clampLaneOffset();
  ksh_shared.text("Source Pattern", x0, 70, 13, colors.text);
  for (step = 0; step < state.stepCount; step += 1) {
    ksh_shared.text(String(step + 1), x0 + step * cellW + cellW / 2, y0 - 10, 10, colors.muted, "center");
  }

  for (row = 0; row < VISIBLE_LANES; row += 1) {
    lane = laneOffset + row;
    if (lane >= state.laneCount) {
      break;
    }
    ksh_shared.text(state.lanes[lane].label, x0 - 12, y0 + row * cellH + 17, 10, colors.muted, "right");
    for (step = 0; step < state.stepCount; step += 1) {
      x = x0 + step * cellW;
      y = y0 + row * cellH;
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
  var x0 = 178;
  var y0 = 268;
  var cellW = 25;
  var cellH = 14;
  var lane;
  var step;
  var x;
  var y;
  var cell;
  var row;

  clampLaneOffset();
  ksh_shared.text("Generated Pattern", x0, 254, 13, colors.text);
  for (step = 0; step < state.stepCount; step += 1) {
    ksh_shared.text(String(step + 1), x0 + step * cellW + cellW / 2, y0 - 8, 10, colors.muted, "center");
  }

  for (row = 0; row < VISIBLE_LANES; row += 1) {
    lane = laneOffset + row;
    if (lane >= state.laneCount) {
      break;
    }
    ksh_shared.text(state.lanes[lane].label, x0 - 12, y0 + row * cellH + 14, 10, colors.muted, "right");
    for (step = 0; step < state.stepCount; step += 1) {
      x = x0 + step * cellW;
      y = y0 + row * cellH;
      cell = previewData && previewData.generated && previewData.generated[lane] ? previewData.generated[lane][step] : null;
      ksh_shared.rect(x + 2, y + 2, cellW - 4, cellH - 4, cell && cell.enabled ? colors.generated : colors.off);
      ksh_shared.strokeRect(x + 2, y + 2, cellW - 4, cellH - 4, colors.strokeSoft, 1);
      if (cell && cell.enabled) {
        ksh_shared.text(String(cell.velocity), x + cellW / 2, y + 11, 8, colors.off, "center");
      }
    }
  }
}

function drawCellEditor() {
  var x = 596;
  var y = 78;
  var cell = state.sources[selectedSource][selectedLane][selectedStep];

  ksh_shared.rect(x, y, 270, 236, colors.panel);
  ksh_shared.text("Cell Editor", x + 14, y + 24, 13, colors.text);
  ksh_shared.text("SRC " + (selectedSource + 1) + " / " + state.lanes[selectedLane].label + " / Step " + (selectedStep + 1), x + 14, y + 44, 11, colors.muted);

  ksh_shared.button(hitZones, "cell_enabled", cell.enabled ? "On" : "Off", x + 14, y + 62, 62, 28, cell.enabled);
  ksh_shared.valueBox(hitZones, "velocity", "Velocity", cell.velocity, x + 98, y + 62, 104, 30, 13);
  ksh_shared.button(hitZones, "gate", "Always", x + 14, y + 128, 72, 26, cell.gateMode === "always", { gate: "always" });
  ksh_shared.button(hitZones, "gate", "Random", x + 94, y + 128, 78, 26, cell.gateMode === "random", { gate: "random" });
  ksh_shared.button(hitZones, "gate", "Cycle", x + 180, y + 128, 70, 26, cell.gateMode === "cycle", { gate: "cycle" });
  ksh_shared.valueBox(hitZones, "random", "Random %", cell.random, x + 14, y + 184, 112, 30, 13);
  ksh_shared.valueBox(hitZones, "cycle", "Every N", cell.cycle, x + 146, y + 184, 104, 30, 13);
}

function drawFooter() {
  ksh_shared.rect(0, 396, WIDTH, 24, colors.panel2);
  ksh_shared.text("Click source cells to toggle/select. Shift-click +/- steps downward. Live transport drives playback.", 18, 412, 10, colors.muted);
  ksh_shared.valueBox(hitZones, "midi", "MIDI Ch", state.midiChannel, 596, 340, 84, 30, 13);
  ksh_shared.valueBox(hitZones, "duration", "Dur ms", state.noteDurationMs, 696, 340, 104, 30, 13);
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
    clampLaneOffset();
    mgraphics.redraw();
  } catch (error) {}
}

function onclick(x, y, button, cmd, shift, capslock, option, ctrl) {
  var z = ksh_shared.findZone(hitZones, x, y);
  var cell;

  if (!z) {
    editingLabel = false;
    sourceDropdownOpen = false;
    mgraphics.redraw();
    return;
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
    selectedLane = z.data.lane;
    selectedStep = z.data.step;
    cell = state.sources[selectedSource][selectedLane][selectedStep];
    cell.enabled = cell.enabled ? 0 : 1;
    sendCell(selectedSource, selectedLane, selectedStep);
  } else if (z.id === "lane_select") {
    sourceDropdownOpen = false;
    selectedLane = z.data.lane;
    clampLaneOffset();
    editingLabel = true;
  } else if (z.id === "lane_note") {
    sourceDropdownOpen = false;
    selectedLane = z.data.lane;
    clampLaneOffset();
    state.lanes[selectedLane].note = ksh_shared.clamp(state.lanes[selectedLane].note + (shift ? -1 : 1), 0, 127);
    sendLane(selectedLane);
  } else if (z.id === "lane_lock") {
    sourceDropdownOpen = false;
    selectedLane = z.data.lane;
    clampLaneOffset();
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
  } else if (z.id === "lane_scroll_up") {
    sourceDropdownOpen = false;
    laneOffset = ksh_shared.clamp(laneOffset - 1, 0, Math.max(0, state.laneCount - VISIBLE_LANES));
  } else if (z.id === "lane_scroll_down") {
    sourceDropdownOpen = false;
    laneOffset = ksh_shared.clamp(laneOffset + 1, 0, Math.max(0, state.laneCount - VISIBLE_LANES));
  } else if (z.id === "lane_scroll_track") {
    sourceDropdownOpen = false;
    laneOffset = y < 140 ? ksh_shared.clamp(laneOffset - VISIBLE_LANES, 0, Math.max(0, state.laneCount - VISIBLE_LANES)) : ksh_shared.clamp(laneOffset + VISIBLE_LANES, 0, Math.max(0, state.laneCount - VISIBLE_LANES));
  } else {
    sourceDropdownOpen = false;
    handleStepper(z.id, shift ? -1 : 1);
  }

  mgraphics.redraw();
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
    clampLaneOffset();
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

function onmousewheel(x, y, delta) {
  var maxScrollX = 178 + state.stepCount * 25;
  var maxScrollY = 78 + VISIBLE_LANES * 28;
  if (x >= 12 && x <= maxScrollX && y >= 78 && y <= maxScrollY) {
    laneOffset = ksh_shared.clamp(laneOffset + (delta < 0 ? 1 : -1), 0, Math.max(0, state.laneCount - VISIBLE_LANES));
    mgraphics.redraw();
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
  } else {
    ksh_shared.applyStatusMessage(state, messagename, arrayfromargs(arguments));
    if (messagename === "channels") {
      selectedLane = ksh_shared.clamp(selectedLane, 0, state.laneCount - 1);
      clampLaneOffset();
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
