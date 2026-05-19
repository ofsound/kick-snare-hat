autowatch = 1;
inlets = 1;
outlets = 2;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

var WIDTH = 880;
var HEIGHT = 420;
var MAX_STEPS = 16;
var MAX_LANES = 8;
var SOURCE_COUNT = 4;
var VISIBLE_LANES = MAX_LANES;

var colors = {
  bg: [0.16, 0.18, 0.21, 1],
  panel: [0.20, 0.23, 0.27, 1],
  panel2: [0.13, 0.15, 0.18, 1],
  stroke: [0.33, 0.37, 0.42, 1],
  strokeSoft: [0.25, 0.28, 0.32, 1],
  text: [0.86, 0.88, 0.90, 1],
  muted: [0.55, 0.59, 0.64, 1],
  amber: [0.96, 0.62, 0.22, 1],
  blue: [0.36, 0.66, 0.95, 1],
  green: [0.45, 0.76, 0.48, 1],
  off: [0.10, 0.11, 0.13, 1],
  edit: [0.96, 0.62, 0.22, 1],
  generated: [0.36, 0.66, 0.95, 1]
};

var rates = ["4n", "4nt", "8n", "8nt", "16n", "16nt", "32n", "32nt"];
var gateModes = ["always", "random", "cycle"];
var defaultLabels = ["Kick", "Snare", "Hat", "Open Hat", "Tom 1", "Tom 2", "Clap", "Ride"];
var defaultNotes = [36, 38, 42, 46, 41, 43, 45, 49];

var state = makeState();
var previewData = null;
var selectedSource = 0;
var selectedLane = 0;
var selectedStep = 0;
var laneOffset = 0;
var hitZones = [];
var editingLabel = false;
var sourceDropdownOpen = false;

