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

function persistenceParameterRegistry() {
  return {
    "dirty-param": ["ksh_dirty_revision", "KSH Dirty", 0],
    "pattern-store": ["ksh_pattern_data", "KSH Pattern", 0]
  };
}

function liveToggleBox(id, varname, shortname, order, rect, options) {
  options = options || {};
  return {
    box: {
      id,
      maxclass: "live.toggle",
      varname,
      numinlets: 1,
      numoutlets: 1,
      outlettype: ["int"],
      patching_rect: rect,
      presentation: options.presentation ? 1 : 0,
      presentation_rect: options.presentationRect || rect,
      hidden: options.hidden ? 1 : 0,
      layer: options.layer === undefined ? 0 : options.layer,
      parameter_enable: 1,
      parameter_mappable: 1,
      saved_attribute_attributes: {
        valueof: {
          parameter_linknames: 0,
          parameter_order: order,
          parameter_invisible: 0,
          parameter_type: 2,
          parameter_initial: [0],
          parameter_initial_enable: 1,
          parameter_shortname: shortname,
          parameter_longname: varname,
          parameter_mappable: 1
        }
      }
    }
  };
}

function nativeTimingBoxes() {
  return [
    box("native-meta-recv", "newobj", "r ksh_native_meta", [180.0, 1000.0, 120.0, 22.0], {
      numinlets: 0,
      numoutlets: 1,
      outlettype: [""]
    }),
    box("native-meta-route", "newobj", "route meta", [180.0, 1040.0, 70.0, 22.0], {
      numinlets: 1,
      numoutlets: 2,
      outlettype: ["", ""]
    }),
    box("native-meta-unpack", "newobj", "unpack f f i", [260.0, 1000.0, 80.0, 22.0], {
      numinlets: 1,
      numoutlets: 3,
      outlettype: ["float", "float", "int"]
    }),
    box("native-bps", "newobj", "f 0.25", [260.0, 1040.0, 40.0, 22.0], {
      numinlets: 1,
      numoutlets: 1,
      outlettype: ["float"]
    }),
    box("native-phase", "newobj", "f 0.", [260.0, 1080.0, 40.0, 22.0], {
      numinlets: 1,
      numoutlets: 1,
      outlettype: ["float"]
    }),
    box("native-steps", "newobj", "i 16", [260.0, 1120.0, 40.0, 22.0], {
      numinlets: 1,
      numoutlets: 1,
      outlettype: ["int"]
    }),
    box("native-step-expr", "newobj", "expr floor((($f1-$f2)/$f3)+0.000001)%$f4", [340.0, 1040.0, 220.0, 22.0], {
      numinlets: 4,
      numoutlets: 1,
      outlettype: ["int"]
    }),
    box("native-step-input-gate", "newobj", "gate", [380.0, 1060.0, 40.0, 22.0], {
      numinlets: 2,
      numoutlets: 1,
      outlettype: [""]
    }),
    box("native-mode-gate", "newobj", "gate", [420.0, 1080.0, 40.0, 22.0], {
      numinlets: 2,
      numoutlets: 1,
      outlettype: [""]
    }),
    box("native-step-change", "newobj", "change", [480.0, 1080.0, 50.0, 22.0], {
      numinlets: 1,
      numoutlets: 2,
      outlettype: ["bang", "int"]
    }),
    box("native-step-reset-msg", "message", "set -1", [480.0, 1120.0, 54.0, 22.0], {
      numinlets: 2,
      numoutlets: 1,
      outlettype: [""]
    }),
    box("native-step-reset-recv", "newobj", "r ksh_native_step_reset", [560.0, 1120.0, 150.0, 22.0], {
      numinlets: 0,
      numoutlets: 1,
      outlettype: [""]
    }),
    box("native-transport-unpack", "newobj", "unpack s f i", [180.0, 1160.0, 90.0, 22.0], {
      numinlets: 1,
      numoutlets: 3,
      outlettype: ["", "float", "int"]
    }),
    box("native-timing-gate-recv", "newobj", "r ksh_native_timing_gate", [480.0, 1040.0, 160.0, 22.0], {
      numinlets: 0,
      numoutlets: 1,
      outlettype: ["int"]
    }),
    box("native-playback-cmds", "newobj", "r ksh_native_playback_commands", [600.0, 1040.0, 190.0, 22.0], {
      numinlets: 0,
      numoutlets: 1,
      outlettype: [""]
    }),
    box("native-playback-coll", "newobj", "coll ksh_native_playback", [600.0, 1080.0, 150.0, 22.0], {
      numinlets: 1,
      numoutlets: 4,
      outlettype: ["", "", "", ""]
    }),
    box("native-hit-iter", "newobj", "zl.iter 9", [600.0, 1120.0, 62.0, 22.0], {
      numinlets: 2,
      numoutlets: 2,
      outlettype: ["", ""]
    }),
    box("native-hit-unpack", "newobj", "unpack i i i i f i i i i", [660.0, 1120.0, 150.0, 22.0], {
      numinlets: 1,
      numoutlets: 9,
      outlettype: ["int", "int", "int", "int", "float", "int", "int", "int", "int"]
    }),
    box("native-hit-ui-pack", "newobj", "pack i i i i", [820.0, 1120.0, 60.0, 22.0], {
      numinlets: 4,
      numoutlets: 1,
      outlettype: [""]
    }),
    box("native-hit-ui-prep", "newobj", "prepend note_hit", [820.0, 1160.0, 100.0, 22.0], {
      numinlets: 1,
      numoutlets: 1,
      outlettype: [""]
    }),
    box("native-hit-events", "newobj", "s ksh_engine_events", [820.0, 1200.0, 128.0, 22.0], {
      numinlets: 1,
      numoutlets: 0,
      outlettype: []
    })
  ];
}

