// Single source of truth for the device's hard limits.
//
// Loaded as a module in Node (`require("./ksh_constants")`) and via Max's
// include() in the engine (`js`) and UI (`jsui`) scripts. Both load paths
// expose the constants as the global `ksh_constants` object; the Node load
// additionally sets module.exports so tests can pull values directly.
//
// If you change any of these values, update them HERE only.

var ksh_constants = {
  MAX_STEPS: 32,
  MAX_LANES: 8,
  SOURCE_COUNT: 4
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = ksh_constants;
}
