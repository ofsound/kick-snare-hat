// Shared UI helpers for ksh_compact_ui.js and ksh_ui.js (included via include()).
var ksh_shared = {};

ksh_shared.MAX_STEPS = 16;
ksh_shared.MAX_LANES = 8;
ksh_shared.SOURCE_COUNT = 4;

ksh_shared.rates = ["4n", "4nt", "8n", "8nt", "16n", "16nt", "32n", "32nt"];
ksh_shared.defaultLabels = ["Kick", "Snare", "Hat", "Open Hat", "Tom 1", "Tom 2", "Clap", "Ride"];
ksh_shared.defaultNotes = [36, 38, 42, 46, 41, 43, 45, 49];

ksh_shared.colors = {
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

ksh_shared.clamp = function (value, min, max) {
  value = parseInt(value, 10);
  if (isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
};

ksh_shared.setSourceRGBA = function (color) {
  mgraphics.set_source_rgba(color[0], color[1], color[2], color[3]);
};

ksh_shared.rect = function (x, y, w, h, color) {
  ksh_shared.setSourceRGBA(color);
  mgraphics.rectangle(x, y, w, h);
  mgraphics.fill();
};

ksh_shared.strokeRect = function (x, y, w, h, color, width) {
  ksh_shared.setSourceRGBA(color);
  mgraphics.set_line_width(width || 1);
  mgraphics.rectangle(x, y, w, h);
  mgraphics.stroke();
};

ksh_shared.text = function (label, x, y, size, color, align) {
  var ext;
  var colors = ksh_shared.colors;

  ksh_shared.setSourceRGBA(color || colors.text);
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
};

ksh_shared.zone = function (hitZones, id, x, y, w, h, data) {
  hitZones.push({ id: id, x: x, y: y, w: w, h: h, data: data || {} });
};

ksh_shared.button = function (hitZones, id, label, x, y, w, h, active, data, colors) {
  colors = colors || ksh_shared.colors;
  ksh_shared.rect(x, y, w, h, active ? colors.amber : colors.panel2);
  ksh_shared.strokeRect(x, y, w, h, active ? colors.amber : colors.strokeSoft, 1);
  ksh_shared.text(label, x + w / 2, y + h / 2 + 4, 12, active ? colors.off : colors.text, "center");
  ksh_shared.zone(hitZones, id, x, y, w, h, data);
};

ksh_shared.valueBox = function (hitZones, id, label, value, x, y, w, boxHeight, fontSize) {
  var colors = ksh_shared.colors;
  var h = boxHeight || 25;
  var fs = fontSize || 12;

  ksh_shared.text(label, x, y - 6, 10, colors.muted);
  ksh_shared.rect(x, y, w, h, colors.panel2);
  ksh_shared.strokeRect(x, y, w, h, colors.strokeSoft, 1);
  ksh_shared.text(String(value), x + 8, y + h - 8, fs, colors.text);
  ksh_shared.button(hitZones, id + "_dec", "-", x + w - 48, y + 4, 20, h - 8, false);
  ksh_shared.button(hitZones, id + "_inc", "+", x + w - 24, y + 4, 20, h - 8, false);
};

ksh_shared.findZone = function (hitZones, x, y) {
  var i;
  var z;

  for (i = hitZones.length - 1; i >= 0; i -= 1) {
    z = hitZones[i];
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) {
      return z;
    }
  }

  return null;
};

ksh_shared.cycleRate = function (state, direction) {
  var i;
  var rates = ksh_shared.rates;

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
};

ksh_shared.defaultCell = function () {
  return {
    enabled: 0,
    velocity: 100,
    gateMode: "always",
    random: 100,
    cycle: 1
  };
};

ksh_shared.cloneCell = function (cell) {
  var clamp = ksh_shared.clamp;

  return {
    enabled: cell && cell.enabled ? 1 : 0,
    velocity: clamp(cell && cell.velocity, 1, 127),
    gateMode: cell && cell.gateMode ? cell.gateMode : "always",
    random: clamp(cell && cell.random, 0, 100),
    cycle: clamp(cell && cell.cycle, 1, 64)
  };
};

ksh_shared.applyEngineState = function (state, engineState) {
  var source;
  var lane;
  var step;
  var channels;

  if (!engineState) {
    return;
  }

  state.stepCount = ksh_shared.clamp(engineState.stepCount, 1, ksh_shared.MAX_STEPS);
  state.laneCount = ksh_shared.clamp(engineState.channelCount, 1, ksh_shared.MAX_LANES);
  state.refreshSteps = ksh_shared.clamp(engineState.refreshSteps, 1, state.stepCount);
  state.generationMode = engineState.generationMode === "per_channel" ? "per_channel" : "stack";
  state.rate = engineState.rate || "16n";
  state.swing = ksh_shared.clamp(engineState.swing, 0, 100);

  if (engineState.midiChannel !== undefined) {
    state.midiChannel = ksh_shared.clamp(engineState.midiChannel, 1, 16);
  }
  if (engineState.noteDurationMs !== undefined) {
    state.noteDurationMs = ksh_shared.clamp(engineState.noteDurationMs, 10, 5000);
  }

  channels = engineState.channels;
  if (channels) {
    for (lane = 0; lane < Math.min(ksh_shared.MAX_LANES, channels.length); lane += 1) {
      state.lanes[lane].label = String(channels[lane].label || state.lanes[lane].label);
      state.lanes[lane].note = ksh_shared.clamp(channels[lane].note, 0, 127);
      state.lanes[lane].lock = ksh_shared.clamp(channels[lane].lock, -1, ksh_shared.SOURCE_COUNT - 1);
    }
  }

  if (engineState.sources && state.sources) {
    for (source = 0; source < Math.min(ksh_shared.SOURCE_COUNT, engineState.sources.length); source += 1) {
      for (lane = 0; lane < Math.min(ksh_shared.MAX_LANES, engineState.sources[source].length); lane += 1) {
        for (step = 0; step < Math.min(ksh_shared.MAX_STEPS, engineState.sources[source][lane].length); step += 1) {
          state.sources[source][lane][step] = ksh_shared.cloneCell(engineState.sources[source][lane][step]);
        }
      }
    }
  }
};

ksh_shared.applyStatusMessage = function (state, name, args) {
  var lane;

  if (name === "steps") {
    state.stepCount = ksh_shared.clamp(args[0], 1, ksh_shared.MAX_STEPS);
    state.refreshSteps = ksh_shared.clamp(state.refreshSteps, 1, state.stepCount);
  } else if (name === "channels") {
    state.laneCount = ksh_shared.clamp(args[0], 1, ksh_shared.MAX_LANES);
  } else if (name === "refresh_steps") {
    state.refreshSteps = ksh_shared.clamp(args[0], 1, state.stepCount);
  } else if (name === "mode") {
    state.generationMode = String(args[0]) === "per_channel" ? "per_channel" : "stack";
  } else if (name === "rate") {
    state.rate = String(args[0] || "16n");
  } else if (name === "swing") {
    state.swing = ksh_shared.clamp(args[0], 0, 100);
  } else if (name === "midi_channel") {
    state.midiChannel = ksh_shared.clamp(args[0], 1, 16);
  } else if (name === "duration_ms") {
    state.noteDurationMs = ksh_shared.clamp(args[0], 10, 5000);
  } else if (name === "channel_label") {
    lane = ksh_shared.clamp(args[0] - 1, 0, ksh_shared.MAX_LANES - 1);
    args.shift();
    state.lanes[lane].label = args.join(" ");
  } else if (name === "channel_note") {
    lane = ksh_shared.clamp(args[0] - 1, 0, ksh_shared.MAX_LANES - 1);
    state.lanes[lane].note = ksh_shared.clamp(args[1], 0, 127);
  } else if (name === "channel_lock") {
    lane = ksh_shared.clamp(args[0] - 1, 0, ksh_shared.MAX_LANES - 1);
    state.lanes[lane].lock = String(args[1]).toLowerCase() === "random" ? -1 : ksh_shared.clamp(args[1] - 1, -1, ksh_shared.SOURCE_COUNT - 1);
  }
};
