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

function hasLine(patcher, src, outlet, dst, inlet) {
  const lines = patcher.lines || [];

  for (let i = 0; i < lines.length; i += 1) {
    const patchline = lines[i].patchline;
    const source = patchline.source;
    const destination = patchline.destination;

    if (source[0] === src && source[1] === outlet && destination[0] === dst && destination[1] === inlet) {
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

const patch = loadPatch();
const errors = [];

validateLines(patch.json.patcher, "root", errors);
validateAmxd(patch.text);
validateNoKnownBadWiring(patch.text);
validateNativeScheduler(patch.json.patcher, errors);

if (errors.length) {
  for (let i = 0; i < errors.length; i += 1) {
    fail(errors[i]);
  }
}

if (!process.exitCode) {
  console.log("device patch validation passed");
}
