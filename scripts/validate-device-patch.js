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
    "\"source\": [\n            \"engine\",\n            1",
    "\"source\": [\n            \"engine\",\n            2"
  ];

  for (let i = 0; i < forbidden.length; i += 1) {
    if (text.indexOf(forbidden[i]) !== -1) {
      fail(`${maxpatPath}: forbidden stale wiring found: ${forbidden[i]}`);
    }
  }
}

const patch = loadPatch();
const errors = [];

validateLines(patch.json.patcher, "root", errors);
validateAmxd(patch.text);
validateNoKnownBadWiring(patch.text);

if (errors.length) {
  for (let i = 0; i < errors.length; i += 1) {
    fail(errors[i]);
  }
}

if (!process.exitCode) {
  console.log("device patch validation passed");
}
