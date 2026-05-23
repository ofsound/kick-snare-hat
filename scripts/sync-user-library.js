const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const DEVICE_FILES = [
  "ksh_engine.js",
  "ksh_native_step.js",
  "ksh_compact_ui.js",
  "ksh_ui.js",
  "ksh_ui_shared.js",
  "ksh_constants.js",
  "Kick-Snare-Hat.amxd"
];

const DEFAULT_DEST = path.join(
  process.env.HOME,
  "Music",
  "Ableton",
  "User Library",
  "Presets",
  "MIDI Effects",
  "Max MIDI Effect"
);

function resolveDest() {
  return process.env.KSH_ABLETON_DEST
    ? path.resolve(process.env.KSH_ABLETON_DEST)
    : DEFAULT_DEST;
}

function syncToAbletonUserLibrary(options) {
  const dest = options && options.dest ? options.dest : resolveDest();
  const quiet = options && options.quiet;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
    if (!quiet) {
      console.log(`created ${dest}`);
    }
  }

  for (let i = 0; i < DEVICE_FILES.length; i += 1) {
    const name = DEVICE_FILES[i];
    const src = path.join(ROOT, name);
    const out = path.join(dest, name);

    if (!fs.existsSync(src)) {
      throw new Error(`missing source file: ${src}`);
    }

    fs.copyFileSync(src, out);
    if (!quiet) {
      console.log(`synced ${name} -> ${dest}`);
    }
  }

  if (!quiet) {
    console.log("Ableton User Library device folder is up to date.");
  }

  return dest;
}

function watchAndSync() {
  const dest = resolveDest();
  console.log(`watching device files in ${ROOT}`);
  console.log(`syncing to ${dest}`);

  syncToAbletonUserLibrary();

  let timer = null;
  function scheduleSync(label) {
    clearTimeout(timer);
    timer = setTimeout(function () {
      try {
        syncToAbletonUserLibrary({ quiet: true });
        console.log(`synced (${label})`);
      } catch (error) {
        console.error(error.message);
      }
    }, 150);
  }

  for (let i = 0; i < DEVICE_FILES.length; i += 1) {
    const filePath = path.join(ROOT, DEVICE_FILES[i]);
    fs.watch(filePath, function () {
      scheduleSync(DEVICE_FILES[i]);
    });
  }

  console.log("press Ctrl+C to stop watching");
}

if (require.main === module) {
  if (process.argv.indexOf("--watch") !== -1) {
    watchAndSync();
  } else {
    syncToAbletonUserLibrary();
  }
}

module.exports = syncToAbletonUserLibrary;
