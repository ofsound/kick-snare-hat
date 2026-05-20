# Kick Snare Hat

Kick Snare Hat is a Max for Live MIDI Generator concept for Ableton Live 12.4.
It generates a live drum pattern from four user-defined source patterns instead
of using unconstrained randomness.

## Implemented behavior

- 1-16 sequencer steps.
- 1-8 monophonic drum lanes.
- Four source patterns, each containing every active lane.
- Per-lane label, MIDI note, and source lock.
- Device-wide MIDI channel.
- Two generation modes:
  - `stack`: each generated step chooses one source pattern for all lanes.
  - `per_channel`: each generated step/lane chooses its own source pattern.
- Refresh interval is measured in sequencer steps.
- Live-synced `metro` timing with reset on Live transport stop.
- Internal swing delay measured against the incoming tempo-synced step interval.
- Live tempo from `live_set` drives swing timing via `live.observer tempo`.
- Compact Presentation UI for the Live device strip with mode, steps, lanes, refresh, rate, swing, generated preview, and editor launch controls.
- Floating editor subpatcher opened from the compact UI, with source dropdown, all-lane source grid editor, generated grid preview, lane labels, lane note/lock controls, and per-cell velocity/probability/cycle controls.
- `autopattr` plus `pattrstorage` persist engine pattern state only; UIs mirror via `engine_state` / `preview` events.
- Per-source cell values:
  - enabled
  - velocity
  - gate mode: `always`, `random`, or `cycle`
  - random percentage or every-N-cycles value

## Files

- `ksh_engine.js`: the sequencing engine and Max `js` object entrypoints.
- `ksh_compact_ui.js`: the compact Live device-strip UI.
- `ksh_ui.js`: the floating editor UI for source editing and generated preview.
- `ksh_ui_shared.js`: shared drawing and state-sync helpers for both UIs.
- `kick-snare-hat.maxpat`: editable Max patch shell with transport/MIDI wiring.
- `Kick-Snare-Hat.amxd`: generated Max for Live device file.
- `ksh_engine.test.js`: Node-based tests for the core generation logic.
- `scripts/build-device-patch.js`: regenerates the `.maxpat` and `.amxd` shell.
- `scripts/validate-device-patch.js`: checks patch wiring and `.amxd` embedding.

## Max `js` messages

Indexes in Max messages are 1-based.

```text
steps 16
channels 3
refresh_steps 4
mode stack
mode per_channel
rate 16n
tempo 120
swing 0
midi_channel 1
duration_ms 100

channel_label 1 Kick
channel_note 1 36
channel_lock 1 random
channel_lock 1 2

cell 1 1 1 1 100 always 100
cell 1 1 5 1 90 random 60
cell 1 2 9 1 110 cycle 3
cell_enabled 1 1 1 0
cell_velocity 1 1 1 96
cell_gate 1 1 1 random 75

step
reset
request_state
snapshot
```

## Development verification

```sh
node ksh_engine.test.js
node scripts/build-device-patch.js
node scripts/validate-device-patch.js
```

## Using in Live

Place `Kick-Snare-Hat.amxd` in the same folder as `ksh_engine.js`, `ksh_compact_ui.js`,
`ksh_ui.js`, and `ksh_ui_shared.js`, then load the device from Ableton’s browser
(or drag the `.amxd` onto a MIDI track). Those JavaScript files must stay alongside
the device unless you freeze it from Max for Live.

A typical place to keep user Max MIDI devices on macOS:

```text
~/Music/Ableton/User Library/Presets/MIDI Effects/Max MIDI Effect/
```

You can also keep the folder anywhere under **User Library** and add it with
**Manage Files** if it does not appear in the browser immediately.
