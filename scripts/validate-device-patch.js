const fs = require("fs");

const maxpatPath = "kick-snare-hat.maxpat";
const amxdPath = "Kick-Snare-Hat.amxd";

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function loadPatch() {
  const text = fs.readFileSync(maxpatPath, "utf8");
  return { text, json: JSON.parse(text) };
}

function boxMap(patcher) {
  const map = new Map();
  const boxes = patcher.boxes || [];

  for (let i = 0; i < boxes.length; i += 1) {
    map.set(boxes[i].box.id, boxes[i].box);
  }

  return map;
}

function validateLines(patcher, name, errors) {
  const boxes = boxMap(patcher);
  const lines = patcher.lines || [];

  for (let i = 0; i < lines.length; i += 1) {
    const patchline = lines[i].patchline;
    const source = patchline.source;
    const destination = patchline.destination;
    const sourceBox = boxes.get(source[0]);
    const destinationBox = boxes.get(destination[0]);

    if (!sourceBox) {
      errors.push(`${name}: missing source box ${source[0]}`);
      continue;
    }

    if (!destinationBox) {
      errors.push(`${name}: missing destination box ${destination[0]}`);
      continue;
    }

    if (source[1] >= (sourceBox.numoutlets || 0)) {
      errors.push(`${name}: ${source[0]} outlet ${source[1]} >= ${sourceBox.numoutlets || 0}`);
    }

    if (destination[1] >= (destinationBox.numinlets || 0)) {
      errors.push(`${name}: ${destination[0]} inlet ${destination[1]} >= ${destinationBox.numinlets || 0}`);
    }
  }

  for (const item of patcher.boxes || []) {
    if (item.box.patcher) {
      validateLines(item.box.patcher, `${name}/${item.box.id}`, errors);
    }
  }
}

function validateAmxd(maxpatText) {
  const amxd = fs.readFileSync(amxdPath);

  if (amxd.toString("ascii", 0, 4) !== "ampf") {
    fail(`${amxdPath}: missing ampf header`);
    return;
  }

  if (amxd.toString("ascii", 24, 28) !== "ptch") {
    fail(`${amxdPath}: missing ptch chunk`);
    return;
  }

  const payloadLength = amxd.readUInt32LE(28);
  const payload = amxd.subarray(32).toString("utf8");

  if (payloadLength !== Buffer.byteLength(maxpatText)) {
    fail(`${amxdPath}: payload length ${payloadLength} does not match ${maxpatPath}`);
  }

  if (payload !== maxpatText) {
    fail(`${amxdPath}: embedded patch differs from ${maxpatPath}`);
  }

  JSON.parse(payload);
}

function validateNoKnownBadWiring(text) {
  const forbidden = [
    "script sendbox ksh_editor_patch open",
    "script send ksh_editor_patch open",
    "\"source\": [\n            \"engine\",\n            2",
    "autopattr @greedy 1",
    "pattrstorage ksh_state",
    "r ksh_state_slots_update",
    "restore_slots",
    "ksh_pattr_refresh",
    "ksh_pattern_data_update",
    "@bindto ksh_engine",
    "ksh_engine_pattr",
    "pattr @varname ksh_pattern_data"
  ];

  for (let i = 0; i < forbidden.length; i += 1) {
    if (text.indexOf(forbidden[i]) !== -1) {
      fail(`${maxpatPath}: forbidden wiring or persistence artifact: ${forbidden[i]}`);
    }
  }
}

function hasLine(patcher, sourceId, sourceOutlet, destId, destInlet) {
  const lines = patcher.lines || [];

  for (let i = 0; i < lines.length; i += 1) {
    const patchline = lines[i].patchline;
    const source = patchline.source;
    const destination = patchline.destination;

    if (source[0] === sourceId
      && source[1] === sourceOutlet
      && destination[0] === destId
      && destination[1] === destInlet) {
      return true;
    }
  }

  return false;
}

