# UI and engine sync contract

Kick Snare Hat uses the engine as the source of truth. The compact and editor
UIs mirror engine state and send Max messages back to the engine; they do not
persist independent state.

For native transport playback, coll scheduling, and patch wiring, see
[native-timing.md](./native-timing.md).

## Engine events

- `engine_state <json>` — compact `serializeForPersistence()` output (`v:1`:
  globals, channel metadata, sparse source cells, mutes). Same shape as
  `ksh_pattern_data`. Does not include the generated preview grid. Legacy
  saved `nativeTiming` values are ignored if present.
- `preview <json>` — `snapshot()` output for the generated grid and dimensions.
- Status selectors (`steps`, `channels`, `refresh_steps`, `mode`, `rate`,
  `swing`, `velocity_humanize`, `timing_humanize`, `device_active`,
  `phase_offset_beats`, `channel_label`, `channel_note`, `channel_lock`,
  `channel_playback_mode`, `static_source`, `source_channel_mute`, …) are
  incremental UI hints from setters.
- `channel_loop_length <channel> <steps>` — per-channel source row loop length,
  clamped to the global step count.
- `channel_playback_mode <channel> normal|reverse|boomerang` — per-channel
  playback traversal over the active loop length. Reverse mirrors transport
  position through the active length; boomerang repeats endpoints.
- `channel_audition <channel>` — one-shot MIDI for the lane pitch (editor row
  click). Fixed MIDI channel 1 and note duration; does not mutate pattern state.
- `current_step` — editor playhead while the editor subpatcher is active;
  driven by `transport_position`.
- `note_hit <channel> <generated-step> <source> <source-step>` — emitted when a
  MIDI hit is output so UIs can flash cells. The patch sends this to
  `ksh_engine_events` after each coll hit, using UI metadata stored in the
  9-field native playback row.

## UI requests

- `sync_all` — engine emits `engine_state` and `preview`.
- `request_state` — `engine_state` only.
- `device_active 0|1` — toggles output; clears the native scheduler (`pipe` /
  `makenote`) when disabled.
- `velocity_humanize <0-100>` — per-hit velocity offset (baked into native rows
  when the table is built).
- `timing_humanize <0-100>` — per-hit timing offset. Native playback precomputes
  row index and `pipe` delay when the table is built.
- `phase_offset_beats <float>` — shifts the transport step phase (native `expr`
  and engine `globalStepForBeats`).
- `channel_audition <channel>` — preview lane pitch once.
- `channel_playback_mode <channel> normal|reverse|boomerang` — editor row
  `N/R/B` toggle. The compact view does not expose this control.
- `static_source <source>` — static mode source selection (editor source tabs).
- Compact and editor call `sync_all` on init/load/open.
- After set reload, `restore_pattern_store` → `pattern_data` → compact
  `engine_state` + `ksh_ui_commands init`. UIs hydrate via
  `ksh_ui_shared.applyPersistenceState()` when `engine_state` has `v:1`.

## Compact vs editor

- **Compact** — global controls and generated preview; flashes preview cells on
  `note_hit` (channel + generated step).
- **Editor** — full source grid, generated preview, phase, device on/off; flashes
  source-layer cell text on `note_hit` (channel, source, source-step) for the
  visible source pattern.
- Editor cell edits are optimistic: local `state.sources` update, then `cell` to
  the engine. No per-cell echo from the engine.
- Source messages: `cell <source> <channel> <step> …`, `source_channel_mute`,
  `source_channel_reset` (reset triggers full `engine_state`).
- Source cell payloads include enabled, velocity, probability, cycle,
  cycle offset, cycle inversion, and roll. Missing roll values from old saves
  normalize to `1`.
- `channel_loop_length <channel> <steps>` — channel-global loop across sources.
- `channel_playback_mode <channel> normal|reverse|boomerang` — channel-global
  playback direction over the active loop length.
- MIDI note-on pitches 0-3 → `static_source 1-4` in the patch shell.

## Naming

Engine messages, persistence, and API fields use `channel`. UI labels may say
"Lane". `normalizeIncomingState()` still accepts legacy `lane` keys in stored JSON.