function nativeTimingLines() {
  return [
    line("native-meta-recv", 0, "native-meta-route", 0),
    line("native-meta-route", 0, "native-meta-unpack", 0),
    line("native-meta-unpack", 0, "native-bps", 0),
    line("native-meta-unpack", 1, "native-phase", 0),
    line("native-meta-unpack", 2, "native-steps", 0),
    line("transportbeat", 0, "native-step-expr", 0),
    line("native-phase", 0, "native-step-expr", 1),
    line("native-bps", 0, "native-step-expr", 2),
    line("native-steps", 0, "native-step-expr", 3),
    line("native-step-expr", 0, "native-step-input-gate", 1),
    line("native-transport-unpack", 2, "native-step-input-gate", 0),
    line("native-step-input-gate", 0, "native-mode-gate", 1),
    line("native-timing-gate-recv", 0, "native-mode-gate", 0),
    line("native-mode-gate", 0, "native-step-change", 0),
    line("native-step-reset-msg", 0, "native-step-change", 0),
    line("native-step-reset-recv", 0, "native-step-change", 0),
    line("transportpos", 0, "native-transport-unpack", 0),
    line("native-step-change", 0, "native-playback-coll", 0),
    line("native-playback-cmds", 0, "native-playback-coll", 0),
    line("native-playback-coll", 0, "native-hit-iter", 0),
    line("native-hit-iter", 0, "native-hit-unpack", 0),
    line("native-hit-unpack", 0, "note-delay", 0),
    line("native-hit-unpack", 1, "note-delay", 1),
    line("native-hit-unpack", 2, "note-delay", 2),
    line("native-hit-unpack", 3, "note-delay", 3),
    line("native-hit-unpack", 4, "note-delay", 4),
    line("native-hit-unpack", 5, "native-hit-ui-pack", 0),
    line("native-hit-unpack", 6, "native-hit-ui-pack", 1),
    line("native-hit-unpack", 7, "native-hit-ui-pack", 2),
    line("native-hit-unpack", 8, "native-hit-ui-pack", 3),
    line("native-hit-ui-pack", 0, "native-hit-ui-prep", 0),
    line("native-hit-ui-prep", 0, "native-hit-events", 0)
  ];
}

