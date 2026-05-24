# UI and engine sync contract

Kick Snare Hat uses the engine as the source of truth. The compact and editor
UIs mirror engine state and send Max messages back to the engine; they do not
persist independent state.

For native transport playback, coll scheduling, and patch wiring, see
[native-timing.md](./native-timing.md).

## Engine events

- `engine_state <json>` — compact `serializeForPersistence()` output (`v:1`:
  globals, `nativeTiming`, channel metadata, sparse source cells, mutes). Same
  shape as `ksh_pattern_data`. Does not include the generated preview grid.
- `preview <json>` — `snapshot()` output for the generated grid and dimensions.
- Status selectors (`steps`, `channels`, `refresh_steps`, `mode`, `rate`,
  `swing`, `velocity_humanize`, `timing_humanize`, `device_active`,
  `native_timing`, `phase_offset_beats`, `channel_label`, `channel_note`,
  `channel_lock`, `static_source`, `source_channel_mute`, …) are incremental
  UI hints from setters.
- `channel_loop_length <channel> <steps>` — per-channel source row loop length,
  clamped to the global step count.
- `channel_audition <channel>` — one-shot MIDI for the lane pitch (editor row
  click). Fixed MIDI channel 1 and note duration; does not mutate pattern state.
- `current_step` — editor playhead while the editor subpatcher is active;
  driven by `transport_position` even when native timing handles note output.
- `note_hit <channel> <generated-step> <source> <source-step>` — emitted when a
  MIDI hit is output so UIs can flash cells:
  - **Native timing on:** the patch sends this to `ksh_engine_events` after each
    coll hit, using UI metadata stored in the 9-field native playback row.
  - **Native timing off:** the engine sends this from `fireStep()` when a note is
    scheduled.

## UI requests

- `sync_all` — engine emits `engine_state` and `preview`.
- `request_state` — `engine_state` only.
- `device_active 0|1` — toggles output; clears the native scheduler (`pipe` /
  `makenote`) when disabled.
- `native_timing 0|1` — toggles native coll playback (default **on**). Rebuilds
  `ksh_native_playback`, updates `ksh_native_timing_gate`, emits `native_timing`
  status. Editor **Nat** button sends this message.
- `velocity_humanize <0-100>` — per-hit velocity offset (baked into native rows
  when native is on).
- `timing_humanize <0-100>` — per-hit timing offset. Native mode precomputes row
  index and `pipe` delay when the table is built. Engine mode uses transport
  lookahead when native is off (`100%` → ±half a step interval).
- `phase_offset_beats <float>` — shifts the transport step phase (native `expr`
  and engine `globalStepForBeats`).
- `channel_audition <channel>` — preview lane pitch once.
- `static_source <source>` — static mode source selection (editor source tabs).
- Compact and editor call `sync_all` on init/load/open.
- After set reload, `restore_pattern_store` → `pattern_data` → compact
  `engine_state` + `ksh_ui_commands init`. UIs hydrate via
  `ksh_ui_shared.applyPersistenceState()` when `engine_state` has `v:1`.

## Compact vs editor

- **Compact** — global controls and generated preview; mirrors `nativeTiming`
  from `engine_state`; flashes preview cells on `note_hit` (channel +
  generated step).
- **Editor** — full source grid, generated preview, **Nat** toggle, phase, device
  on/off; flashes source-layer cell text on `note_hit` (channel, source,
  source-step) for the visible source pattern.
- Editor cell edits are optimistic: local `state.sources` update, then `cell` to
  the engine. No per-cell echo from the engine.
- Source messages: `cell <source> <channel> <step> …`, `source_channel_mute`,
  `source_channel_reset` (reset triggers full `engine_state`).
- `channel_loop_length <channel> <steps>` — channel-global loop across sources.
- MIDI note-on pitches 0-3 → `static_source 1-4` in the patch shell.

## Naming

Engine messages, persistence, and API fields use `channel`. UI labels may say
"Lane". `normalizeIncomingState()` still accepts legacy `lane` keys in stored JSON.
