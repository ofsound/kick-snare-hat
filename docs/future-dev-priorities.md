# Future development priorities

Architecture priorities and non-blocking risks for Kick Snare Hat feature work.

**Workflow:** [feature-prep-checklist.md](./feature-prep-checklist.md) · **Messages:** [ui-sync.md](./ui-sync.md) · **Native playback:** [native-timing.md](./native-timing.md)

---

## Architecture priorities

### Shared schema

`ksh_constants.js` is the single source of truth for device limits, cell defaults, `DEFAULT_NATIVE_TIMING`, `NATIVE_HIT_FIELD_COUNT`, `normalizeRate`, and related helpers.

When adding a persisted field, rate, limit, or cell property:

1. Update `ksh_constants.js` when normalization or defaults are shared.
2. Add engine state, setters, persistence serializers, and `ksh_engine.test.js` coverage.
3. If the field affects native MIDI output, update `buildNativePlaybackRows()` / `appendNativeHit()` and patch validation.
4. Add Max handlers in `ksh_engine.js` (1-based at the message boundary).
5. Add UI only when user-facing.
6. Update README, [native-timing.md](./native-timing.md) when wire formats change, and `ksh_engine.max.test.js` when wrapper behavior changes.

### Native timing

Default transport playback is documented in [native-timing.md](./native-timing.md). The engine owns table content and gate state; the patch owns step edges and MIDI/`note_hit` output. Features that add per-hit behavior should decide whether values belong in the 9-field coll row, in `buildNativePlaybackRows()`, or in engine-only transport logic.

### UI and engine sync

The engine is the source of truth. UIs mirror `engine_state` and `preview`.

- `engine_state` — compact `v:1` JSON (includes `nativeTiming`); not the generated grid.
- `preview` — generated grid from `snapshot()`.
- Editor source edits are optimistic (`cell` without echo).
- Hot paths use `generatedCellForSourceEdit()` + `markPreviewDirty()`, not `emitFullState()`.

See [ui-sync.md](./ui-sync.md).

### Persistence recovery

Live sets store compact JSON on `textedit` `ksh_pattern_data`. Save: `set` + URI encoding. Restore: `restore_pattern_store` → `pattern_data`. `normalizeIncomingState()` accepts legacy `lane` / `lanes` keys.

New Live fields belong in `serializeForPersistence()` / `deserializeForPersistence()`.

### Debug visibility

`KSH_CONSTANTS.DEBUG` defaults to `false`. Enable locally for Max JSON or `messnamed` failures.

### Naming

Engine and persistence use `channel`. UI labels may say "Lane".

---

## Remaining development risks

### Manual Live/jsui smoke test

The automated gate covers engine logic, native playback rows, Max wrapper plumbing, patch wiring, `.amxd` integrity, and User Library sync. It does not automate `jsui` inside Live.

Before large UI-facing features, confirm in Ableton Live 12.4+ (see [feature-prep-checklist.md](./feature-prep-checklist.md)):

- Compact and editor load and resize.
- Source grid editing and preview updates.
- Native timing on/off, `note_hit` flashes, first-step-on-play.
- Transport playhead and save/reload.

### Deferred cleanup

| Topic | Defer because |
|-------|----------------|
| Split `ksh_ui.js` into modules | Do when editor edits become unsafe in one file. |
| Throttle `preview` during playback | Profile in Live first. |
| Automated `jsui` tests | High setup cost; engine + VM tests cover core logic. |
| Rename UI `lane*` to `channel*` | Cosmetic unless touching those paths. |

---

## Non-negotiable verification

After substantive device edits (`.cursor/rules/post-edit-verification.mdc`):

```sh
node ksh_engine.test.js
node ksh_engine.max.test.js
node scripts/validate-device-patch.js
node scripts/sync-user-library.js
```

When patch wiring changes:

```sh
node scripts/build-device-patch.js
node scripts/validate-device-patch.js
```
