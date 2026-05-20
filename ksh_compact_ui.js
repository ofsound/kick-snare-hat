autowatch = 1;
inlets = 1;
outlets = 2;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

var WIDTH = 880;
var HEIGHT = 160;
var MAX_STEPS = 16;
var MAX_LANES = 8;
var SOURCE_COUNT = 4;

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
  off: [0.10, 0.11, 0.13, 1]
};

var rates = ["4n", "4nt", "8n", "8nt", "16n", "16nt", "32n", "32nt"];
var defaultLabels = ["Kick", "Snare", "Hat", "Open Hat", "Tom 1", "Tom 2", "Clap", "Ride"];
var defaultNotes = [36, 38, 42, 46, 41, 43, 45, 49];

var state = makeState();
var previewData = null;
var selectedSource = 0;
var hitZones = [];

function clamp(value, min, max) {
  value = parseInt(value, 10);
  if (isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

function makeState() {
  var lanes = [];
  var i;
  for (i = 0; i < MAX_LANES; i += 1) {
    lanes[i] = { label: defaultLabels[i], note: defaultNotes[i], lock: -1 };
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

function valueBox(id, label, value, x, y, w) {
  text(label, x, y - 6, 10, colors.muted);
  rect(x, y, w, 25, colors.panel2);
  strokeRect(x, y, w, 25, colors.strokeSoft, 1);
  text(String(value), x + 8, y + 17, 12, colors.text);
  button(id + "_dec", "-", x + w - 48, y + 4, 20, 17, false);
  button(id + "_inc", "+", x + w - 24, y + 4, 20, 17, false);
}

function paint() {
  hitZones = [];
  rect(0, 0, WIDTH, HEIGHT, colors.bg);
  drawHeader();
  drawPreview();
}

function drawHeader() {
  rect(0, 0, WIDTH, 58, colors.panel2);
  text("Kick Snare Hat", 14, 24, 17, colors.text);
  text("source-constrained drum sequencer", 14, 44, 10, colors.muted);
  button("source", "SRC " + (selectedSource + 1), 172, 18, 66, 25, false);
  button("mode", state.generationMode === "stack" ? "Stack" : "Per Lane", 250, 18, 78, 25, false);
  valueBox("steps", "Steps", state.stepCount, 342, 18, 78);
  valueBox("lanes", "Lanes", state.laneCount, 434, 18, 78);
  valueBox("refresh", "Refresh", state.refreshSteps, 526, 18, 84);
  button("rate", state.rate, 624, 18, 62, 25, false);
  valueBox("swing", "Swing", state.swing, 700, 18, 78);
  button("open_editor", "Edit", 792, 18, 58, 25, true);
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

  text("Generated", 14, 78, 11, colors.muted);
  for (lane = 0; lane < maxPreviewLanes; lane += 1) {
    text(state.lanes[lane].label, x0 - 10, y0 + lane * cellH + 11, 9, colors.muted, "right");
    for (step = 0; step < state.stepCount; step += 1) {
      cell = previewData && previewData.generated && previewData.generated[lane] ? previewData.generated[lane][step] : null;
      rect(x0 + step * cellW, y0 + lane * cellH, cellW - 3, cellH - 3, cell && cell.enabled ? colors.blue : colors.off);
    }
  }
  text("Open editor for source patterns, lane locks, velocity, probability, and cycle values.", 400, 105, 10, colors.muted);
}

function send() {
  var args = arrayfromargs(arguments);
  outlet.apply(this, [0].concat(args));
  if (args[0] !== "open_editor" && typeof messnamed === "function") {
    messnamed.apply(this, ["ksh_engine_commands"].concat(args));
  }
}

function sendStateHeader() {
  send("steps", state.stepCount);
  send("channels", state.laneCount);
  send("refresh_steps", state.refreshSteps);
  send("mode", state.generationMode);
  send("rate", state.rate);
  send("swing", state.swing);
}

function sync_all() {
  sendStateHeader();
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

function onclick(x, y, button, cmd, shift) {
  var z = findZone(x, y);
  if (!z) {
    return;
  }
  if (z.id === "open_editor") {
    send("open_editor");
  } else if (z.id === "source") {
    selectedSource = selectedSource + (shift ? -1 : 1);
    if (selectedSource < 0) {
      selectedSource = SOURCE_COUNT - 1;
    } else if (selectedSource >= SOURCE_COUNT) {
      selectedSource = 0;
    }
  } else if (z.id === "mode") {
    state.generationMode = state.generationMode === "stack" ? "per_channel" : "stack";
    send("mode", state.generationMode);
  } else if (z.id === "rate") {
    cycleRate(shift ? -1 : 1);
  } else {
    handleStepper(z.id);
  }
  mgraphics.redraw();
}

function handleStepper(id) {
  if (id === "steps_inc" || id === "steps_dec") {
    state.stepCount = clamp(state.stepCount + (id === "steps_inc" ? 1 : -1), 1, MAX_STEPS);
    state.refreshSteps = clamp(state.refreshSteps, 1, state.stepCount);
    send("steps", state.stepCount);
    send("refresh_steps", state.refreshSteps);
  } else if (id === "lanes_inc" || id === "lanes_dec") {
    state.laneCount = clamp(state.laneCount + (id === "lanes_inc" ? 1 : -1), 1, MAX_LANES);
    send("channels", state.laneCount);
  } else if (id === "refresh_inc" || id === "refresh_dec") {
    state.refreshSteps = clamp(state.refreshSteps + (id === "refresh_inc" ? 1 : -1), 1, state.stepCount);
    send("refresh_steps", state.refreshSteps);
  } else if (id === "swing_inc" || id === "swing_dec") {
    state.swing = clamp(state.swing + (id === "swing_inc" ? 1 : -1), 0, 100);
    send("swing", state.swing);
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

function preview(json) {
  if (typeof json !== "string") {
    json = arrayfromargs(arguments).join(" ");
  }
  try {
    previewData = JSON.parse(json);
    mgraphics.redraw();
  } catch (error) {}
}

function applyIncoming(name, args) {
  var lane;
  if (name === "steps") {
    state.stepCount = clamp(args[0], 1, MAX_STEPS);
    state.refreshSteps = clamp(state.refreshSteps, 1, state.stepCount);
  } else if (name === "channels") {
    state.laneCount = clamp(args[0], 1, MAX_LANES);
  } else if (name === "refresh_steps") {
    state.refreshSteps = clamp(args[0], 1, state.stepCount);
  } else if (name === "mode") {
    state.generationMode = String(args[0]) === "per_channel" ? "per_channel" : "stack";
  } else if (name === "rate") {
    state.rate = String(args[0] || "16n");
  } else if (name === "swing") {
    state.swing = clamp(args[0], 0, 100);
  } else if (name === "channel_label") {
    lane = clamp(args[0] - 1, 0, MAX_LANES - 1);
    args.shift();
    state.lanes[lane].label = args.join(" ");
  } else if (name === "channel_note") {
    lane = clamp(args[0] - 1, 0, MAX_LANES - 1);
    state.lanes[lane].note = clamp(args[1], 0, 127);
  }
}

function anything() {
  if (messagename === "preview") {
    preview.apply(this, arrayfromargs(arguments));
  } else {
    applyIncoming(messagename, arrayfromargs(arguments));
    mgraphics.redraw();
  }
}

function getvalueof() {
  return JSON.stringify({ state: state, selectedSource: selectedSource });
}

function setvalueof(value) {
  var parsed;
  if (!value) {
    return;
  }
  parsed = JSON.parse(String(value));
  if (parsed.state) {
    state = parsed.state;
  }
  selectedSource = clamp(parsed.selectedSource, 0, SOURCE_COUNT - 1);
  mgraphics.redraw();
}