function clamp(value, min, max) {
  value = parseInt(value, 10);
  if (isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function defaultCell() {
  return {
    enabled: 0,
    velocity: 100,
    gateMode: "always",
    random: 100,
    cycle: 1
  };
}

function cloneCell(cell) {
  return {
    enabled: cell && cell.enabled ? 1 : 0,
    velocity: clamp(cell && cell.velocity, 1, 127),
    gateMode: cell && cell.gateMode ? cell.gateMode : "always",
    random: clamp(cell && cell.random, 0, 100),
    cycle: clamp(cell && cell.cycle, 1, 64)
  };
}

function makeSource() {
  var source = [];
  var lane;
  var step;

  for (lane = 0; lane < MAX_LANES; lane += 1) {
    source[lane] = [];
    for (step = 0; step < MAX_STEPS; step += 1) {
      source[lane][step] = defaultCell();
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
      label: defaultLabels[i],
      note: defaultNotes[i],
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

function setSourceRGBA(color) {
  mgraphics.set_source_rgba(color[0], color[1], color[2], color[3]);
}

function rect(x, y, w, h, color) {
  setSourceRGBA(color);
  mgraphics.rectangle(x, y, w, h);
  mgraphics.fill();
}

function strokeRect(x, y, w, h, color, width) {
  setSourceRGBA(color);
  mgraphics.set_line_width(width || 1);
  mgraphics.rectangle(x, y, w, h);
  mgraphics.stroke();
}

function text(label, x, y, size, color, align) {
  var ext;

  setSourceRGBA(color || colors.text);
  mgraphics.select_font_face("Ableton Sans Medium");
  mgraphics.set_font_size(size || 12);
  ext = mgraphics.text_measure(label);
  if (align === "center") {
    x -= ext[0] / 2;
  } else if (align === "right") {
    x -= ext[0];
  }
  mgraphics.move_to(x, y);
  mgraphics.show_text(label);
}

function zone(id, x, y, w, h, data) {
  hitZones.push({ id: id, x: x, y: y, w: w, h: h, data: data || {} });
}

function button(id, label, x, y, w, h, active, data) {
  rect(x, y, w, h, active ? colors.amber : colors.panel2);
  strokeRect(x, y, w, h, active ? colors.amber : colors.strokeSoft, 1);
  text(label, x + w / 2, y + h / 2 + 4, 12, active ? colors.off : colors.text, "center");
  zone(id, x, y, w, h, data);
}

function valueBox(id, label, value, x, y, w, data) {
  text(label, x, y - 8, 11, colors.muted);
  rect(x, y, w, 30, colors.panel2);
  strokeRect(x, y, w, 30, colors.strokeSoft, 1);
  text(String(value), x + 10, y + 20, 13, colors.text);
  button(id + "_dec", "-", x + w - 54, y + 5, 22, 20, false, data);
  button(id + "_inc", "+", x + w - 28, y + 5, 22, 20, false, data);
}

function paint() {
  var lane;

  hitZones = [];
  rect(0, 0, WIDTH, HEIGHT, colors.bg);
  drawHeader();
  drawSourceGrid();
  drawGeneratedGrid();
  drawLaneControls();
  drawCellEditor();
  drawFooter();
  drawSourceDropdownOverlay();

  for (lane = state.laneCount; lane < MAX_LANES; lane += 1) {
    // Reserve no hit zones for hidden lanes.
  }
}

function clampLaneOffset() {
  var maxOffset = Math.max(0, state.laneCount - VISIBLE_LANES);
  laneOffset = clamp(laneOffset, 0, maxOffset);
  if (selectedLane < laneOffset) {
    laneOffset = selectedLane;
  } else if (selectedLane >= laneOffset + VISIBLE_LANES) {
    laneOffset = selectedLane - VISIBLE_LANES + 1;
  }
  laneOffset = clamp(laneOffset, 0, maxOffset);
}

function drawHeader() {
  var x;

  rect(0, 0, WIDTH, 58, colors.panel2);
  text("Kick Snare Hat", 14, 24, 17, colors.text);
  text("source-constrained drum sequencer", 14, 44, 10, colors.muted);

  x = 172;
  text("Source", x, 12, 10, colors.muted);
  button("source_select", "SRC " + (selectedSource + 1) + " v", x, 18, 82, 25, sourceDropdownOpen);
  button("mode", state.generationMode === "stack" ? "Stack" : "Per Lane", 268, 18, 78, 25, false);
  valueBox("steps", "Steps", state.stepCount, 360, 18, 78);
  valueBox("lanes", "Lanes", state.laneCount, 452, 18, 78);
  valueBox("refresh", "Refresh", state.refreshSteps, 544, 18, 84);
  button("rate", state.rate, 642, 18, 62, 25, false);
  valueBox("swing", "Swing", state.swing, 718, 18, 78);
}

function drawSourceDropdownOverlay() {
  var i;
  var x = 172;
  var y = 44;

  if (!sourceDropdownOpen) {
    return;
  }

  rect(x, y, 82, 98, colors.panel2);
  strokeRect(x, y, 82, 98, colors.stroke, 1);
  for (i = 0; i < SOURCE_COUNT; i += 1) {
    rect(x + 3, y + 3 + i * 23, 76, 21, selectedSource === i ? colors.amber : colors.panel);
    text("SRC " + (i + 1), x + 41, y + 18 + i * 23, 11, selectedSource === i ? colors.off : colors.text, "center");
    zone("source_option", x + 3, y + 3 + i * 23, 76, 21, { source: i });
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
  rect(12, 78, 142, 306, colors.panel);
  text("Lanes", 24, 100, 13, colors.text);
  button("lane_scroll_up", "^", 112, 84, 24, 20, false);
  button("lane_scroll_down", "v", 112, 110, 24, 20, false);

  maxOffset = Math.max(0, state.laneCount - VISIBLE_LANES);
  rect(144, 112, 6, 55, colors.panel2);
  if (maxOffset > 0) {
    thumbH = Math.max(14, 55 * (VISIBLE_LANES / state.laneCount));
    thumbY = 112 + (55 - thumbH) * (laneOffset / maxOffset);
  } else {
    thumbH = 55;
    thumbY = 112;
  }
  rect(144, thumbY, 6, thumbH, colors.amber);
  zone("lane_scroll_track", 140, 112, 14, 55);

  for (row = 0; row < VISIBLE_LANES; row += 1) {
    lane = laneOffset + row;
    if (lane >= state.laneCount) {
      break;
    }
    y = 112 + row * 28;
    rect(24, y, 118, 23, lane === selectedLane ? [0.27, 0.29, 0.33, 1] : colors.panel2);
    strokeRect(24, y, 118, 23, colors.strokeSoft, 1);
    text(state.lanes[lane].label, 32, y + 15, 10, colors.text);
    text(String(state.lanes[lane].note), 92, y + 15, 10, colors.blue);
    lockLabel = state.lanes[lane].lock < 0 ? "R" : "S" + (state.lanes[lane].lock + 1);
    text(lockLabel, 124, y + 15, 10, colors.amber, "center");
    zone("lane_select", 24, y, 62, 23, { lane: lane });
    zone("lane_note", 88, y, 26, 23, { lane: lane });
    zone("lane_lock", 114, y, 28, 23, { lane: lane });
  }

  text("Showing " + (laneOffset + 1) + "-" + Math.min(state.laneCount, laneOffset + VISIBLE_LANES) + " of " + state.laneCount, 24, 184, 10, colors.muted);
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
  text("Source Pattern", x0, 70, 13, colors.text);
  for (step = 0; step < state.stepCount; step += 1) {
    text(String(step + 1), x0 + step * cellW + cellW / 2, y0 - 10, 10, colors.muted, "center");
  }

  for (row = 0; row < VISIBLE_LANES; row += 1) {
    lane = laneOffset + row;
    if (lane >= state.laneCount) {
      break;
    }
    text(state.lanes[lane].label, x0 - 12, y0 + row * cellH + 17, 10, colors.muted, "right");
    for (step = 0; step < state.stepCount; step += 1) {
      x = x0 + step * cellW;
      y = y0 + row * cellH;
      cell = state.sources[selectedSource][lane][step];
      active = cell.enabled ? colors.edit : colors.off;
      rect(x + 2, y + 2, cellW - 4, cellH - 4, active);
      strokeRect(x + 2, y + 2, cellW - 4, cellH - 4, selectedLane === lane && selectedStep === step ? colors.text : colors.strokeSoft, 1);
      if (cell.enabled) {
        text(cell.gateMode === "always" ? String(cell.velocity) : cell.gateMode.charAt(0).toUpperCase(), x + cellW / 2, y + 14, 9, colors.off, "center");
      }
      zone("source_cell", x + 2, y + 2, cellW - 4, cellH - 4, { lane: lane, step: step });
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
  text("Generated Pattern", x0, 254, 13, colors.text);
  for (step = 0; step < state.stepCount; step += 1) {
    text(String(step + 1), x0 + step * cellW + cellW / 2, y0 - 8, 10, colors.muted, "center");
  }

  for (row = 0; row < VISIBLE_LANES; row += 1) {
    lane = laneOffset + row;
    if (lane >= state.laneCount) {
      break;
    }
    text(state.lanes[lane].label, x0 - 12, y0 + row * cellH + 14, 10, colors.muted, "right");
    for (step = 0; step < state.stepCount; step += 1) {
      x = x0 + step * cellW;
      y = y0 + row * cellH;
      cell = previewData && previewData.generated && previewData.generated[lane] ? previewData.generated[lane][step] : null;
      rect(x + 2, y + 2, cellW - 4, cellH - 4, cell && cell.enabled ? colors.generated : colors.off);
      strokeRect(x + 2, y + 2, cellW - 4, cellH - 4, colors.strokeSoft, 1);
      if (cell && cell.enabled) {
        text(String(cell.velocity), x + cellW / 2, y + 11, 8, colors.off, "center");
      }
    }
  }
}

function drawCellEditor() {
  var x = 596;
  var y = 78;
  var cell = state.sources[selectedSource][selectedLane][selectedStep];

  rect(x, y, 270, 236, colors.panel);
  text("Cell Editor", x + 14, y + 24, 13, colors.text);
  text("SRC " + (selectedSource + 1) + " / " + state.lanes[selectedLane].label + " / Step " + (selectedStep + 1), x + 14, y + 44, 11, colors.muted);

  button("cell_enabled", cell.enabled ? "On" : "Off", x + 14, y + 62, 62, 28, cell.enabled);
  valueBox("velocity", "Velocity", cell.velocity, x + 98, y + 62, 104);
  button("gate", "Always", x + 14, y + 128, 72, 26, cell.gateMode === "always", { gate: "always" });
  button("gate", "Random", x + 94, y + 128, 78, 26, cell.gateMode === "random", { gate: "random" });
  button("gate", "Cycle", x + 180, y + 128, 70, 26, cell.gateMode === "cycle", { gate: "cycle" });
  valueBox("random", "Random %", cell.random, x + 14, y + 184, 112);
  valueBox("cycle", "Every N", cell.cycle, x + 146, y + 184, 104);
}

function drawFooter() {
  rect(0, 396, WIDTH, 24, colors.panel2);
  text("Click source cells to toggle/select. Shift-click +/- steps downward. Live transport drives playback.", 18, 412, 10, colors.muted);
  valueBox("midi", "MIDI Ch", state.midiChannel, 596, 340, 84);
  valueBox("duration", "Dur ms", state.noteDurationMs, 696, 340, 104);
}

function send() {
  outlet.apply(this, [0].concat(arrayfromargs(arguments)));
}

function sendStateHeader() {
  send("steps", state.stepCount);
  send("channels", state.laneCount);
  send("refresh_steps", state.refreshSteps);
  send("mode", state.generationMode);
  send("rate", state.rate);
  send("swing", state.swing);
  send("midi_channel", state.midiChannel);
  send("duration_ms", state.noteDurationMs);
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
  var source;
  var lane;
  var step;

  sendStateHeader();
  for (lane = 0; lane < MAX_LANES; lane += 1) {
    sendLane(lane);
  }
  for (source = 0; source < SOURCE_COUNT; source += 1) {
    for (lane = 0; lane < MAX_LANES; lane += 1) {
      for (step = 0; step < MAX_STEPS; step += 1) {
        sendCell(source, lane, step);
      }
    }
  }
  send("snapshot");
  mgraphics.redraw();
}

function loadbang() {
  sync_all();
}

function init() {
  sync_all();
}

function findZone(x, y) {
  var i;
  var z;

  for (i = hitZones.length - 1; i >= 0; i -= 1) {
    z = hitZones[i];
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
      return z;
    }
  }

  return null;
}

function onclick(x, y, button, cmd, shift, capslock, option, ctrl) {
  var z = findZone(x, y);
  var cell;

  if (!z) {
    editingLabel = false;
    sourceDropdownOpen = false;
    mgraphics.redraw();
    return;
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
    cycleRate(shift ? -1 : 1);
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
    state.lanes[selectedLane].note = clamp(state.lanes[selectedLane].note + (shift ? -1 : 1), 0, 127);
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
    laneOffset = clamp(laneOffset - 1, 0, Math.max(0, state.laneCount - VISIBLE_LANES));
  } else if (z.id === "lane_scroll_down") {
    sourceDropdownOpen = false;
    laneOffset = clamp(laneOffset + 1, 0, Math.max(0, state.laneCount - VISIBLE_LANES));
  } else if (z.id === "lane_scroll_track") {
    sourceDropdownOpen = false;
    laneOffset = y < 140 ? clamp(laneOffset - VISIBLE_LANES, 0, Math.max(0, state.laneCount - VISIBLE_LANES)) : clamp(laneOffset + VISIBLE_LANES, 0, Math.max(0, state.laneCount - VISIBLE_LANES));
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
    state.stepCount = clamp(state.stepCount + (id === "steps_inc" ? 1 : -1), 1, MAX_STEPS);
    state.refreshSteps = clamp(state.refreshSteps, 1, state.stepCount);
    send("steps", state.stepCount);
    send("refresh_steps", state.refreshSteps);
  } else if (id === "lanes_inc" || id === "lanes_dec") {
    state.laneCount = clamp(state.laneCount + (id === "lanes_inc" ? 1 : -1), 1, MAX_LANES);
    selectedLane = clamp(selectedLane, 0, state.laneCount - 1);
    clampLaneOffset();
    send("channels", state.laneCount);
  } else if (id === "refresh_inc" || id === "refresh_dec") {
    state.refreshSteps = clamp(state.refreshSteps + (id === "refresh_inc" ? 1 : -1), 1, state.stepCount);
    send("refresh_steps", state.refreshSteps);
  } else if (id === "swing_inc" || id === "swing_dec") {
    state.swing = clamp(state.swing + (id === "swing_inc" ? 1 : -1), 0, 100);
    send("swing", state.swing);
  } else if (id === "midi_inc" || id === "midi_dec") {
    state.midiChannel = clamp(state.midiChannel + (id === "midi_inc" ? 1 : -1), 1, 16);
    send("midi_channel", state.midiChannel);
  } else if (id === "duration_inc" || id === "duration_dec") {
    delta = id === "duration_inc" ? 10 : -10;
    state.noteDurationMs = clamp(state.noteDurationMs + delta, 10, 5000);
    send("duration_ms", state.noteDurationMs);
  } else if (id === "velocity_inc" || id === "velocity_dec") {
    cell.velocity = clamp(cell.velocity + (id === "velocity_inc" ? 1 : -1), 1, 127);
    sendCell(selectedSource, selectedLane, selectedStep);
  } else if (id === "random_inc" || id === "random_dec") {
    cell.random = clamp(cell.random + (id === "random_inc" ? 1 : -1), 0, 100);
    sendCell(selectedSource, selectedLane, selectedStep);
  } else if (id === "cycle_inc" || id === "cycle_dec") {
    cell.cycle = clamp(cell.cycle + (id === "cycle_inc" ? 1 : -1), 1, 64);
    sendCell(selectedSource, selectedLane, selectedStep);
  }
}

function applyIncoming(name, args) {
  var source;
  var lane;
  var stepIndex;
  var cell;

  if (name === "steps") {
    state.stepCount = clamp(args[0], 1, MAX_STEPS);
    state.refreshSteps = clamp(state.refreshSteps, 1, state.stepCount);
  } else if (name === "channels") {
    state.laneCount = clamp(args[0], 1, MAX_LANES);
    selectedLane = clamp(selectedLane, 0, state.laneCount - 1);
    clampLaneOffset();
  } else if (name === "refresh_steps") {
    state.refreshSteps = clamp(args[0], 1, state.stepCount);
  } else if (name === "mode") {
    state.generationMode = String(args[0]) === "per_channel" ? "per_channel" : "stack";
  } else if (name === "rate") {
    state.rate = String(args[0] || "16n");
  } else if (name === "swing") {
    state.swing = clamp(args[0], 0, 100);
  } else if (name === "midi_channel") {
    state.midiChannel = clamp(args[0], 1, 16);
  } else if (name === "duration_ms") {
    state.noteDurationMs = clamp(args[0], 10, 5000);
  } else if (name === "channel_label") {
    lane = clamp(args[0] - 1, 0, MAX_LANES - 1);
    args.shift();
    state.lanes[lane].label = args.join(" ");
  } else if (name === "channel_note") {
    lane = clamp(args[0] - 1, 0, MAX_LANES - 1);
    state.lanes[lane].note = clamp(args[1], 0, 127);
  } else if (name === "channel_lock") {
    lane = clamp(args[0] - 1, 0, MAX_LANES - 1);
    state.lanes[lane].lock = String(args[1]).toLowerCase() === "random" ? -1 : clamp(args[1] - 1, -1, SOURCE_COUNT - 1);
  } else if (name === "cell") {
    source = clamp(args[0] - 1, 0, SOURCE_COUNT - 1);
    lane = clamp(args[1] - 1, 0, MAX_LANES - 1);
    stepIndex = clamp(args[2] - 1, 0, MAX_STEPS - 1);
    cell = state.sources[source][lane][stepIndex];
    cell.enabled = parseInt(args[3], 10) !== 0 ? 1 : 0;
    cell.velocity = clamp(args[4], 1, 127);
    cell.gateMode = String(args[5] || "always");
    if (cell.gateMode === "cycle") {
      cell.cycle = clamp(args[6], 1, 64);
    } else {
      cell.random = clamp(args[6], 0, 100);
    }
  }
}

function onmousewheel(x, y, delta) {
  if (x >= 12 && x <= 590 && y >= 72 && y <= 180) {
    laneOffset = clamp(laneOffset + (delta < 0 ? 1 : -1), 0, Math.max(0, state.laneCount - VISIBLE_LANES));
    mgraphics.redraw();
  }
}

function cycleRate(direction) {
  var i;

  for (i = 0; i < rates.length; i += 1) {
    if (rates[i] === state.rate) {
      break;
    }
  }

  i += direction;
  if (i < 0) {
    i = rates.length - 1;
  } else if (i >= rates.length) {
    i = 0;
  }
  state.rate = rates[i];
  send("rate", state.rate);
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
  } catch (error) {
    // Ignore incomplete preview payloads while patch cords are being edited.
  }
}

function status() {
  // Reserved for future inline status display.
}

function getvalueof() {
  return JSON.stringify({
    state: state,
    selectedSource: selectedSource,
    selectedLane: selectedLane,
    selectedStep: selectedStep,
    laneOffset: laneOffset
  });
}

function setvalueof(value) {
  var parsed;
  var source;
  var lane;
  var step;

  if (!value) {
    return;
  }
  if (typeof value !== "string") {
    value = String(value);
  }

  parsed = JSON.parse(value);
  if (parsed.state) {
    state = makeState();
    state.stepCount = clamp(parsed.state.stepCount, 1, MAX_STEPS);
    state.laneCount = clamp(parsed.state.laneCount, 1, MAX_LANES);
    state.refreshSteps = clamp(parsed.state.refreshSteps, 1, state.stepCount);
    state.generationMode = parsed.state.generationMode === "per_channel" ? "per_channel" : "stack";
    state.rate = parsed.state.rate || "16n";
    state.swing = clamp(parsed.state.swing, 0, 100);
    state.midiChannel = clamp(parsed.state.midiChannel, 1, 16);
    state.noteDurationMs = clamp(parsed.state.noteDurationMs, 10, 5000);

    if (parsed.state.lanes) {
      for (lane = 0; lane < Math.min(MAX_LANES, parsed.state.lanes.length); lane += 1) {
        state.lanes[lane].label = String(parsed.state.lanes[lane].label || state.lanes[lane].label);
        state.lanes[lane].note = clamp(parsed.state.lanes[lane].note, 0, 127);
        state.lanes[lane].lock = clamp(parsed.state.lanes[lane].lock, -1, SOURCE_COUNT - 1);
      }
    }

    if (parsed.state.sources) {
      for (source = 0; source < Math.min(SOURCE_COUNT, parsed.state.sources.length); source += 1) {
        for (lane = 0; lane < Math.min(MAX_LANES, parsed.state.sources[source].length); lane += 1) {
          for (step = 0; step < Math.min(MAX_STEPS, parsed.state.sources[source][lane].length); step += 1) {
            state.sources[source][lane][step] = cloneCell(parsed.state.sources[source][lane][step]);
          }
        }
      }
    }
  }

  selectedSource = clamp(parsed.selectedSource, 0, SOURCE_COUNT - 1);
  selectedLane = clamp(parsed.selectedLane, 0, state.laneCount - 1);
  selectedStep = clamp(parsed.selectedStep, 0, state.stepCount - 1);
  laneOffset = clamp(parsed.laneOffset, 0, Math.max(0, state.laneCount - VISIBLE_LANES));
  clampLaneOffset();
  sync_all();
}

function anything() {
  if (messagename === "preview") {
    preview.apply(this, arrayfromargs(arguments));
  } else if (messagename === "status") {
    status.apply(this, arrayfromargs(arguments));
  } else {
    applyIncoming(messagename, arrayfromargs(arguments));
    mgraphics.redraw();
  }
}
