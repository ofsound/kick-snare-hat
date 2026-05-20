# Kick Snare Hat

Kick Snare Hat is a Max for Live MIDI Generator concept for Ableton Live 12.4.
It generates a live drum pattern from four user-defined source patterns instead
of using unconstrained randomness.

## Implemented behavior

- 1-32 sequencer steps.
- 1-8 monophonic drum lanes.
- Four source patterns, each containing every active lane.
- Per-lane label, MIDI note, and source lock.
- Device-wide MIDI channel.
- Two generation modes:
  - `stack`: each refresh window chooses one source pattern for all lanes and steps in that window.
  - `per_channel`: each generated step/lane chooses its own source pattern.
- Refresh interval is measured in sequencer steps.
- Live transport-position timing: host beat position drives the current step, with reset on Live transport stop.
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
- `ksh_constants.js`: shared hard limits for engine, UI, and tests.
- `kick-snare-hat.maxpat`: editable Max patch shell with transport/MIDI wiring.
- `Kick-Snare-Hat.amxd`: generated Max for Live device file.
- `ksh_engine.test.js`: Node-based tests for the core generation logic.
- `ksh_engine.max.test.js`: Node VM tests for Max wrapper message plumbing.
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
phase_offset_beats 0

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

transport_position 0.0 1
reset
sync_all
request_state
snapshot
```

## Adding a parameter

1. Add engine state, setter logic, serialization, deserialization, and focused coverage in `ksh_engine.test.js`.
2. Add the Max `js` message handler in `ksh_engine.js`, keeping Max-facing indexes 1-based when the parameter addresses channels, sources, or steps.
3. Make the setter emit a status selector if the UIs need an incremental update.
4. Add UI controls or state handling in `ksh_compact_ui.js`, `ksh_ui.js`, or `ksh_ui_shared.js` only when the parameter is user-facing.
5. Update this README message list and any wrapper coverage in `ksh_engine.max.test.js`.
6. Run the post-edit gate, including `node scripts/sync-user-library.js`; rebuild first when patch wiring or `scripts/build-device-patch.js` changes.

## Development verification

```sh
node ksh_engine.test.js
node ksh_engine.max.test.js
node scripts/build-device-patch.js
node scripts/validate-device-patch.js
node scripts/sync-user-library.js
```

`build-device-patch.js` also copies the device into your Ableton User Library. To sync
after editing `.js` files without rebuilding:

```sh
node scripts/sync-user-library.js
```

Keep a terminal open while developing to sync on every save:

```sh
node scripts/sync-user-library.js --watch
```

Override the destination folder with `KSH_ABLETON_DEST` if needed.

## Using in Live

Place `Kick-Snare-Hat.amxd` in the same folder as `ksh_engine.js`, `ksh_compact_ui.js`,
`ksh_ui.js`, `ksh_ui_shared.js`, and `ksh_constants.js`, then load the device from Ableton’s browser
(or drag the `.amxd` onto a MIDI track). Those JavaScript files must stay alongside
the device unless you freeze it from Max for Live.

A typical place to keep user Max MIDI devices on macOS:

```text
~/Music/Ableton/User Library/Presets/MIDI Effects/Max MIDI Effect/
```

You can also keep the folder anywhere under **User Library** and add it with
**Manage Files** if it does not appear in the browser immediately.
