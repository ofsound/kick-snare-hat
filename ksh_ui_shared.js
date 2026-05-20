// Shared UI helpers for ksh_compact_ui.js and ksh_ui.js (included via include()).
var ksh_shared = {};

// Load limits from the single source of truth. include() defines a global
// `ksh_constants` object.
(function () {
  function fail(error) {
    var message = error && error.message ? error.message : String(error || "unknown error");

    if (typeof post === "function") {
      try {
        post("[ksh] Could not load ksh_constants.js; UI cannot initialize safely. " + message + "\n");
      } catch (postError) {
        // Keep the original loader failure as the visible failure path.
      }
    }

    throw new Error("ksh_constants.js is required");
  }

  if (typeof include === "function") {
    try {
      include("ksh_constants.js");
    } catch (error) {
      fail(error);
    }
  }
  if (typeof ksh_constants === "undefined" || !ksh_constants) {
    fail("include did not define ksh_constants");
  }
  var constants = ksh_constants;
  ksh_shared.constants = constants;
  ksh_shared.MAX_STEPS = constants.MAX_STEPS;
  ksh_shared.MAX_LANES = constants.MAX_LANES;
  ksh_shared.SOURCE_COUNT = constants.SOURCE_COUNT;
}());

ksh_shared.rates = ksh_shared.constants.RATES;
ksh_shared.defaultLabels = ["Kick", "Snare", "Hat", "Open Hat", "Tom 1", "Tom 2", "Clap", "Ride"];
ksh_shared.defaultNotes = [36, 37, 38, 39, 40, 41, 42, 43];

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

ksh_shared.patcherWindowPlacement = function (targetPatcher, wind) {
  var loc;
  var rect;
  var left = 120;
  var top = 120;
  var minTop = 50;
  var usedWind = false;

  if (wind) {
    try {
      loc = wind.location;
      if (loc && loc.length >= 2 && loc[1] >= minTop) {
        left = loc[0];
        top = loc[1];
        usedWind = true;
      }
    } catch (error) {
      ksh_shared.constants.debugPost("patcher window location failed", error);
    }
  }

  if (!usedWind && typeof targetPatcher.getattr === "function") {
    try {
      rect = targetPatcher.getattr("defrect");
      if (rect && rect.length >= 4 && rect[1] >= minTop) {
        left = rect[0];
        top = rect[1];
      } else {
        rect = targetPatcher.getattr("openrect");
        if (rect && rect.length >= 4 && rect[1] >= minTop) {
          left = rect[0];
          top = rect[1];
        }
      }
    } catch (error) {
      ksh_shared.constants.debugPost("patcher window rect failed", error);
    }
  }

  if (top < minTop) {
    top = 120;
  }
  if (left < 0) {
    left = 120;
  }

  return { left: left, top: top };
};

ksh_shared.resizePatcherWindow = function (targetPatcher, width, height) {
  var wind;
  var placement;
  var left;
  var top;

  if (!targetPatcher) {
    return;
  }

  wind = targetPatcher.wind;
  placement = ksh_shared.patcherWindowPlacement(targetPatcher, wind);
  left = placement.left;
  top = placement.top;

  try {
    if (typeof targetPatcher.setattr === "function") {
      targetPatcher.setattr("defrect", [left, top, width, height]);
      targetPatcher.setattr("openrect", [left, top, width, height]);
    }
  } catch (error) {
    ksh_shared.constants.debugPost("patcher resize attrs failed", error);
  }

  if (wind) {
    try {
      // setlocation takes (left, top, right, bottom) — i.e. (x1, y1, x2, y2).
      // The previous call swapped the last two arguments, which produced an
      // off-shape window on non-square editor sizes.
      wind.setlocation(left, top, left + width, top + height);
      wind.size = [width, height];
    } catch (error) {
      ksh_shared.constants.debugPost("patcher window resize failed", error);
    }
  }

  try {
    targetPatcher.message("window", "size", left, top, left + width, top + height);
    targetPatcher.message("window", "exec");
  } catch (error) {
    ksh_shared.constants.debugPost("patcher resize message failed", error);
  }
};

ksh_shared.applyViewSize = function (width, height, options) {
  var targetPatcher;
  var resizePatcher;

  options = options || {};
  targetPatcher = options.patcher || null;
  resizePatcher = options.resizePatcher !== false;

  if (typeof box !== "undefined" && box) {
    try {
      if (typeof box.size === "function") {
        box.size(width, height);
      }
      if (box.presentation_rect !== undefined) {
        box.presentation_rect = [0, 0, width, height];
      } else {
        box.message("presentation_rect", 0, 0, width, height);
      }
    } catch (error) {
      ksh_shared.constants.debugPost("box resize failed", error);
    }
  }

  if (resizePatcher && targetPatcher) {
    ksh_shared.resizePatcherWindow(targetPatcher, width, height);
  }
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

ksh_shared.fillPath = function (points, color) {
  var i;

  ksh_shared.setSourceRGBA(color);
  mgraphics.new_path();
  mgraphics.move_to(points[0][0], points[0][1]);
  for (i = 1; i < points.length; i += 1) {
    mgraphics.line_to(points[i][0], points[i][1]);
  }
  mgraphics.close_path();
  mgraphics.fill();
};

// Gate-mode fill for enabled source cells: solid, horizontal split (random), or diagonal split (cycle).
ksh_shared.sourceCellBackground = function (x, y, w, h, gateMode, baseColor, lightColor) {
  var halfH;

  if (gateMode === "random") {
    halfH = Math.floor(h / 2);
    ksh_shared.rect(x, y, w, halfH, baseColor);
    ksh_shared.rect(x, y + halfH, w, h - halfH, lightColor);
    return;
  }
  if (gateMode === "cycle") {
    ksh_shared.fillPath(
      [
        [x, y],
        [x + w, y],
        [x, y + h]
      ],
      baseColor
    );
    ksh_shared.fillPath(
      [
        [x + w, y + h],
        [x + w, y],
        [x, y + h]
      ],
      lightColor
    );
    return;
  }
  ksh_shared.rect(x, y, w, h, baseColor);
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
  ksh_shared.text(String(value), x + 8, y + h / 2 + 4, fs, colors.text);
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
  return ksh_shared.constants.defaultCell();
};

ksh_shared.cloneCell = function (cell) {
  return ksh_shared.constants.cloneCell(cell);
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
  state.rate = ksh_shared.constants.normalizeRate(engineState.rate);
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
      if (channels[lane].label !== undefined) {
        state.lanes[lane].label = String(channels[lane].label);
      }
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
    state.rate = ksh_shared.constants.normalizeRate(args[0]);
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
