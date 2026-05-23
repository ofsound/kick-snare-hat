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
      736,
      176
    ],
    "bglocked": 0,
    "openinpresentation": 1,
    "openrect": [
      0,
      0,
      736,
      176
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
            736,
            176
          ],
          "presentation": 1,
          "presentation_rect": [
            0,
            0,
            736,
            176
          ],
          "layer": 0
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
              1024,
              382
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
                    1024,
                    382
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    0,
                    0,
                    1024,
                    382
                  ],
                  "layer": 0
                }
              },
              {
                "box": {
                  "id": "lane-textedit",
                  "maxclass": "textedit",
                  "varname": "lane_label_edit",
                  "numinlets": 1,
                  "numoutlets": 4,
                  "outlettype": [
                    "",
                    "",
                    "",
                    ""
                  ],
                  "patching_rect": [
                    40,
                    600,
                    120,
                    22
                  ],
                  "presentation": 1,
                  "presentation_rect": [
                    30,
                    106,
                    70,
                    19
                  ],
                  "layer": 1,
                  "hidden": 1,
                  "keymode": 1,
                  "fontsize": 13,
                  "fontname": "Ableton Sans Medium",
                  "bgcolor": [
                    0.1,
                    0.11,
                    0.13,
                    1
                  ],
                  "textcolor": [
                    0.96,
                    0.62,
                    0.22,
                    1
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
              },
              {
                "box": {
                  "id": "editor-key",
                  "maxclass": "newobj",
                  "numinlets": 0,
                  "numoutlets": 4,
                  "patching_rect": [
                    560,
                    470,
                    36,
                    22
                  ],
                  "outlettype": [
                    "int",
                    "int",
                    "int",
                    "int"
                  ],
                  "text": "key"
                }
              },
              {
                "box": {
                  "id": "editor-key-select",
                  "maxclass": "newobj",
                  "numinlets": 1,
                  "numoutlets": 4,
                  "patching_rect": [
                    560,
                    500,
                    100,
                    22
                  ],
                  "outlettype": [
                    "bang",
                    "bang",
                    "bang",
                    ""
                  ],
                  "text": "sel 49 50 51"
                }
              },
              {
                "box": {
                  "id": "editor-key-velocity",
                  "maxclass": "message",
                  "numinlets": 2,
                  "numoutlets": 1,
                  "patching_rect": [
                    560,
                    530,
                    150,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "source_layer_mode velocity"
                }
              },
              {
                "box": {
                  "id": "editor-key-cycle",
                  "maxclass": "message",
                  "numinlets": 2,
                  "numoutlets": 1,
                  "patching_rect": [
                    560,
                    560,
                    140,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "source_layer_mode cycle"
                }
              },
              {
                "box": {
                  "id": "editor-key-probability",
                  "maxclass": "message",
                  "numinlets": 2,
                  "numoutlets": 1,
                  "patching_rect": [
                    560,
                    590,
                    176,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "source_layer_mode probability"
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
              },
              {
                "box": {
                  "id": "editor-label-route",
                  "maxclass": "newobj",
                  "numinlets": 1,
                  "numoutlets": 4,
                  "patching_rect": [
                    40,
                    540,
                    280,
                    22
                  ],
                  "outlettype": [
                    "",
                    "",
                    "",
                    ""
                  ],
                  "text": "route label_edit_show label_edit_set label_edit_hide"
                }
              },
              {
                "box": {
                  "id": "editor-show-trigger",
                  "maxclass": "newobj",
                  "numinlets": 1,
                  "numoutlets": 3,
                  "patching_rect": [
                    40,
                    570,
                    100,
                    22
                  ],
                  "outlettype": [
                    "bang",
                    "bang",
                    ""
                  ],
                  "text": "t b b l"
                }
              },
              {
                "box": {
                  "id": "editor-pos-prep",
                  "maxclass": "newobj",
                  "numinlets": 1,
                  "numoutlets": 1,
                  "patching_rect": [
                    40,
                    600,
                    180,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "prepend presentation_rect"
                }
              },
              {
                "box": {
                  "id": "editor-unhide-msg",
                  "maxclass": "message",
                  "numinlets": 2,
                  "numoutlets": 1,
                  "patching_rect": [
                    180,
                    600,
                    60,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "hidden 0"
                }
              },
              {
                "box": {
                  "id": "editor-select-msg",
                  "maxclass": "message",
                  "numinlets": 2,
                  "numoutlets": 1,
                  "patching_rect": [
                    260,
                    600,
                    60,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "select"
                }
              },
              {
                "box": {
                  "id": "editor-hide-msg",
                  "maxclass": "message",
                  "numinlets": 2,
                  "numoutlets": 1,
                  "patching_rect": [
                    340,
                    600,
                    60,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "hidden 1"
                }
              },
              {
                "box": {
                  "id": "editor-set-prep",
                  "maxclass": "newobj",
                  "numinlets": 1,
                  "numoutlets": 1,
                  "patching_rect": [
                    420,
                    600,
                    80,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "prepend set"
                }
              },
              {
                "box": {
                  "id": "editor-done-route",
                  "maxclass": "newobj",
                  "numinlets": 1,
                  "numoutlets": 2,
                  "patching_rect": [
                    180,
                    640,
                    80,
                    22
                  ],
                  "outlettype": [
                    "",
                    ""
                  ],
                  "text": "route text"
                }
              },
              {
                "box": {
                  "id": "editor-done-prep",
                  "maxclass": "newobj",
                  "numinlets": 1,
                  "numoutlets": 1,
                  "patching_rect": [
                    180,
                    680,
                    160,
                    22
                  ],
                  "outlettype": [
                    ""
                  ],
                  "text": "prepend label_edit_done"
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
                    "editor-label-route",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-label-route",
                    0
                  ],
                  "destination": [
                    "editor-show-trigger",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-label-route",
                    1
                  ],
                  "destination": [
                    "editor-set-prep",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-label-route",
                    2
                  ],
                  "destination": [
                    "editor-hide-msg",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-label-route",
                    3
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
                    "editor-show-trigger",
                    0
                  ],
                  "destination": [
                    "editor-select-msg",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-show-trigger",
                    1
                  ],
                  "destination": [
                    "editor-unhide-msg",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-show-trigger",
                    2
                  ],
                  "destination": [
                    "editor-pos-prep",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-pos-prep",
                    0
                  ],
                  "destination": [
                    "lane-textedit",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-unhide-msg",
                    0
                  ],
                  "destination": [
                    "lane-textedit",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-select-msg",
                    0
                  ],
                  "destination": [
                    "lane-textedit",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-hide-msg",
                    0
                  ],
                  "destination": [
                    "lane-textedit",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-set-prep",
                    0
                  ],
                  "destination": [
                    "lane-textedit",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "lane-textedit",
                    0
                  ],
                  "destination": [
                    "editor-done-route",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-done-route",
                    0
                  ],
                  "destination": [
                    "editor-done-prep",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-done-prep",
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
              },
              {
                "patchline": {
                  "source": [
                    "editor-key",
                    0
                  ],
                  "destination": [
                    "editor-key-select",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-key-select",
                    0
                  ],
                  "destination": [
                    "editor-key-velocity",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-key-select",
                    1
                  ],
                  "destination": [
                    "editor-key-cycle",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-key-select",
                    2
                  ],
                  "destination": [
                    "editor-key-probability",
                    0
                  ]
                }
              },
              {
                "patchline": {
                  "source": [
                    "editor-key-velocity",
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
                    "editor-key-cycle",
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
                    "editor-key-probability",
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
          "id": "dirty-recv",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "patching_rect": [
            840,
            800,
            110,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "r ksh_dirty_tick"
        }
      },
      {
        "box": {
          "id": "dirty-param",
          "maxclass": "live.numbox",
          "varname": "ksh_dirty_revision",
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "float"
          ],
          "patching_rect": [
            840,
            840,
            80,
            22
          ],
          "hidden": 1,
          "parameter_enable": 1,
          "parameter_mappable": 0,
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_linknames": 0,
              "parameter_order": 1,
              "parameter_invisible": 0,
              "parameter_mmin": 0,
              "parameter_mmax": 1000000,
              "parameter_initial": [
                0
              ],
              "parameter_type": 0,
              "parameter_initial_enable": 1,
              "parameter_shortname": "KSH Dirty",
              "parameter_longname": "ksh_dirty_revision",
              "parameter_mappable": 0,
              "parameter_unitstyle": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "pattern-store",
          "maxclass": "textedit",
          "varname": "ksh_pattern_data",
          "numinlets": 1,
          "numoutlets": 4,
          "patching_rect": [
            1060,
            840,
            320,
            22
          ],
          "outlettype": [
            "",
            "",
            "",
            ""
          ],
          "hidden": 1,
          "parameter_enable": 1,
          "parameter_mappable": 0,
          "fontsize": 10,
          "keymode": 0,
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_linknames": 0,
              "parameter_order": 2,
              "parameter_invisible": 0,
              "parameter_type": 3,
              "parameter_initial_enable": 0,
              "parameter_shortname": "KSH Pattern",
              "parameter_longname": "ksh_pattern_data",
              "parameter_mappable": 0
            }
          }
        }
      },
      {
        "box": {
          "id": "pattern-pattr",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            1060,
            880,
            180,
            22
          ],
          "outlettype": [
            "",
            "",
            ""
          ],
          "text": "pattr @bindto ksh_pattern_data"
        }
      },
      {
        "box": {
          "id": "pattern-restore-prep",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            1060,
            920,
            130,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "prepend pattern_data"
        }
      },
      {
        "box": {
          "id": "restore-engine-msg",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            1060,
            960,
            150,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "restore_pattern_store"
        }
      },
      {
        "box": {
          "id": "restore-wait",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            1060,
            1040,
            60,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "delay 100"
        }
      },
      {
        "box": {
          "id": "restore-defer",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            1060,
            840,
            60,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "deferlow"
        }
      },
      {
        "box": {
          "id": "restore-loadbang",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            1060,
            1080,
            70,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "loadmess 1"
        }
      },
      {
        "box": {
          "id": "restore-loadbang-wait",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            1060,
            1120,
            70,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "delay 300"
        }
      },
      {
        "box": {
          "id": "midi-notein",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            180,
            700,
            50,
            22
          ],
          "outlettype": [
            "int",
            "int",
            "int"
          ],
          "text": "notein"
        }
      },
      {
        "box": {
          "id": "midi-stripnote",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 2,
          "patching_rect": [
            180,
            740,
            64,
            22
          ],
          "outlettype": [
            "int",
            "int"
          ],
          "text": "stripnote"
        }
      },
      {
        "box": {
          "id": "midi-source-select",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 5,
          "patching_rect": [
            180,
            780,
            110,
            22
          ],
          "outlettype": [
            "bang",
            "bang",
            "bang",
            "bang",
            ""
          ],
          "text": "sel 0 1 2 3"
        }
      },
      {
        "box": {
          "id": "midi-source-1",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            300,
            700,
            100,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "static_source 1"
        }
      },
      {
        "box": {
          "id": "midi-source-2",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            300,
            730,
            100,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "static_source 2"
        }
      },
      {
        "box": {
          "id": "midi-source-3",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            300,
            760,
            100,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "static_source 3"
        }
      },
      {
        "box": {
          "id": "midi-source-4",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            300,
            790,
            100,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "static_source 4"
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
          "id": "thisdevice",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            120,
            760,
            100,
            22
          ],
          "outlettype": [
            "bang",
            "int"
          ],
          "text": "live.thisdevice"
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
          "id": "native-meta-recv",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "patching_rect": [
            180,
            1000,
            120,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "r ksh_native_meta"
        }
      },
      {
        "box": {
          "id": "native-meta-route",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            180,
            1040,
            70,
            22
          ],
          "outlettype": [
            "",
            ""
          ],
          "text": "route meta"
        }
      },
      {
        "box": {
          "id": "native-meta-unpack",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            260,
            1000,
            80,
            22
          ],
          "outlettype": [
            "float",
            "float",
            "int"
          ],
          "text": "unpack f f i"
        }
      },
      {
        "box": {
          "id": "native-bps",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            260,
            1040,
            40,
            22
          ],
          "outlettype": [
            "float"
          ],
          "text": "f 0.25"
        }
      },
      {
        "box": {
          "id": "native-phase",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            260,
            1080,
            40,
            22
          ],
          "outlettype": [
            "float"
          ],
          "text": "f 0."
        }
      },
      {
        "box": {
          "id": "native-steps",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            260,
            1120,
            40,
            22
          ],
          "outlettype": [
            "int"
          ],
          "text": "i 16"
        }
      },
      {
        "box": {
          "id": "native-step-expr",
          "maxclass": "newobj",
          "numinlets": 4,
          "numoutlets": 1,
          "patching_rect": [
            340,
            1040,
            220,
            22
          ],
          "outlettype": [
            "int"
          ],
          "text": "expr floor((($f1-$f2)/$f3)+0.000001)%$f4"
        }
      },
      {
        "box": {
          "id": "native-step-input-gate",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            380,
            1060,
            40,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "gate"
        }
      },
      {
        "box": {
          "id": "native-step-change",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            340,
            1080,
            50,
            22
          ],
          "outlettype": [
            "bang",
            "int"
          ],
          "text": "change"
        }
      },
      {
        "box": {
          "id": "native-step-reset-msg",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            340,
            1120,
            54,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "set -1"
        }
      },
      {
        "box": {
          "id": "native-transport-unpack",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            180,
            1160,
            90,
            22
          ],
          "outlettype": [
            "",
            "float",
            "int"
          ],
          "text": "unpack s f i"
        }
      },
      {
        "box": {
          "id": "native-timing-gate-recv",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "patching_rect": [
            480,
            1040,
            160,
            22
          ],
          "outlettype": [
            "int"
          ],
          "text": "r ksh_native_timing_gate"
        }
      },
      {
        "box": {
          "id": "native-playing-gate",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            420,
            1080,
            40,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "gate"
        }
      },
      {
        "box": {
          "id": "native-mode-gate",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 1,
          "patching_rect": [
            480,
            1080,
            40,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "gate"
        }
      },
      {
        "box": {
          "id": "native-playback-cmds",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "patching_rect": [
            600,
            1040,
            190,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "r ksh_native_playback_commands"
        }
      },
      {
        "box": {
          "id": "native-playback-coll",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 4,
          "patching_rect": [
            600,
            1080,
            150,
            22
          ],
          "outlettype": [
            "",
            "",
            "",
            ""
          ],
          "text": "coll ksh_native_playback"
        }
      },
      {
        "box": {
          "id": "native-hit-iter",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 2,
          "patching_rect": [
            600,
            1120,
            62,
            22
          ],
          "outlettype": [
            "",
            ""
          ],
          "text": "zl.iter 9"
        }
      },
      {
        "box": {
          "id": "native-hit-unpack",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 9,
          "patching_rect": [
            660,
            1120,
            150,
            22
          ],
          "outlettype": [
            "int",
            "int",
            "int",
            "int",
            "float",
            "int",
            "int",
            "int",
            "int"
          ],
          "text": "unpack i i i i f i i i i"
        }
      },
      {
        "box": {
          "id": "native-hit-ui-pack",
          "maxclass": "newobj",
          "numinlets": 4,
          "numoutlets": 1,
          "patching_rect": [
            820,
            1120,
            60,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "pack i i i i"
        }
      },
      {
        "box": {
          "id": "native-hit-ui-prep",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            820,
            1160,
            100,
            22
          ],
          "outlettype": [
            ""
          ],
          "text": "prepend note_hit"
        }
      },
      {
        "box": {
          "id": "native-hit-events",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            820,
            1200,
            128,
            22
          ],
          "outlettype": [],
          "text": "s ksh_engine_events"
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
            "dirty-recv",
            0
          ],
          "destination": [
            "dirty-param",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "pattern-store",
            0
          ],
          "destination": [
            "pattern-restore-prep",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "restore-loadbang",
            0
          ],
          "destination": [
            "restore-loadbang-wait",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "restore-loadbang-wait",
            0
          ],
          "destination": [
            "restore-engine-msg",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "pattern-restore-prep",
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
            "thisdevice",
            0
          ],
          "destination": [
            "restore-defer",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "restore-defer",
            0
          ],
          "destination": [
            "restore-wait",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "restore-wait",
            0
          ],
          "destination": [
            "restore-engine-msg",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "restore-engine-msg",
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
            "midi-notein",
            0
          ],
          "destination": [
            "midi-stripnote",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "midi-notein",
            1
          ],
          "destination": [
            "midi-stripnote",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "midi-stripnote",
            0
          ],
          "destination": [
            "midi-source-select",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "midi-source-select",
            0
          ],
          "destination": [
            "midi-source-1",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "midi-source-select",
            1
          ],
          "destination": [
            "midi-source-2",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "midi-source-select",
            2
          ],
          "destination": [
            "midi-source-3",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "midi-source-select",
            3
          ],
          "destination": [
            "midi-source-4",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "midi-source-1",
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
            "midi-source-2",
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
            "midi-source-3",
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
            "midi-source-4",
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
            "native-meta-recv",
            0
          ],
          "destination": [
            "native-meta-route",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-meta-route",
            0
          ],
          "destination": [
            "native-meta-unpack",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-meta-unpack",
            0
          ],
          "destination": [
            "native-bps",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-meta-unpack",
            1
          ],
          "destination": [
            "native-phase",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-meta-unpack",
            2
          ],
          "destination": [
            "native-steps",
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
            "native-step-expr",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-phase",
            0
          ],
          "destination": [
            "native-step-expr",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-bps",
            0
          ],
          "destination": [
            "native-step-expr",
            2
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-steps",
            0
          ],
          "destination": [
            "native-step-expr",
            3
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-step-expr",
            0
          ],
          "destination": [
            "native-step-input-gate",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-transport-unpack",
            2
          ],
          "destination": [
            "native-step-input-gate",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-step-input-gate",
            0
          ],
          "destination": [
            "native-step-change",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-step-change",
            0
          ],
          "destination": [
            "native-playing-gate",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-step-reset-msg",
            0
          ],
          "destination": [
            "native-step-change",
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
            "native-transport-unpack",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-transport-unpack",
            2
          ],
          "destination": [
            "native-playing-gate",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-playing-gate",
            0
          ],
          "destination": [
            "native-mode-gate",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-timing-gate-recv",
            0
          ],
          "destination": [
            "native-mode-gate",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-mode-gate",
            0
          ],
          "destination": [
            "native-playback-coll",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-playback-cmds",
            0
          ],
          "destination": [
            "native-playback-coll",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-playback-coll",
            0
          ],
          "destination": [
            "native-hit-iter",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-hit-iter",
            0
          ],
          "destination": [
            "native-hit-unpack",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-hit-unpack",
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
            "native-hit-unpack",
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
            "native-hit-unpack",
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
            "native-hit-unpack",
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
            "native-hit-unpack",
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
            "native-hit-unpack",
            5
          ],
          "destination": [
            "native-hit-ui-pack",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-hit-unpack",
            6
          ],
          "destination": [
            "native-hit-ui-pack",
            1
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-hit-unpack",
            7
          ],
          "destination": [
            "native-hit-ui-pack",
            2
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-hit-unpack",
            8
          ],
          "destination": [
            "native-hit-ui-pack",
            3
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-hit-ui-pack",
            0
          ],
          "destination": [
            "native-hit-ui-prep",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "native-hit-ui-prep",
            0
          ],
          "destination": [
            "native-hit-events",
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
            "thisdevice",
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
            "thisdevice",
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
            "selstop",
            0
          ],
          "destination": [
            "native-step-reset-msg",
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
            "native-step-reset-msg",
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
    ],
    "parameters": {
      "dirty-param": [
        "ksh_dirty_revision",
        "KSH Dirty",
        0
      ],
      "pattern-store": [
        "ksh_pattern_data",
        "KSH Pattern",
        0
      ]
    }
  }
}