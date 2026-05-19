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
          "numoutlets": 2,
          "outlettype": [
            "",
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
              900,
              460
            ],
            "bglocked": 0,
            "openinpresentation": 1,
            "default_fontsize": 12,
            "default_fontface": 0,
            "default_fontname": "Ableton Sans Medium",
            "toolbarvisible": 1,
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
                  "numoutlets": 2,
                  "outlettype": [
                    "",
                    ""
                  ],
                  "patching_rect": [
                    0,
                    0,
                    880,
                    420
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    0,
                    0,
                    880,
                    420
                  ]
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
          "id": "midiout",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            540,
            860,
            58,
            22
          ],
          "text": "midiout"
        }
      },
      {
        "box": {
          "id": "midiin",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "patching_rect": [
            440,
            860,
            50,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "midiin"
        }
      },
      {
        "box": {
          "id": "metro",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            180,
            800,
            128,
            22
          ],
          "outlettype": [
            "bang"
          ],
          "text": "metro 16n @active 1"
        }
      },
      {
        "box": {
          "id": "stepmsg",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            180,
            840,
            42,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "step"
        }
      },
      {
        "box": {
          "id": "uilist",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            360,
            760,
            66,
            22
          ],
          "outlettype": [
            "",
            "",
            ""
          ],
          "text": "t a a a"
        }
      },
      {
        "box": {
          "id": "route-rate",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            300,
            800,
            70,
            22
          ],
          "outlettype": [
            "",
            ""
          ],
          "text": "route rate"
        }
      },
      {
        "box": {
          "id": "interval",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            300,
            840,
            108,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "prepend interval"
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
            760,
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
            800,
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
            840,
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
            880,
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
          "id": "autopattr",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 4,
          "patching_rect": [
            920,
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
            920,
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
            "uilist",
            1
          ],
          "destination": [
            "route-rate",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "uilist",
            2
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
            "route-rate",
            0
          ],
          "destination": [
            "interval",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "interval",
            0
          ],
          "destination": [
            "metro",
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
            "engine",
            0
          ],
          "destination": [
            "midiout",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "metro",
            0
          ],
          "destination": [
            "stepmsg",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "stepmsg",
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
      }
    ]
  }
}