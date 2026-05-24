# Feature prep checklist

Use this before and during feature branches.

**Related docs:** [ui-sync.md](./ui-sync.md) (message contract), [native-timing.md](./native-timing.md) (transport playback), [future-dev-priorities.md](./future-dev-priorities.md) (architecture and risks).

---

## Before feature work

- [ ] Clarify the product behavior in Ableton terms before coding. If multiple interpretations exist, ask.
- [ ] Identify whether the feature touches engine logic, native playback rows, Max message handlers, UI state/painting, persistence, patch wiring, or generated device artifacts.
- [ ] For new cell fields, rates, limits, or shared validation, update `ksh_constants.js` first.
- [ ] For new persisted fields, plan `serializeForPersistence()` / `deserializeForPersistence()` and `serialize()` / `deserialize()` for tests.
- [ ] For UI-facing changes, review [ui-sync.md](./ui-sync.md).
- [ ] For transport, MIDI output, or `note_hit` behavior, review [native-timing.md](./native-timing.md).

---

## During implementation

### Engine / persistence

- [ ] Keep Max-facing source/channel/step indexes 1-based; engine internals 0-based.
- [ ] Add or extend `ksh_engine.test.js` for generation, native rows, persistence, and deterministic RNG.
- [ ] Touch `ksh_engine.max.test.js` when Max handlers, `pattern_data`, or `restore_pattern_store` change.
- [ ] Emit a status selector when UIs need incremental updates.
- [ ] Use `emitFullState()` for load/reset/restore/sync paths, not hot cell or transport paths.
- [ ] For source-cell edits, use `generatedCellForSourceEdit()` and `markPreviewDirty()` unless a full re-roll is required.
- [ ] Call `syncNativePlaybackTable()` after changes that affect generated hits; extend `appendNativeHit()` if the coll row shape changes.

### UI

- [ ] Keep the editor optimistic: update local `state.sources`, then send `cell`.
- [ ] Use `ksh_shared` layout, colors, hit zones, and resize helpers.
- [ ] New engine/API/persistence names use `channel`; UI display text may still say "Lane".
- [ ] After `.js` edits, run `node scripts/sync-user-library.js` or `node scripts/sync-user-library.js --watch`.

### Patch / device shell

- [ ] Change wiring through `scripts/build-device-patch.js`, then regenerate.
- [ ] Do not hand-edit `Kick-Snare-Hat.amxd`.
- [ ] Extend `scripts/validate-device-patch.js` when native scheduler boxes or lines change.
- [ ] Keep `dependency_cache` listing all sibling JS files beside the device.

---

## Verification gate

After substantive device edits:

```sh
node ksh_engine.test.js
node ksh_engine.max.test.js
node scripts/validate-device-patch.js
node scripts/sync-user-library.js
```

When patch wiring or `scripts/build-device-patch.js` changes:

```sh
node scripts/build-device-patch.js
node scripts/validate-device-patch.js
```

Docs-only edits do not require Ableton sync.

---

## Manual Live smoke test

Run when a feature touches UI behavior, persistence, native playback, patch wiring, or device load.

- [ ] Load the synced device in Ableton Live 12.4+.
- [ ] Confirm the compact UI loads, resizes, and sends mode/steps/lanes/refresh/rate/swing changes.
- [ ] Open the editor; confirm resize, source grid edits, layer modes, phase, and device on/off controls.
- [ ] Transport play fires MIDI through native playback; source-layer text flashes on hits; compact preview flashes on hits; first step on play from bar 1 fires once per active lane.
- [ ] Confirm `current_step` / playhead feedback in the editor while playing.
- [ ] Confirm lane note/lock, humanize, swing, and phase offset affect output as expected.
- [ ] Save/reload; confirm patterns, channel metadata, and globals restore.

---

## Deferred risks

| Topic | Revisit when |
|-------|--------------|
| Split `ksh_ui.js` into layout / paint / input modules | Editor changes become difficult to make safely in one file. |
| Throttle `preview` JSON during playback | Profiling in Live shows message-bus or JSON overhead. |
| Automated `jsui` tests | UI complexity grows enough to justify the setup cost. |
| Rename UI-local `lane*` internals to `channel*` | Already editing those paths for a real feature. |
