# Future development priorities

This document captures architecture priorities and non-blocking risks for future Kick Snare Hat feature work.

For per-feature workflow, use [feature-prep-checklist.md](./feature-prep-checklist.md). For the engine/UI message contract, use [ui-sync.md](./ui-sync.md).

---

## Architecture priorities

### Shared schema

`ksh_constants.js` is the single source of truth for device limits, cell defaults, `cloneCell`, `normalizeGateMode`, and the rate allowlist. Engine and UI code load it directly through Node `require()` or Max `include()`.

When adding a persisted field, rate, limit, or cell property:

1. Update `ksh_constants.js` first if normalization/defaults are shared.
2. Add engine state, setter logic, serialization, deserialization, and focused `ksh_engine.test.js` coverage.
3. Add the Max-facing handler in `ksh_engine.js`, keeping source/channel/step indexes 1-based at the message boundary.
4. Add UI state/controls only when the feature is user-facing.
5. Update README message docs and `ksh_engine.max.test.js` when handlers or Max wrapper behavior change.

### UI and engine sync

The engine is the source of truth. UIs mirror `engine_state` and `preview`, then send commands back through the named-message bus.

- `engine_state` is serialized pattern/global state. It does not include the generated grid.
- `preview` is generated-grid state from `snapshot()`.
- Editor source-cell edits are optimistic: the editor updates local `state.sources`, sends `cell`, and does not wait for an engine `cell` echo.
- Hot-path cell edits should rely on `generatedCellForSourceEdit()` plus `markPreviewDirty()`, not full `emitFullState()`.

See [ui-sync.md](./ui-sync.md) before changing message flow.

### Persistence recovery

`setvalueof` guards malformed JSON and restores the last good engine state. `normalizeIncomingState()` accepts legacy `laneCount` / `lanes` shapes and maps them to `channelCount` / `channels`.

New persisted fields should be added to `serialize()` and `deserialize()`. Only extend `normalizeIncomingState()` when a legacy shape or migration actually exists.

### Debug visibility

`KSH_CONSTANTS.DEBUG` defaults to `false`. Flip it locally while debugging Max-side JSON parse failures, `messnamed` / `outlet` failures, or patcher resize problems. Do not commit release builds with debug noise enabled.

### Naming

Engine messages, API fields, and persisted state should use `channel`. UI display text may still say "Lane", and existing UI-local names such as `laneCount` may remain until touched for real feature work.

---

## Remaining development risks

### Manual Live/jsui smoke test

The automated gate covers engine logic, Max wrapper plumbing, patch wiring, `.amxd` payload integrity, and User Library sync. It does not automate actual `jsui` behavior inside Ableton Live.

Before large UI-facing features, manually confirm in Ableton Live 12.4+:

- Compact UI loads, resizes, and sends global controls.
- Editor opens and resizes.
- Source cells toggle, horizontal paint works, and vertical velocity drag works.
- Lane note/lock changes update generated preview.
- Transport playback highlights the current step.
- Save/reload restores source cells, channel metadata, and global settings.

### Deferred cleanup

These are not blockers for feature work:

| Topic | Defer because |
|-------|----------------|
| Split `ksh_ui.js` into layout / paint / input modules | Do this when editor features make the file hard to change safely. |
| Throttle `preview` JSON during playback | Current limits are small; profile in Live before optimizing. |
| Automated `jsui` tests | Setup cost is high; engine + Max VM tests cover the core logic. |
| Rename all UI `lane*` internals to `channel*` | Cosmetic unless already editing those paths. |

---

## Non-negotiable verification

After substantive device edits, run the post-edit gate from `.cursor/rules/post-edit-verification.mdc`:

```sh
node ksh_engine.test.js
node ksh_engine.max.test.js
node scripts/validate-device-patch.js
node scripts/sync-user-library.js
```

When patch wiring or `scripts/build-device-patch.js` changes, rebuild first:

```sh
node scripts/build-device-patch.js
node scripts/validate-device-patch.js
```
