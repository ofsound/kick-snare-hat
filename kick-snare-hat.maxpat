{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 8,
      "minor": 6,
      "revision": 0,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      80,
      80,
      900,
      220
    ],
    "bglocked": 0,
    "openinpresentation": 1,
    "openrect": [
      0,
      0,
      900,
      220
    ],
    "devicewidth": 0,
    "statusbarvisible": 2,
    "default_fontsize": 12,
    "default_fontface": 0,
    "default_fontname": "Ableton Sans Medium",
    "gridonopen": 1,
    "gridsize": [
      15,
      15
    ],
    "toolbarvisible": 1,
    "boxes": [
      {
        "box": {
          "id": "ui",
          "maxclass": "jsui",
          "filename": "ksh_compact_ui.js",
          "varname": "ksh_compact_ui",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            20,
            20,
            880,
            160
          ],
          "presentation": 1,
          "presentation_rect": [
            0,
            0,
            880,
            160
          ]
        }
      },
      {
        "box": {
          "id": "editor_patch",
          "maxclass": "newobj",
          "text": "p ksh_editor",
          "varname": "ksh_editor_patch",
          "patching_rect": [
            40,
            940,
            92,
            22
          ],
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patcher": {
            "fileversion": 1,
            "appversion": {
              "major": 8,
              "minor": 6,
              "revision": 0,
              "architecture": "x64",
              "modernui": 1
            },
            "classnamespace": "box",
            "rect": [
              120,
              120,
              968,
              352
            ],
            "bglocked": 0,
            "openinpresentation": 1,
            "default_fontsize": 12,
            "default_fontface": 0,
            "default_fontname": "Ableton Sans Medium",
            "toolbarvisible": 0,
            "title": "Kick Snare Hat",
            "boxes": [
              {
                "box": {
                  "id": "editor-in",
                  "maxclass": "inlet",
                  "numinlets": 0,
                  "numoutlets": 1,
                  "patching_rect": [
                    360,
                    470,
                    30,
                    22
                  ],
                  "outlettype": [
                    ""
                  ]
                }
              },
              {
                "box": {
                  "id": "editor-ui",
                  "maxclass": "jsui",
                  "filename": "ksh_ui.js",
                  "jsarguments": [
                    "editor"
                  ],
                  "varname": "ksh_editor_ui",
                  "numinlets": 1,
                  "numoutlets": 1,
                  "outlettype": [
                    ""
                  ],
                  "patching_rect": [
                    0,
                    0,
                    968,
                    352
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    0,
                    0,
                    968,
                    352
                  ],
                  "layer": 0
                }
              },
              {
                "box": {
                  "id": "editor-out",
                  "maxclass": "outlet",
                  "numinlets": 1,
                  "numoutlets": 0,
                  "patching_rect": [
                    420,
                    470,
                    30,
                    22
                  ]
                }
              },
              {
                "box": {
                  "id": "editor-cmds",
                  "maxclass": "newobj",
                  "numinlets": 0,
                  "numoutlets": 1,
                  "patching_rect": [
                    40,
                    470,
                    120,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "r ksh_ui_commands"
                }
              },
              {
                "box": {
                  "id": "editor-events",
                  "maxclass": "newobj",
                  "numinlets": 0,
                  "numoutlets": 1,
                  "patching_rect": [
                    190,
                    470,
                    128,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "r ksh_engine_events"
                }
              },
              {
                "box": {
                  "id": "editor-pass",
                  "maxclass": "newobj",
                  "numinlets": 1,
                  "numoutlets": 1,
                  "patching_rect": [
                    360,
                    430,
                    36,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "t a"
                }
              }
            ],
            "lines": [
              {
                "patchline": {
                  "source": [
                    "editor-in",
                    0
                  ],
                  "destination": [
                    "editor-ui",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-ui",
                    0
                  ],
                  "destination": [
                    "editor-pass",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-pass",
                    0
                  ],
                  "destination": [
                    "editor-out",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-cmds",
                    0
                  ],
                  "destination": [
                    "editor-ui",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-events",
                    0
                  ],
                  "destination": [
                    "editor-ui",
                    0
                  ]
                }
              }
            ]
          }
        }
      },
      {
        "box": {
          "id": "engine",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            540,
            800,
            120,
            22
          ],
          "varname": "ksh_engine",
          "outlettype": [
            ""
          ],
          "text": "js ksh_engine.js"
        }
      },
      {
        "box": {
          "id": "note-unpack",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 5,
          "patching_rect": [
            540,
            840,
            112,
            22
          ],
          "outlettype": [
            "int",
            "int",
            "int",
            "int",
            "float"
          ],
          "text": "unpack i i i i f"
        }
      },
      {
        "box": {
          "id": "note-delay",
          "maxclass": "newobj",
          "numinlets": 5,
          "numoutlets": 4,
          "patching_rect": [
            540,
            880,
            126,
            22
          ],
          "outlettype": [
            "int",
            "int",
            "int",
            "int"
          ],
          "text": "pipe 0 0 0 0 0."
        }
      },
      {
        "box": {
          "id": "makenote",
          "maxclass": "newobj",
          "numinlets": 4,
          "numoutlets": 3,
          "patching_rect": [
            540,
            920,
            200,
            22
          ],
          "outlettype": [
            "int",
            "int",
            "int"
          ],
          "text": "makenote 0 100 1 @repeatmode 1"
        }
      },
      {
        "box": {
          "id": "noteout",
          "maxclass": "newobj",
          "numinlets": 3,
          "numoutlets": 0,
          "patching_rect": [
            540,
            960,
            58,
            22
          ],
          "text": "noteout"
        }
      },
      {
        "box": {
          "id": "schedcmds",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "patching_rect": [
            760,
            840,
            160,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "r ksh_scheduler_commands"
        }
      },
      {
        "box": {
          "id": "route-scheduler-clear",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            760,
            880,
            82,
            22
          ],
          "outlettype": [
            "",
            ""
          ],
          "text": "route clear"
        }
      },
      {
        "box": {
          "id": "clear-delay-msg",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            760,
            920,
            46,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "clear"
        }
      },
      {
        "box": {
          "id": "stop-notes-msg",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            820,
            920,
            42,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "stop"
        }
      },
      {
        "box": {
          "id": "plugsync",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 9,
          "patching_rect": [
            180,
            800,
            78,
            22
          ],
          "outlettype": [
            "int",
            "int",
            "int",
            "float",
            "list",
            "float",
            "float",
            "int",
            "int"
          ],
          "text": "plugsync~"
        }
      },
      {
        "box": {
          "id": "transportbeat",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            180,
            840,
            42,
            22
          ],
          "outlettype": [
            "bang",
            "float"
          ],
          "text": "t b f"
        }
      },
      {
        "box": {
          "id": "transportpos",
          "maxclass": "newobj",
          "numinlets": 3,
          "numoutlets": 1,
          "patching_rect": [
            180,
            880,
            170,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "pack transport_position 0. 0"
        }
      },
      {
        "box": {
          "id": "uilist",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            360,
            760,
            48,
            22
          ],
          "outlettype": [
            "",
            ""
          ],
          "text": "t a a"
        }
      },
      {
        "box": {
          "id": "route-open",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            430,
            800,
            112,
            22
          ],
          "outlettype": [
            "",
            ""
          ],
          "text": "route open_editor"
        }
      },
      {
        "box": {
          "id": "openmsg",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            430,
            840,
            42,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "open"
        }
      },
      {
        "box": {
          "id": "pcontrol",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            430,
            880,
            62,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "pcontrol"
        }
      },
      {
        "box": {
          "id": "sendcmd",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            520,
            840,
            120,
            22
          ],
          "text": "s ksh_ui_commands"
        }
      },
      {
        "box": {
          "id": "recvcmd",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "patching_rect": [
            40,
            700,
            120,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "r ksh_ui_commands"
        }
      },
      {
        "box": {
          "id": "recvevents",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "patching_rect": [
            40,
            660,
            128,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "r ksh_engine_events"
        }
      },
      {
        "box": {
          "id": "enginecmds",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "patching_rect": [
            540,
            760,
            152,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "r ksh_engine_commands"
        }
      },
      {
        "box": {
          "id": "loadbang",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            40,
            760,
            60,
            22
          ],
          "outlettype": [
            "bang"
          ],
          "text": "loadbang"
        }
      },
      {
        "box": {
          "id": "initmsg",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            40,
            800,
            38,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "init"
        }
      },
      {
        "box": {
          "id": "livepath",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            720,
            700,
            112,
            22
          ],
          "outlettype": [
            "",
            ""
          ],
          "text": "live.path live_set"
        }
      },
      {
        "box": {
          "id": "observer",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            720,
            740,
            142,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "live.observer is_playing"
        }
      },
      {
        "box": {
          "id": "selstop",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 2,
          "patching_rect": [
            720,
            780,
            42,
            22
          ],
          "outlettype": [
            "bang",
            ""
          ],
          "text": "sel 0"
        }
      },
      {
        "box": {
          "id": "resetmsg",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            720,
            820,
            46,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "reset"
        }
      },
      {
        "box": {
          "id": "tempo_observer",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            880,
            740,
            130,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "live.observer tempo"
        }
      },
      {
        "box": {
          "id": "tempoprep",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            880,
            780,
            100,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "prepend tempo"
        }
      },
      {
        "box": {
          "id": "autopattr",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 4,
          "patching_rect": [
            1060,
            760,
            112,
            22
          ],
          "outlettype": [
            "",
            "",
            "",
            ""
          ],
          "text": "autopattr @greedy 1"
        }
      },
      {
        "box": {
          "id": "pattrstorage",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 4,
          "patching_rect": [
            1060,
            800,
            260,
            22
          ],
          "varname": "ksh_state",
          "outlettype": [
            "",
            "",
            "",
            ""
          ],
          "text": "pattrstorage ksh_state @greedy 1 @savemode 0"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "ui",
            0
          ],
          "destination": [
            "route-open",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "editor_patch",
            0
          ],
          "destination": [
            "route-open",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "uilist",
            1
          ],
          "destination": [
            "sendcmd",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route-open",
            0
          ],
          "destination": [
            "openmsg",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route-open",
            1
          ],
          "destination": [
            "uilist",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "openmsg",
            0
          ],
          "destination": [
            "pcontrol",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "pcontrol",
            0
          ],
          "destination": [
            "editor_patch",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "recvcmd",
            0
          ],
          "destination": [
            "ui",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "recvevents",
            0
          ],
          "destination": [
            "ui",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "enginecmds",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "engine",
            0
          ],
          "destination": [
            "note-unpack",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "note-unpack",
            4
          ],
          "destination": [
            "note-delay",
            4
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "note-unpack",
            3
          ],
          "destination": [
            "note-delay",
            3
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "note-unpack",
            2
          ],
          "destination": [
            "note-delay",
            2
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "note-unpack",
            1
          ],
          "destination": [
            "note-delay",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "note-unpack",
            0
          ],
          "destination": [
            "note-delay",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "note-delay",
            3
          ],
          "destination": [
            "makenote",
            3
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "note-delay",
            2
          ],
          "destination": [
            "makenote",
            2
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "note-delay",
            1
          ],
          "destination": [
            "makenote",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "note-delay",
            0
          ],
          "destination": [
            "makenote",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "makenote",
            2
          ],
          "destination": [
            "noteout",
            2
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "makenote",
            1
          ],
          "destination": [
            "noteout",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "makenote",
            0
          ],
          "destination": [
            "noteout",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "schedcmds",
            0
          ],
          "destination": [
            "route-scheduler-clear",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route-scheduler-clear",
            0
          ],
          "destination": [
            "clear-delay-msg",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route-scheduler-clear",
            0
          ],
          "destination": [
            "stop-notes-msg",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "clear-delay-msg",
            0
          ],
          "destination": [
            "note-delay",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "stop-notes-msg",
            0
          ],
          "destination": [
            "makenote",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "plugsync",
            0
          ],
          "destination": [
            "transportpos",
            2
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "plugsync",
            6
          ],
          "destination": [
            "transportbeat",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "transportbeat",
            1
          ],
          "destination": [
            "transportpos",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "transportbeat",
            0
          ],
          "destination": [
            "transportpos",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "transportpos",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "loadbang",
            0
          ],
          "destination": [
            "initmsg",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "initmsg",
            0
          ],
          "destination": [
            "ui",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "loadbang",
            0
          ],
          "destination": [
            "livepath",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "livepath",
            0
          ],
          "destination": [
            "observer",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "livepath",
            0
          ],
          "destination": [
            "tempo_observer",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tempo_observer",
            0
          ],
          "destination": [
            "tempoprep",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "tempoprep",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "observer",
            0
          ],
          "destination": [
            "selstop",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "selstop",
            0
          ],
          "destination": [
            "resetmsg",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "resetmsg",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      }
    ],
    "dependency_cache": [
      {
        "name": "ksh_engine.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "ksh_ui.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "ksh_compact_ui.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "ksh_ui_shared.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "ksh_constants.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      }
    ]
  }
}