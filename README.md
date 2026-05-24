# Kick Snare Hat

Kick Snare Hat is a Max for Live MIDI Generator for Ableton Live 12.4+. It
generates a live drum pattern from four user-defined source patterns instead of
using unconstrained randomness.

## Implemented behavior

- 1-32 sequencer steps.
- 1-8 monophonic drum lanes.
- Four source patterns, each containing every active lane.
- Per-lane label, MIDI note, source lock, and row loop length.
- Fixed output on MIDI channel 1.
- Three generation modes:
  - `stack`: each refresh window chooses one source pattern for all lanes and steps in that window.
  - `per_channel`: each generated step/lane chooses its own source pattern.
  - `static`: every lane plays the selected source pattern.
- MIDI input notes 0, 1, 2, and 3 select source patterns 1-4.
- Refresh interval is measured in sequencer steps.
- Live transport-position timing: host beat position drives the current step, with engine `reset` on Live transport stop.
- Native playback: the engine precomputes hits into a Max `coll`; the patch fires MIDI on step edges and sends `note_hit` events for UI cell flashes. See [docs/native-timing.md](docs/native-timing.md).
- Internal swing delay applied per hit through the native table row and shared `pipe`.
- Device-wide velocity and timing humanize. Velocity humanize offsets each hit from its cell velocity. Timing humanize is precomputed into native playback rows (see [docs/native-timing.md](docs/native-timing.md)).
- Live tempo from `live_set` drives step interval via `live.observer tempo`.
- Compact Presentation UI for the Live device strip with mode, steps, lanes, refresh, rate, swing, generated preview, and editor launch controls.
- Floating editor subpatcher with source dropdown, source grid, generated preview, lane note/lock controls, per-cell velocity/probability/cycle/cycle-offset controls, phase offset, and device on/off.
- Source Pattern layer modes for velocity, cycle, and probability (buttons and number keys `1`/`2`/`3`, Shift/Option hover).
- Source row mute and reset.
- Live set persistence for source patterns, globals, and channel metadata ([Live set persistence](#live-set-persistence)).
- Per-source cell values: enabled, velocity, probability, every-N-cycles, cycle offset, and cycle inversion.

## Files

- `ksh_engine.js`: sequencing engine and Max `js` inlet handlers.
- `ksh_compact_ui.js`: compact Live device-strip `jsui`.
- `ksh_ui.js`: floating editor `jsui`.
- `ksh_ui_shared.js`: shared drawing and state-sync helpers.
- `ksh_constants.js`: shared limits, defaults, and normalization.
- `kick-snare-hat.maxpat`: Max patch shell (generated from `scripts/build-device-patch.js`).
- `Kick-Snare-Hat.amxd`: loadable Max for Live device.
- `ksh_engine.test.js`: Node tests for generation and native playback tables.
- `ksh_engine.max.test.js`: Node VM tests for Max wrapper plumbing.
- `scripts/build-device-patch.js`: regenerates `.maxpat` and `.amxd`.
- `scripts/validate-device-patch.js`: patch wiring and `.amxd` checks.
- `docs/ui-sync.md`: UI ↔ engine event contract.
- `docs/native-timing.md`: native playback table, patch clock path, and `note_hit` routing.

## Live set persistence

Pattern and settings live in a hidden Live parameter, not in the UIs.

| Piece | Role |
| --- | --- |
| `textedit` `ksh_pattern_data` | Live-automatable parameter; URI-encoded compact JSON (`v:1`) |
| `ksh_engine.js` | Writes on edit (`serializeForPersistence()`), restores on load |
| Compact / editor UIs | Mirror `engine_state` and `preview`; not the source of truth |

**Save:** `pushPatternToStore()` → `set <uri-encoded-json>` on the `textedit` box directly (not via `prepend set` on a cord).

**Restore:** `restore_pattern_store` retries reading the parameter, then `pattern_data` → engine; `ksh_ui_commands init` after success.

**UI sync:** `engine_state` uses the same compact `v:1` JSON as the store. `preview` carries the generated grid only.

After device or patch updates, replace the device instance in a set and run `node scripts/sync-user-library.js` (or `build-device-patch.js`) so Live loads matching `.js` files beside the `.amxd`.

Malformed or empty store values are ignored so a bad recall does not wipe the pattern.

Old saved sets may still contain a legacy `nativeTiming` field. It is ignored on restore and is not written by new saves; transport playback is always native playback.

## Max `js` messages

Indexes in Max messages are 1-based.

```text
steps 16
channels 3
refresh_steps 4
mode stack
mode per_channel
mode static
static_source 1
rate 16n
tempo 120
swing 0
velocity_humanize 0
timing_humanize 0
device_active 1
phase_offset_beats 0

channel_label 1 Kick
channel_note 1 36
channel_audition 1
channel_lock 1 random
channel_lock 1 2
channel_loop_length 1 8
channel_playback_mode 1 reverse
channel_playback_mode 1 boomerang

cell 1 1 1 1 100 100 1 0 0
cell 1 1 5 1 90 60 1 0 0
cell 1 2 9 1 110 75 3 1 1
cell_enabled 1 1 1 0
cell_velocity 1 1 1 96
cell_probability 1 1 1 75
cell_cycle 1 1 1 3
cell_cycle_offset 1 1 1 1
cell_cycle_inverted 1 1 1 1
source_channel_mute 1 1 1
source_channel_reset 1 1

transport_position 0.0 1
reset
sync_all
request_state
snapshot

pattern_data <json-or-uri-encoded-json>
restore_pattern_store
```

Transport playback always uses the native `coll` path. Pattern, timing, phase, and humanize edits rebuild the native playback table and update `ksh_native_timing_gate` as needed.

## Adding a parameter

1. Add shared defaults or normalization to `ksh_constants.js` when the parameter affects cells, rates, limits, or validation.
2. Add engine state, setters, `serialize()` / `deserialize()`, `serializeForPersistence()` / `deserializeForPersistence()`, and `ksh_engine.test.js` coverage.
3. If the parameter affects native playback output, update `buildNativePlaybackRows()` / `appendNativeHit()` and extend [docs/native-timing.md](docs/native-timing.md) when wire format changes.
4. Add the Max `js` handler in `ksh_engine.js` (1-based indexes at the message boundary).
5. Emit a status selector when UIs need incremental updates ([docs/ui-sync.md](docs/ui-sync.md)).
6. Add UI controls in `ksh_compact_ui.js` / `ksh_ui.js` when user-facing.
7. Update this README, `ksh_engine.max.test.js`, and patch validation when handlers or wiring change.
8. Run the post-edit gate; rebuild the patch when `scripts/build-device-patch.js` changes.

## Development verification

Set `DEBUG: true` in `ksh_constants.js` for Max-side JSON or message-bus debugging. Keep the default `false` for normal use.

```sh
node ksh_engine.test.js
node ksh_engine.max.test.js
node scripts/build-device-patch.js
node scripts/validate-device-patch.js
node scripts/sync-user-library.js
```

`build-device-patch.js` copies the device into the Ableton User Library. After `.js`-only edits:

```sh
node scripts/sync-user-library.js
```

Watch mode:

```sh
node scripts/sync-user-library.js --watch
```

Override the destination with `KSH_ABLETON_DEST`.

## Using in Live

Save the set after editing; reopening should restore patterns, channel metadata, and globals. If persistence fails after an upgrade, confirm `ksh_pattern_data` holds `v:1` JSON and the device was replaced with a freshly synced build.

Place `Kick-Snare-Hat.amxd` beside `ksh_engine.js`, `ksh_compact_ui.js`, `ksh_ui.js`, `ksh_ui_shared.js`, and `ksh_constants.js`, then load from the browser or drag onto a MIDI track.

Typical macOS User Library path:

```text
~/Music/Ableton/User Library/Presets/MIDI Effects/Max MIDI Effect/
```

Add the folder under **User Library** with **Manage Files** if it does not appear immediately.
