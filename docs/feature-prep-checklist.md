# Feature prep checklist

Use this before and during feature branches. It is intentionally limited to decisions, checks, and risks that still matter for future work.

**Related docs:** [ui-sync.md](./ui-sync.md) documents the engine/UI message contract. [future-dev-priorities.md](./future-dev-priorities.md) captures architecture notes and non-blocking risks.

---

## Before feature work

- [ ] Clarify the product behavior in Ableton terms before coding. If multiple interpretations exist, ask.
- [ ] Identify whether the feature touches engine logic, Max message handlers, UI state/painting, persistence, patch wiring, or generated device artifacts.
- [ ] For new cell fields, rates, limits, or shared validation, update `ksh_constants.js` first.
- [ ] For new persisted fields, plan `serializeForPersistence()` / `deserializeForPersistence()` (Live saves), `serialize()` / `deserialize()` (runtime/tests), and any necessary `normalizeIncomingState()` migration.
- [ ] For UI-facing changes, review [ui-sync.md](./ui-sync.md) so the feature uses `engine_state`, `preview`, status selectors, and optimistic editor edits correctly.

---

## During implementation

### Engine / persistence

- [ ] Keep Max-facing source/channel/step indexes 1-based; keep engine internals 0-based.
- [ ] Add or extend `ksh_engine.test.js` for generation, persistence, and deterministic RNG behavior.
- [ ] Touch `ksh_engine.max.test.js` when Max handlers, wrapper plumbing, `pattern_data`, `restore_pattern_store`, or legacy `getvalueof` / `setvalueof` change.
- [ ] Emit a status selector when UIs need incremental updates.
- [ ] Use `emitFullState()` for load/reset/restore/sync paths, not hot cell or transport paths.
- [ ] For interactive source-cell edits, rely on `generatedCellForSourceEdit()` and `markPreviewDirty()` unless the product behavior requires a full re-roll.

### UI

- [ ] Keep the editor optimistic: update local `state.sources`, then send `cell`; do not wait for an engine `cell` echo.
- [ ] Use existing `ksh_shared` layout, colors, hit zones, and resize helpers.
- [ ] New engine/API/persistence names should use `channel`; UI display text may still say "Lane".
- [ ] After `.js` edits, run `node scripts/sync-user-library.js` or keep `node scripts/sync-user-library.js --watch` running.

### Patch / device shell

- [ ] Change patch wiring through `scripts/build-device-patch.js`, then regenerate.
- [ ] Do not hand-edit `Kick-Snare-Hat.amxd`; regenerate it from the patch build script.
- [ ] Keep `dependency_cache` listing all sibling JS files required by the device.

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

The automated gate does not verify actual `jsui` behavior inside Ableton Live. Run this when a feature touches UI behavior, persistence, patch wiring, or anything that could affect device load.

- [ ] Load the synced device in Ableton Live 12.4+.
- [ ] Confirm the compact UI loads, resizes, and sends mode/steps/lanes/refresh/rate/swing changes.
- [ ] Open the editor and confirm it resizes correctly.
- [ ] Confirm source cells toggle, horizontal paint works, and vertical velocity drag works.
- [ ] Confirm lane note/lock changes update generated preview.
- [ ] Confirm transport playback highlights the current step.
- [ ] Save/reload and confirm source cells, channel metadata, and global settings restore.

---

## Deferred risks

These are not blockers for feature work, but they are useful context when a feature touches the same area.

| Topic | Revisit when |
|-------|--------------|
| Split `ksh_ui.js` into layout / paint / input modules | Editor changes become difficult to make safely in one file. |
| Throttle `preview` JSON during playback | Profiling in Live shows message-bus or JSON overhead. |
| Automated `jsui` tests | UI complexity grows enough to justify the setup cost. |
| Rename UI-local `lane*` internals to `channel*` | Already editing those paths for a real feature. |