function editorDimensions(stepCount, laneCount) {
  const gridCellW = 25;
  const gridCellH = 22;
  const gridX0 = 12 + 158 + 84;
  const gridW = stepCount * gridCellW;
  const patternMinRightPad = 56;
  const sourceGridY0 = 68 + 12 + 22 + 34;
  const sourceBlockH = laneCount * gridCellH;
  const generatedGridY0 = sourceGridY0 + sourceBlockH + 60;
  const generatedBottom = generatedGridY0 + laneCount * gridCellH + 18;
  const footerY = generatedBottom + 8;
  const width = Math.max(1024, gridX0 + gridW + patternMinRightPad + 12);

  return {
    width,
    height: footerY + 28
  };
}

function editorSubpatcher() {
  const editorSize = editorDimensions(16, 3);

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
    rect: [120.0, 120.0, editorSize.width, editorSize.height],
    bglocked: 0,
    openinpresentation: 1,
    default_fontsize: 12.0,
    default_fontface: 0,
    default_fontname: "Ableton Sans Medium",
    toolbarvisible: 0,
    title: "Kick Snare Hat",
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
          numoutlets: 1,
          outlettype: [""],
          patching_rect: [0.0, 0.0, editorSize.width, editorSize.height],
          presentation: 1,
          presentation_rect: [0.0, 0.0, editorSize.width, editorSize.height],
          layer: 0
        }
      },
      // Inline lane-label rename overlay: a real Max textedit sitting on a
      // higher layer than the jsui so it always paints above the lanes panel
      // when shown. ksh_ui.js positions and shows/hides it via the
      // label_edit_* messages routed below.
      {
        box: {
          id: "lane-textedit",
          maxclass: "textedit",
          varname: "lane_label_edit",
          numinlets: 1,
          numoutlets: 4,
          outlettype: ["", "", "", ""],
          patching_rect: [40.0, 600.0, 120.0, 22.0],
          presentation: 1,
          presentation_rect: [30.0, 106.0, 70.0, 19.0],
          layer: 1,
          hidden: 1,
          keymode: 1,
          fontsize: 13.0,
          fontname: "Ableton Sans Medium",
          bgcolor: [0.10, 0.11, 0.13, 1.0],
          textcolor: [0.96, 0.62, 0.22, 1.0]
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
      }),
      // jsui onkeydown does not reliably receive focus in Live. Use Max's
      // global key object while the editor patcher is open to switch the
      // Source Pattern edit layer with number keys 1/2/3.
      box("editor-key", "newobj", "key", [560.0, 470.0, 36.0, 22.0], {
        numinlets: 0,
        numoutlets: 4,
        outlettype: ["int", "int", "int", "int"]
      }),
      box("editor-key-select", "newobj", "sel 49 50 51", [560.0, 500.0, 100.0, 22.0], {
        numinlets: 1,
        numoutlets: 4,
        outlettype: ["bang", "bang", "bang", ""]
      }),
      box("editor-key-velocity", "message", "source_layer_mode velocity", [560.0, 530.0, 150.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("editor-key-cycle", "message", "source_layer_mode cycle", [560.0, 560.0, 140.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("editor-key-probability", "message", "source_layer_mode probability", [560.0, 590.0, 176.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("editor-pass", "newobj", "t a", [360.0, 430.0, 36.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
      // Intercept the lane-rename overlay messages emitted by the jsui so
      // they never reach the parent patcher (they stay inside the editor
      // subpatcher); the unmatched 4th outlet preserves the existing
      // outbound message flow (open_editor, etc.).
      box(
        "editor-label-route",
        "newobj",
        "route label_edit_show label_edit_set label_edit_hide",
        [40.0, 540.0, 280.0, 22.0],
        {
          numinlets: 1,
          numoutlets: 4,
          outlettype: ["", "", "", ""]
        }
      ),
      // Right-to-left firing: position first, then unhide, then grab focus.
      box("editor-show-trigger", "newobj", "t b b l", [40.0, 570.0, 100.0, 22.0], {
        numinlets: 1,
        numoutlets: 3,
        outlettype: ["bang", "bang", ""]
      }),
      box(
        "editor-pos-prep",
        "newobj",
        "prepend presentation_rect",
        [40.0, 600.0, 180.0, 22.0],
        {
          numinlets: 1,
          numoutlets: 1,
          outlettype: [""]
        }
      ),
      box("editor-unhide-msg", "message", "hidden 0", [180.0, 600.0, 60.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("editor-select-msg", "message", "select", [260.0, 600.0, 60.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("editor-hide-msg", "message", "hidden 1", [340.0, 600.0, 60.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("editor-set-prep", "newobj", "prepend set", [420.0, 600.0, 80.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
      // textedit's left outlet emits "text <buffer>" — see the textedit
      // reference. Strip the documented "text" prefix before forwarding the
      // committed value back to the jsui.
      box("editor-done-route", "newobj", "route text", [180.0, 640.0, 80.0, 22.0], {
        numinlets: 1,
        numoutlets: 2,
        outlettype: ["", ""]
      }),
      box(
        "editor-done-prep",
        "newobj",
        "prepend label_edit_done",
        [180.0, 680.0, 160.0, 22.0],
        {
          numinlets: 1,
          numoutlets: 1,
          outlettype: [""]
        }
      )
    ],
    lines: [
      line("editor-in", 0, "editor-ui", 0),
      line("editor-ui", 0, "editor-label-route", 0),
      line("editor-label-route", 0, "editor-show-trigger", 0),
      line("editor-label-route", 1, "editor-set-prep", 0),
      line("editor-label-route", 2, "editor-hide-msg", 0),
      line("editor-label-route", 3, "editor-pass", 0),
      line("editor-show-trigger", 0, "editor-select-msg", 0),
      line("editor-show-trigger", 1, "editor-unhide-msg", 0),
      line("editor-show-trigger", 2, "editor-pos-prep", 0),
      line("editor-pos-prep", 0, "lane-textedit", 0),
      line("editor-unhide-msg", 0, "lane-textedit", 0),
      line("editor-select-msg", 0, "lane-textedit", 0),
      line("editor-hide-msg", 0, "lane-textedit", 0),
      line("editor-set-prep", 0, "lane-textedit", 0),
      line("lane-textedit", 0, "editor-done-route", 0),
      line("editor-done-route", 0, "editor-done-prep", 0),
      line("editor-done-prep", 0, "editor-ui", 0),
      line("editor-pass", 0, "editor-out", 0),
      line("editor-cmds", 0, "editor-ui", 0),
      line("editor-events", 0, "editor-ui", 0),
      line("editor-key", 0, "editor-key-select", 0),
      line("editor-key-select", 0, "editor-key-velocity", 0),
      line("editor-key-select", 1, "editor-key-cycle", 0),
      line("editor-key-select", 2, "editor-key-probability", 0),
      line("editor-key-velocity", 0, "editor-ui", 0),
      line("editor-key-cycle", 0, "editor-ui", 0),
      line("editor-key-probability", 0, "editor-ui", 0)
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
    rect: [80.0, 80.0, 736.0, 176.0],
    bglocked: 0,
    openinpresentation: 1,
    openrect: [0.0, 0.0, 736.0, 176.0],
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
          numoutlets: 1,
          outlettype: [""],
          patching_rect: [20.0, 20.0, 736.0, 176.0],
          presentation: 1,
          presentation_rect: [0.0, 0.0, 736.0, 176.0],
          layer: 0
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
      box("note-unpack", "newobj", "unpack i i i i f", [540.0, 840.0, 112.0, 22.0], {
        numinlets: 1,
        numoutlets: 5,
        outlettype: ["int", "int", "int", "int", "float"]
      }),
      box("note-delay", "newobj", "pipe 0 0 0 0 0.", [540.0, 880.0, 126.0, 22.0], {
        numinlets: 5,
        numoutlets: 4,
        outlettype: ["int", "int", "int", "int"]
      }),
      box("makenote", "newobj", "makenote 0 100 1 @repeatmode 1", [540.0, 920.0, 200.0, 22.0], {
        numinlets: 4,
        numoutlets: 3,
        outlettype: ["int", "int", "int"]
      }),
      box("noteout", "newobj", "noteout", [540.0, 960.0, 58.0, 22.0], {
        numinlets: 3,
        numoutlets: 0
      }),
      box("schedcmds", "newobj", "r ksh_scheduler_commands", [760.0, 840.0, 160.0, 22.0], {
        numinlets: 0,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("route-scheduler-clear", "newobj", "route clear", [760.0, 880.0, 82.0, 22.0], {
        numinlets: 1,
        numoutlets: 2,
        outlettype: ["", ""]
      }),
      box("clear-delay-msg", "message", "clear", [760.0, 920.0, 46.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("stop-notes-msg", "message", "stop", [820.0, 920.0, 42.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("plugsync", "newobj", "plugsync~", [180.0, 800.0, 78.0, 22.0], {
        numinlets: 1,
        numoutlets: 9,
        outlettype: ["int", "int", "int", "float", "list", "float", "float", "int", "int"]
      }),
      box("transportbeat", "newobj", "t f b f", [180.0, 840.0, 62.0, 22.0], {
        numinlets: 1,
        numoutlets: 3,
        outlettype: ["float", "bang", "float"]
      }),
      box("transportpos", "newobj", "pack transport_position 0. 0", [180.0, 880.0, 170.0, 22.0], {
        numinlets: 3,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("uilist", "newobj", "t a a", [360.0, 760.0, 48.0, 22.0], {
        numinlets: 1,
        numoutlets: 2,
        outlettype: ["", ""]
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
      box("dirty-recv", "newobj", "r ksh_dirty_tick", [840.0, 800.0, 110.0, 22.0], {
        numinlets: 0,
        numoutlets: 1,
        outlettype: [""]
      }),
      {
        box: {
          id: "dirty-param",
          maxclass: "live.numbox",
          varname: "ksh_dirty_revision",
          numinlets: 1,
          numoutlets: 2,
          outlettype: ["", "float"],
          patching_rect: [840.0, 840.0, 80.0, 22.0],
          hidden: 1,
          parameter_enable: 1,
          parameter_mappable: 0,
          saved_attribute_attributes: {
            valueof: {
              parameter_linknames: 0,
              parameter_order: 1,
              parameter_invisible: 0,
              parameter_mmin: 0.0,
              parameter_mmax: 1000000.0,
              parameter_initial: [0.0],
              parameter_type: 0,
              parameter_initial_enable: 1,
              parameter_shortname: "KSH Dirty",
              parameter_longname: "ksh_dirty_revision",
              parameter_mappable: 0,
              parameter_unitstyle: 0
            }
          }
        }
      },
      {
        box: {
          id: "pattern-store",
          maxclass: "textedit",
          varname: "ksh_pattern_data",
          numinlets: 1,
          numoutlets: 4,
          patching_rect: [1060.0, 840.0, 320.0, 22.0],
          outlettype: ["", "", "", ""],
          hidden: 1,
          parameter_enable: 1,
          parameter_mappable: 0,
          fontsize: 10,
          keymode: 0,
          saved_attribute_attributes: {
            valueof: {
              parameter_linknames: 0,
              parameter_order: 2,
              parameter_invisible: 0,
              parameter_type: 3,
              parameter_initial_enable: 0,
              parameter_shortname: "KSH Pattern",
              parameter_longname: "ksh_pattern_data",
              parameter_mappable: 0
            }
          }
        }
      },
      box("pattern-pattr", "newobj", "pattr @bindto ksh_pattern_data", [1060.0, 880.0, 180.0, 22.0], {
        numinlets: 1,
        numoutlets: 3,
        outlettype: ["", "", ""]
      }),
      box("pattern-restore-prep", "newobj", "prepend pattern_data", [1060.0, 920.0, 130.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("restore-engine-msg", "message", "restore_pattern_store", [1060.0, 960.0, 150.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("restore-wait", "newobj", "delay 100", [1060.0, 1040.0, 60.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("restore-defer", "newobj", "deferlow", [1060.0, 840.0, 60.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("restore-loadbang", "newobj", "loadmess 1", [1060.0, 1080.0, 70.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("restore-loadbang-wait", "newobj", "delay 300", [1060.0, 1120.0, 70.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("midi-notein", "newobj", "notein", [180.0, 700.0, 50.0, 22.0], {
        numinlets: 1,
        numoutlets: 3,
        outlettype: ["int", "int", "int"]
      }),
      box("midi-stripnote", "newobj", "stripnote", [180.0, 740.0, 64.0, 22.0], {
        numinlets: 2,
        numoutlets: 2,
        outlettype: ["int", "int"]
      }),
      box("midi-source-select", "newobj", "sel 0 1 2 3", [180.0, 780.0, 110.0, 22.0], {
        numinlets: 2,
        numoutlets: 5,
        outlettype: ["bang", "bang", "bang", "bang", ""]
      }),
      box("midi-source-1", "message", "static_source 1", [300.0, 700.0, 100.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("midi-source-2", "message", "static_source 2", [300.0, 730.0, 100.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("midi-source-3", "message", "static_source 3", [300.0, 760.0, 100.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("midi-source-4", "message", "static_source 4", [300.0, 790.0, 100.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("loadbang", "newobj", "loadbang", [40.0, 760.0, 60.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: ["bang"]
      }),
      box("thisdevice", "newobj", "live.thisdevice", [120.0, 760.0, 100.0, 22.0], {
        numinlets: 1,
        numoutlets: 2,
        outlettype: ["bang", "int"]
      }),
      box("initmsg", "message", "init", [40.0, 800.0, 38.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      // Live state column (x≈720): livepath fans out into two parallel
      // sub-columns — the transport-stop chain (is_playing → sel 0 → reset)
      // straight down at x=720, and the tempo chain
      // (live.observer tempo → prepend tempo → engine) at x=880.
      box("livepath", "newobj", "live.path live_set", [720.0, 700.0, 112.0, 22.0], {
        numinlets: 1,
        numoutlets: 2,
        outlettype: ["", ""]
      }),
      box("observer", "newobj", "live.observer is_playing", [720.0, 740.0, 142.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("selstop", "newobj", "sel 0", [720.0, 780.0, 42.0, 22.0], {
        numinlets: 2,
        numoutlets: 2,
        outlettype: ["bang", ""]
      }),
      box("resetmsg", "message", "reset", [720.0, 820.0, 46.0, 22.0], {
        numinlets: 2,
        numoutlets: 1,
        outlettype: [""]
      }),
      ...nativeTimingBoxes(),
      box("tempo_observer", "newobj", "live.observer tempo", [880.0, 740.0, 130.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
      box("tempoprep", "newobj", "prepend tempo", [880.0, 780.0, 100.0, 22.0], {
        numinlets: 1,
        numoutlets: 1,
        outlettype: [""]
      }),
    ],
    lines: [
      line("ui", 0, "route-open", 0),
      line("editor_patch", 0, "route-open", 0),
      line("uilist", 1, "sendcmd", 0),
      line("route-open", 0, "openmsg", 0),
      line("route-open", 1, "uilist", 0),
      line("openmsg", 0, "pcontrol", 0),
      line("pcontrol", 0, "editor_patch", 0),
      line("recvcmd", 0, "ui", 0),
      line("recvevents", 0, "ui", 0),
      line("enginecmds", 0, "engine", 0),
      line("dirty-recv", 0, "dirty-param", 0),
      line("pattern-store", 0, "pattern-restore-prep", 0),
      line("restore-loadbang", 0, "restore-loadbang-wait", 0),
      line("restore-loadbang-wait", 0, "restore-engine-msg", 0),
      line("pattern-restore-prep", 0, "engine", 0),
      line("thisdevice", 0, "restore-defer", 0),
      line("restore-defer", 0, "restore-wait", 0),
      line("restore-wait", 0, "restore-engine-msg", 0),
      line("restore-engine-msg", 0, "engine", 0),
      line("midi-notein", 0, "midi-stripnote", 0),
      line("midi-notein", 1, "midi-stripnote", 1),
      line("midi-stripnote", 0, "midi-source-select", 0),
      line("midi-source-select", 0, "midi-source-1", 0),
      line("midi-source-select", 1, "midi-source-2", 0),
      line("midi-source-select", 2, "midi-source-3", 0),
      line("midi-source-select", 3, "midi-source-4", 0),
      line("midi-source-1", 0, "engine", 0),
      line("midi-source-2", 0, "engine", 0),
      line("midi-source-3", 0, "engine", 0),
      line("midi-source-4", 0, "engine", 0),
      line("engine", 0, "note-unpack", 0),
      line("note-unpack", 4, "note-delay", 4),
      line("note-unpack", 3, "note-delay", 3),
      line("note-unpack", 2, "note-delay", 2),
      line("note-unpack", 1, "note-delay", 1),
      line("note-unpack", 0, "note-delay", 0),
      ...nativeTimingLines(),
      line("note-delay", 3, "makenote", 3),
      line("note-delay", 2, "makenote", 2),
      line("note-delay", 1, "makenote", 1),
      line("note-delay", 0, "makenote", 0),
      line("makenote", 2, "noteout", 2),
      line("makenote", 1, "noteout", 1),
      line("makenote", 0, "noteout", 0),
      line("schedcmds", 0, "route-scheduler-clear", 0),
      line("route-scheduler-clear", 0, "clear-delay-msg", 0),
      line("route-scheduler-clear", 0, "stop-notes-msg", 0),
      line("clear-delay-msg", 0, "note-delay", 0),
      line("stop-notes-msg", 0, "makenote", 0),
      line("plugsync", 0, "transportpos", 2),
      line("plugsync", 6, "transportbeat", 0),
      line("transportbeat", 2, "transportpos", 1),
      line("transportbeat", 1, "transportpos", 0),
      line("transportpos", 0, "engine", 0),
      line("loadbang", 0, "thisdevice", 0),
      line("initmsg", 0, "ui", 0),
      line("thisdevice", 0, "livepath", 0),
      line("livepath", 0, "observer", 0),
      line("livepath", 0, "tempo_observer", 0),
      line("tempo_observer", 0, "tempoprep", 0),
      line("tempoprep", 0, "engine", 0),
      line("observer", 0, "selstop", 0),
      line("selstop", 0, "resetmsg", 0),
      line("selstop", 0, "native-step-reset-msg", 0),
      line("loadbang", 0, "native-step-reset-msg", 0),
      line("resetmsg", 0, "engine", 0)
    ],
    dependency_cache: [
      { name: "ksh_engine.js", bootpath: ".", type: "TEXT", implicit: 1 },
      { name: "ksh_ui.js", bootpath: ".", type: "TEXT", implicit: 1 },
      { name: "ksh_compact_ui.js", bootpath: ".", type: "TEXT", implicit: 1 },
      { name: "ksh_ui_shared.js", bootpath: ".", type: "TEXT", implicit: 1 },
      { name: "ksh_constants.js", bootpath: ".", type: "TEXT", implicit: 1 }
    ],
    parameters: persistenceParameterRegistry()
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

require("./sync-user-library.js")();