function validateNativeScheduler(patcher, errors) {
  const boxes = boxMap(patcher);
  const expectedText = {
    "note-unpack": "unpack i i i i f",
    "note-delay": "pipe 0 0 0 0 0.",
    "makenote": "makenote 0 100 1 @repeatmode 1",
    "schedcmds": "r ksh_scheduler_commands",
    "route-scheduler-clear": "route clear",
    "clear-delay-msg": "clear",
    "stop-notes-msg": "stop"
  };
  const expectedLines = [
    ["engine", 0, "note-unpack", 0],
    ["note-unpack", 4, "note-delay", 4],
    ["note-unpack", 3, "note-delay", 3],
    ["note-unpack", 2, "note-delay", 2],
    ["note-unpack", 1, "note-delay", 1],
    ["note-unpack", 0, "note-delay", 0],
    ["note-delay", 3, "makenote", 3],
    ["note-delay", 2, "makenote", 2],
    ["note-delay", 1, "makenote", 1],
    ["note-delay", 0, "makenote", 0],
    ["makenote", 2, "noteout", 2],
    ["makenote", 1, "noteout", 1],
    ["makenote", 0, "noteout", 0],
    ["schedcmds", 0, "route-scheduler-clear", 0],
    ["route-scheduler-clear", 0, "clear-delay-msg", 0],
    ["route-scheduler-clear", 0, "stop-notes-msg", 0],
    ["clear-delay-msg", 0, "note-delay", 0],
    ["stop-notes-msg", 0, "makenote", 0]
  ];
  const lines = patcher.lines || [];

  for (const id of Object.keys(expectedText)) {
    if (!boxes.has(id)) {
      errors.push(`root: missing native scheduler box ${id}`);
    } else if (boxes.get(id).text !== expectedText[id]) {
      errors.push(`root: ${id} text ${JSON.stringify(boxes.get(id).text)} !== ${JSON.stringify(expectedText[id])}`);
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const patchline = lines[i].patchline;
    if (patchline.source[0] === "engine" && patchline.destination[0] === "noteout") {
      errors.push("root: engine must not be wired directly to noteout");
    }
  }

  for (const expected of expectedLines) {
    if (!hasLine(patcher, expected[0], expected[1], expected[2], expected[3])) {
      errors.push(`root: missing scheduler line ${expected[0]}:${expected[1]} -> ${expected[2]}:${expected[3]}`);
    }
  }
}

function validatePersistence(patcher, errors) {
  const boxes = boxMap(patcher);
  const engine = boxes.get("engine");
  const dirtyParam = boxes.get("dirty-param");
  const patternStore = boxes.get("pattern-store");

  if (!engine) {
    errors.push("root: missing engine box");
    return;
  }

  if (engine.varname !== "ksh_engine") {
    errors.push("root: engine varname must be ksh_engine");
  }

  if (engine.parameter_enable === 1 || String(engine.text || "").indexOf("@parameter_enable 1") !== -1) {
    errors.push("root: engine js object should not be a Live parameter; use pattern-store instead");
  }

  if (engine.saved_attribute_attributes && engine.saved_attribute_attributes.valueof) {
    errors.push("root: engine js object should not define Live valueof parameter attributes");
  }

  if (engine.numoutlets < 2) {
    errors.push("root: engine js object must expose outlet 1 for Live-set persistence");
  }

  if (!dirtyParam) {
    errors.push("root: missing dirty-param Live parameter");
    return;
  }

  if (dirtyParam.maxclass !== "live.numbox") {
    errors.push("root: dirty-param must be a live.numbox");
  }

  if (dirtyParam.parameter_enable !== 1) {
    errors.push("root: dirty-param must have parameter_enable 1");
  }

  if (!dirtyParam.saved_attribute_attributes || !dirtyParam.saved_attribute_attributes.valueof) {
    errors.push("root: dirty-param must define valueof parameter attributes");
    return;
  }

  if (dirtyParam.saved_attribute_attributes.valueof.parameter_invisible !== 0) {
    errors.push("root: dirty-param must be automated-and-stored so Live marks the set dirty");
  }

  if (!hasLine(patcher, "dirty-recv", 0, "dirty-param", 0)) {
    errors.push("root: missing dirty tick line dirty-recv:0 -> dirty-param:0");
  }

  if (!patternStore) {
    errors.push("root: missing pattern-store textedit persistence box");
    return;
  }

  if (patternStore.maxclass !== "textedit") {
    errors.push("root: pattern-store must be a textedit");
  }

  if (patternStore.parameter_enable !== 1) {
    errors.push("root: pattern-store must have parameter_enable 1 for Live-set storage");
  }

  if (patternStore.varname !== "ksh_pattern_data") {
    errors.push("root: pattern-store varname must be ksh_pattern_data");
  }

  if (!patternStore.saved_attribute_attributes || !patternStore.saved_attribute_attributes.valueof) {
    errors.push("root: pattern-store must define valueof parameter attributes");
    return;
  }

  if (patternStore.saved_attribute_attributes.valueof.parameter_type !== 3) {
    errors.push("root: pattern-store must use symbol parameter_type for JSON text");
  }

  if (patternStore.saved_attribute_attributes.valueof.parameter_invisible !== 0) {
    errors.push("root: pattern-store must be automated-and-stored");
  }

  if (hasLine(patcher, "engine", 1, "pattern-store", 0)) {
    errors.push("root: engine must write pattern-store via text message, not a patch cord");
  }

  if (hasLine(patcher, "pattern-store-prep", 0, "pattern-store", 0)) {
    errors.push("root: pattern-store must not use prepend set (JSON spaces break atoms)");
  }

  if (!hasLine(patcher, "pattern-store", 0, "pattern-restore-prep", 0)) {
    errors.push("root: missing pattern recall line pattern-store:0 -> pattern-restore-prep:0");
  }

  if (!boxes.has("pattern-pattr")) {
    errors.push("root: missing pattr pattern-pattr bound to ksh_pattern_data");
  }

  if (hasLine(patcher, "pattern-pattr", 0, "pattern-restore-prep", 0)) {
    errors.push("root: pattr must not feed pattern_data (get was being saved as the pattern)");
  }

  if (!hasLine(patcher, "pattern-restore-prep", 0, "engine", 0)) {
    errors.push("root: missing persistence line pattern-restore-prep:0 -> engine:0");
  }

  const restorePrep = boxes.get("pattern-restore-prep");
  if (!restorePrep || String(restorePrep.text || "").indexOf("pattern_data") === -1) {
    errors.push("root: pattern-restore-prep must prepend pattern_data (not setvalueof)");
  }

  if (!hasLine(patcher, "restore-defer", 0, "restore-wait", 0)) {
    errors.push("root: missing deferred pattern recall line restore-defer:0 -> restore-wait:0");
  }

  if (hasLine(patcher, "restore-wait", 0, "restore-pattr-get", 0)) {
    errors.push("root: recall must use restore_pattern_store only, not pattr get");
  }

  if (!hasLine(patcher, "restore-wait", 0, "restore-engine-msg", 0)) {
    errors.push("root: missing JS retry recall line restore-wait:0 -> restore-engine-msg:0");
  }

  if (!hasLine(patcher, "restore-engine-msg", 0, "engine", 0)) {
    errors.push("root: missing restore_pattern_store -> engine line");
  }

  if (!hasLine(patcher, "restore-loadbang", 0, "restore-loadbang-wait", 0)) {
    errors.push("root: missing loadmess recall line restore-loadbang:0 -> restore-loadbang-wait:0");
  }

  if (!hasLine(patcher, "restore-loadbang-wait", 0, "restore-engine-msg", 0)) {
    errors.push("root: missing delayed loadmess restore_pattern_store line");
  }

  if (hasLine(patcher, "restore-defer", 0, "initmsg", 0)) {
    errors.push("root: UI init must run after pattern recall via restore_pattern_store");
  }

  if (!boxes.has("thisdevice")) {
    errors.push("root: missing live.thisdevice readiness gate");
  }

  if (!hasLine(patcher, "loadbang", 0, "thisdevice", 0)) {
    errors.push("root: missing loadbang -> live.thisdevice line");
  }

  if (!hasLine(patcher, "thisdevice", 0, "restore-defer", 0)) {
    errors.push("root: missing restore readiness line thisdevice:0 -> restore-defer:0");
  }

  if (hasLine(patcher, "restore-defer", 0, "initmsg", 0)) {
    errors.push("root: UI init must not run in parallel with pattern recall");
  }

  if (hasLine(patcher, "thisdevice", 0, "initmsg", 0)) {
    errors.push("root: UI init must be deferred until after Live parameter restore");
  }

  if (!hasLine(patcher, "thisdevice", 0, "livepath", 0)) {
    errors.push("root: live.path must be triggered from live.thisdevice readiness");
  }

  if (!patcher.parameters) {
    errors.push("root: missing patcher parameters registry");
    return;
  }

  if (patcher.parameters.engine) {
    errors.push("root: parameters registry must not include engine");
  }

  if (!patcher.parameters["dirty-param"]) {
    errors.push("root: parameters registry must include dirty-param");
  }

  if (!patcher.parameters["pattern-store"]) {
    errors.push("root: parameters registry must include pattern-store");
  }

  const storeRegistry = patcher.parameters["pattern-store"];

  if (storeRegistry
    && patternStore.saved_attribute_attributes
    && patternStore.saved_attribute_attributes.valueof
    && storeRegistry[0] !== patternStore.saved_attribute_attributes.valueof.parameter_longname) {
    errors.push("root: pattern-store registry longname must match box parameter_longname");
  }
}

const patch = loadPatch();
const errors = [];

validateLines(patch.json.patcher, "root", errors);
validateAmxd(patch.text);
validateNoKnownBadWiring(patch.text);
validateNativeScheduler(patch.json.patcher, errors);
validatePersistence(patch.json.patcher, errors);

if (errors.length) {
  for (let i = 0; i < errors.length; i += 1) {
    fail(errors[i]);
  }
}

if (!process.exitCode) {
  console.log("device patch validation passed");
}
