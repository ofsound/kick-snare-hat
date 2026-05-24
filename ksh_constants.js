// Single source of truth for device limits, schema defaults, and small shared
// normalization helpers.
//
// Loaded as a module in Node (`require("./ksh_constants")`) and via Max's
// include() in the engine (`js`) and UI (`jsui`) scripts. Both load paths
// expose the constants as the global `ksh_constants` object; the Node load
// additionally sets module.exports so tests can pull values directly.
//
function kshClamp(value, min, max) {
  value = parseInt(value, 10);
  if (isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

var ksh_constants = {
  DEBUG: false,
  MAX_STEPS: 32,
  MAX_LANES: 8,
  DEFAULT_CHANNEL_COUNT: 8,
  DEFAULT_GENERATION_MODE: "static",
  SOURCE_COUNT: 4,
  DEFAULT_CHANNEL_LABELS: ["1", "2", "3", "4", "5", "6", "7", "8"],
  DEFAULT_CHANNEL_NOTES: [36, 37, 38, 39, 40, 41, 42, 43],
  DEFAULT_CHANNEL_PLAYBACK_MODE: "normal",
  DEFAULT_MIDI_CHANNEL: 1,
  DEFAULT_NOTE_DURATION_MS: 100,
  RATES: ["4n", "4nt", "8n", "8nt", "16n", "16nt", "32n", "32nt"],
  DEFAULT_RATE: "16n",
  NATIVE_HIT_FIELD_COUNT: 9,
  PHASE_EARLY_MS_MIN: -80,
  PHASE_EARLY_MS_MAX: 80,
  DEFAULT_CELL: {
    enabled: 0,
    velocity: 100,
    probability: 100,
    cycle: 1,
    cycleOffset: 0,
    cycleInverted: 0,
    source: -1
  },
  defaultCell: function () {
    return this.cloneCell(this.DEFAULT_CELL);
  },
  cloneCell: function (cell) {
    var hasProbability;
    var hasCycle;
    var hasCycleOffset;
    var hasCycleInverted;
    var probability;
    var cycle;
    var cycleOffset;

    cell = cell || this.DEFAULT_CELL;
    hasProbability = cell.probability !== undefined;
    hasCycle = cell.cycle !== undefined;
    hasCycleOffset = cell.cycleOffset !== undefined;
    hasCycleInverted = cell.cycleInverted !== undefined;
    probability = hasProbability ? cell.probability : this.DEFAULT_CELL.probability;
    cycle = hasCycle ? cell.cycle : this.DEFAULT_CELL.cycle;
    cycle = kshClamp(cycle, 1, 64);
    cycleOffset = hasCycleOffset ? cell.cycleOffset : this.DEFAULT_CELL.cycleOffset;

    return {
      enabled: cell.enabled ? 1 : 0,
      velocity: kshClamp(cell.velocity, 1, 127),
      probability: kshClamp(probability, 0, 100),
      cycle: cycle,
      cycleOffset: kshClamp(cycleOffset, 0, cycle - 1),
      cycleInverted: cycle > 1 && hasCycleInverted && cell.cycleInverted ? 1 : 0,
      source: typeof cell.source === "number" ? cell.source : -1
    };
  },
  normalizeRate: function (rate) {
    var i;

    rate = String(rate || this.DEFAULT_RATE);
    for (i = 0; i < this.RATES.length; i += 1) {
      if (this.RATES[i] === rate) {
        return rate;
      }
    }

    return this.DEFAULT_RATE;
  },
  normalizeChannelPlaybackMode: function (mode) {
    mode = String(mode || "").toLowerCase();
    if (mode === "r" || mode === "rev" || mode === "reverse") {
      return "reverse";
    }
    if (mode === "b" || mode === "boom" || mode === "boomerang") {
      return "boomerang";
    }
    return this.DEFAULT_CHANNEL_PLAYBACK_MODE;
  },
  debugPost: function (context, error) {
    var message;

    if (!this.DEBUG || typeof post !== "function") {
      return;
    }

    message = error && error.message ? error.message : String(error || "unknown error");
    try {
      post("[ksh] " + context + ": " + message + "\n");
    } catch (postError) {
      // Keep debug logging from becoming a new failure path.
    }
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = ksh_constants;
}
