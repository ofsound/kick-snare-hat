# UI and engine sync contract

Kick Snare Hat uses the engine as the source of truth. The compact and editor
UIs mirror engine state and send Max messages back to the engine; they do not
persist independent state.

## Engine events

- `engine_state <json>` sends `serialize()` output: global settings, channel
  metadata, and source cells. It does not include the generated preview grid.
- `preview <json>` sends `snapshot()` output for the generated grid and current
  visible dimensions.
- Status selectors such as `steps`, `channels`, `refresh_steps`, `mode`, `rate`,
  `swing`, `midi_channel`, `duration_ms`, `phase_offset_beats`,
  `channel_label`, `channel_note`, and `channel_lock` are incremental UI hints
  emitted by setters.
- `current_step` is editor-only playback position feedback and is suppressed
  while the editor is inactive.

## UI requests

- `sync_all` asks the engine to emit both `engine_state` and `preview`.
- `request_state` asks for `engine_state` only.
- Compact and editor UIs call `sync_all` during init/load/open paths so a newly
  visible UI catches up to the persisted engine state.

## Compact vs editor

- The compact UI keeps layout state plus `previewData`. It can change global
  controls but does not edit source cells.
- The editor keeps the full source grid in local state, plus `previewData` for
  the generated grid.
- Editor cell edits are optimistic: the editor updates its local source cell and
  sends `cell` to the engine. The engine updates state and preview data, but it
  does not echo individual `cell` messages back to the editor.

## Naming

Engine messages, persistence, and new API fields should use `channel`. UI text
may still say "Lane" where that is clearer in the device interface. Legacy
`lane` state shapes remain accepted by `normalizeIncomingState()`.
