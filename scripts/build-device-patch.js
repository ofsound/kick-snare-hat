const fs = require("fs");

function box(id, maxclass, text, rect, extra = {}) {
  const b = {
    id,
    maxclass,
    numinlets: extra.numinlets ?? 1,
    numoutlets: extra.numoutlets ?? 1,
    patching_rect: rect,
    ...extra
  };
  if (text) b.text = text;
  return { box: b };
}

function line(src, outlet, dst, inlet) {
  return { patchline: { source: [src, outlet], destination: [dst, inlet] } };
}

function editorSubpatcher() {
  return {
    fileversion: 1,
    appversion: {
      major: 8,
      minor: 6,
      revision: 0,
      architecture: "x64",
      modernui: 1
    },
    classnamespace: "box",
    rect: [120.0, 120.0, 900.0, 460.0],
    bglocked: 0,
    openinpresentation: 1,
    default_fontsize: 12.0,
    default_fontface: 0,
    default_fontname: "Ableton Sans Medium",
    toolbarvisible: 1,
    boxes: [
      box("editor-in", "inlet", "", [360.0, 470.0, 30.0, 22.0], {
        numinlets: 0,
        numoutlets: 1,
        outlettype: [""]
      }),
      {
        box: {
          id: "editor-ui",
          maxclass: "jsui",
          filename: "ksh_ui.js",
          jsarguments: ["editor"],
          varname: "ksh_editor_ui",
          numinlets: 1,
          numoutlets: 2,
          outlettype: ["", ""],
          patching_rect: [0.0, 0.0, 880.0, 420.0],
          presentation: 1,
          presentation_rect: [0.0, 0.0, 880.0, 420.0]
        }
      },
      box("editor-out", "outlet", "", [420.0, 470.0, 30.0, 22.0], {
        numinlets: 1,
        numoutlets: 0
      }),
      box("editor-cmds", "newobj", "r ksh_ui_commands", [40.0, 470.0, 120.0, 22.0], {
        numinlets: 0,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("editor-events", "newobj", "r ksh_engine_events", [190.0, 470.0, 128.0, 22.0], {
        numinlets: 0,
        numoutlets: 1,
        outlettype: [""]
      })
    ],
    lines: [
      line("editor-in", 0, "editor-ui", 0),
      line("editor-ui", 0, "editor-out", 0),
      line("editor-cmds", 0, "editor-ui", 0),
      line("editor-events", 0, "editor-ui", 0)
    ]
  };
}

const patch = {
  patcher: {
    fileversion: 1,
    appversion: {
      major: 8,
      minor: 6,
      revision: 0,
      architecture: "x64",
      modernui: 1
    },
    classnamespace: "box",
    rect: [80.0, 80.0, 900.0, 220.0],
    bglocked: 0,
    openinpresentation: 1,
    openrect: [0.0, 0.0, 900.0, 220.0],
    devicewidth: 0.0,
    statusbarvisible: 2,
    default_fontsize: 12.0,
    default_fontface: 0,
    default_fontname: "Ableton Sans Medium",
    gridonopen: 1,
    gridsize: [15.0, 15.0],
    toolbarvisible: 1,
    boxes: [
      {
        box: {
          id: "ui",
          maxclass: "jsui",
          filename: "ksh_compact_ui.js",
          varname: "ksh_compact_ui",
          numinlets: 1,
          numoutlets: 2,
          outlettype: ["", ""],
          patching_rect: [20.0, 20.0, 880.0, 160.0],
          presentation: 1,
          presentation_rect: [0.0, 0.0, 880.0, 160.0]
        }
      },
      {
        box: {
          id: "editor_patch",
          maxclass: "newobj",
          text: "p ksh_editor",
          varname: "ksh_editor_patch",
          patching_rect: [40.0, 940.0, 92.0, 22.0],
          numinlets: 1,
          numoutlets: 1,
          outlettype: [""],
          patcher: editorSubpatcher()
        }
      },
      box("engine", "newobj", "js ksh_engine.js", [540.0, 800.0, 120.0, 22.0], {
        varname: "ksh_engine",
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("noteout", "newobj", "noteout", [540.0, 860.0, 58.0, 22.0], {
        numinlets: 1,
        numoutlets: 0
      }),
      box("midiin", "newobj", "midiin", [440.0, 860.0, 50.0, 22.0], {
        numinlets: 0,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("metro", "newobj", "metro 16n @active 1", [180.0, 800.0, 128.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: ["bang"]
      }),
      box("stepmsg", "message", "step", [180.0, 840.0, 42.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("uilist", "newobj", "t a a a", [360.0, 760.0, 66.0, 22.0], {
        numinlets: 1,
        numoutlets: 3,
        outlettype: ["", "", ""]
      }),
      box("route-rate", "newobj", "route rate", [300.0, 800.0, 70.0, 22.0], {
        numinlets: 1,
        numoutlets: 2,
        outlettype: ["", ""]
      }),
      box("interval", "newobj", "prepend interval", [300.0, 840.0, 108.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("route-open", "newobj", "route open_editor", [430.0, 800.0, 112.0, 22.0], {
        numinlets: 1,
        numoutlets: 2,
        outlettype: ["", ""]
      }),
      box("openmsg", "message", "open", [430.0, 840.0, 42.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("pcontrol", "newobj", "pcontrol", [430.0, 880.0, 62.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("sendcmd", "newobj", "s ksh_ui_commands", [520.0, 840.0, 120.0, 22.0], {
        numinlets: 1,
        numoutlets: 0
      }),
      box("recvcmd", "newobj", "r ksh_ui_commands", [40.0, 700.0, 120.0, 22.0], {
        numinlets: 0,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("recvevents", "newobj", "r ksh_engine_events", [40.0, 660.0, 128.0, 22.0], {
        numinlets: 0,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("enginecmds", "newobj", "r ksh_engine_commands", [540.0, 760.0, 152.0, 22.0], {
        numinlets: 0,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("loadbang", "newobj", "loadbang", [40.0, 760.0, 60.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: ["bang"]
      }),
      box("initmsg", "message", "init", [40.0, 800.0, 38.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("livepath", "newobj", "live.path live_set", [720.0, 760.0, 112.0, 22.0], {
        numinlets: 1,
        numoutlets: 2,
        outlettype: ["", ""]
      }),
      box("observer", "newobj", "live.observer is_playing", [720.0, 800.0, 142.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("selstop", "newobj", "sel 0", [720.0, 840.0, 42.0, 22.0], {
        numinlets: 2,
        numoutlets: 2,
        outlettype: ["bang", ""]
      }),
      box("resetmsg", "message", "reset", [720.0, 880.0, 46.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("autopattr", "newobj", "autopattr @greedy 1", [920.0, 760.0, 112.0, 22.0], {
        numinlets: 1,
        numoutlets: 4,
        outlettype: ["", "", "", ""]
      }),
      box("pattrstorage", "newobj", "pattrstorage ksh_state @greedy 1 @savemode 0", [920.0, 800.0, 260.0, 22.0], {
        varname: "ksh_state",
        numinlets: 1,
        numoutlets: 4,
        outlettype: ["", "", "", ""]
      })
    ],
    lines: [
      line("ui", 0, "route-open", 0),
      line("editor_patch", 0, "route-open", 0),
      line("uilist", 1, "route-rate", 0),
      line("uilist", 2, "sendcmd", 0),
      line("route-rate", 0, "interval", 0),
      line("interval", 0, "metro", 0),
      line("route-open", 0, "openmsg", 0),
      line("route-open", 1, "uilist", 0),
      line("openmsg", 0, "pcontrol", 0),
      line("pcontrol", 0, "editor_patch", 0),
      line("recvcmd", 0, "ui", 0),
      line("recvevents", 0, "ui", 0),
      line("enginecmds", 0, "engine", 0),
      line("engine", 0, "noteout", 0),
      line("metro", 0, "stepmsg", 0),
      line("stepmsg", 0, "engine", 0),
      line("loadbang", 0, "initmsg", 0),
      line("initmsg", 0, "ui", 0),
      line("loadbang", 0, "livepath", 0),
      line("livepath", 0, "observer", 0),
      line("observer", 0, "selstop", 0),
      line("selstop", 0, "resetmsg", 0),
      line("resetmsg", 0, "engine", 0)
    ],
    dependency_cache: [
      { name: "ksh_engine.js", bootpath: ".", type: "TEXT", implicit: 1 },
      { name: "ksh_ui.js", bootpath: ".", type: "TEXT", implicit: 1 },
      { name: "ksh_compact_ui.js", bootpath: ".", type: "TEXT", implicit: 1 }
    ]
  }
};

const json = JSON.stringify(patch, null, 2);
fs.writeFileSync("kick-snare-hat.maxpat", json);
const payload = Buffer.from(json, "utf8");
const header = Buffer.alloc(32);
header.write("ampf", 0, "ascii");
header.writeUInt32LE(4, 4);
header.write("mmmmmeta", 8, "ascii");
header.writeUInt32LE(4, 16);
header.writeUInt32LE(0, 20);
header.write("ptch", 24, "ascii");
header.writeUInt32LE(payload.length, 28);
fs.writeFileSync("Kick-Snare-Hat.amxd", Buffer.concat([header, payload]));
console.log("wrote kick-snare-hat.maxpat and Kick-Snare-Hat.amxd");
