# Feature prep cleanup checklist

Highest-value cleanup before adding substantial new device features. Derived from a codebase review (May 2026) and aligned with [future-dev-priorities.md](./future-dev-priorities.md).

**Suggested order:** work top to bottom. Item 2 is cheap—do it early and leave `DEBUG` on while you tackle item 1.

**Related docs:** [ui-sync.md](./ui-sync.md) (event contract), [future-dev-priorities.md](./future-dev-priorities.md) (full rationale).

---

## Already in good shape (no action required)

- [x] **`setvalueof` / persistence recovery** — malformed JSON is caught; prior state is restored; tests in `ksh_engine.max.test.js`.
- [x] **UI ↔ engine sync contract** — documented in `docs/ui-sync.md`; linked from README / AGENTS.
- [x] **Dead `cell` echo handlers** — removed from editor; engine does not echo per-cell edits (by design).
- [x] **Post-edit gate** — engine tests, Max wrapper tests, patch validation, User Library sync.
- [x] **Contributor guardrails** — `AGENTS.md` and `docs/ui-sync.md` document channel vs lane naming.

---

## 1. Single shared schema (highest ROI)

**Why:** Adding a cell field or rate today means hunting duplicate logic in `ksh_engine.js`, `ksh_ui_shared.js`, both UIs, and two ~70-line fallback blocks that must stay manually in sync.

### Tasks

- [x] Treat `ksh_constants.js` as the only place for limits, `DEFAULT_CELL`, `cloneCell`, `normalizeGateMode`, and `normalizeRate`.
- [x] Load shared constants from engine and both UIs via `require` (Node) / `include()` (Max) only—**remove** duplicated fallback implementations in:
  - [x] `ksh_engine.js` (`fallbackConstants` IIFE)
  - [x] `ksh_ui_shared.js` (`fallbackConstants` IIFE)
- [x] If constants fail to load, post one explicit Max error and halt instead of running a second schema copy that can drift.
- [x] Ensure `scripts/build-device-patch.js` `dependency_cache` lists `ksh_constants.js` beside the device.
- [x] Update README **Adding a parameter** to say: schema first in `ksh_constants.js`, then engine → handler → UI.
- [x] Run post-edit gate (see bottom).

### Acceptance

- [x] One `cloneCell` / `normalizeGateMode` / rate list used by engine and UIs.
- [x] `node ksh_engine.test.js` and `node ksh_engine.max.test.js` pass.
- [ ] Device loads in Live with JS files synced; compact + editor grids still edit cells correctly.

---

## 2. Dev-visible errors (`KSH_CONSTANTS.DEBUG`)

**Why:** Silent `catch` paths help Live survive reload/recompile but slow down Max-side debugging.

### Tasks

- [ ] Set `DEBUG: true` in `ksh_constants.js` **locally** while developing (do not ship enabled in release builds unless you adopt an explicit dev build).
- [ ] Confirm `debugPost` fires for at least:
  - [ ] UI `engine_state` / `preview` JSON parse failures (`ksh_compact_ui.js`, `ksh_ui.js`)
  - [ ] `safeMessnamed` / `safeOutlet` failures (`ksh_engine.js`)
  - [ ] Patcher resize failures (`ksh_ui_shared.js`)
- [x] Document in README or `AGENTS.md`:
  - [x] Where to flip `DEBUG`
  - [x] That production/default remains `false`
- [ ] Optionally: note in this checklist to turn `DEBUG` off before tagging a release.

### Acceptance

- [ ] With `DEBUG: true`, a deliberate bad `engine_state` JSON produces a `[ksh]` line in the Max console.
- [ ] With `DEBUG: false`, behavior unchanged for valid paths (no extra `post` noise).

---

## 3. Naming and contributor guardrails (low effort)

**Why:** Engine/API/persistence use **channel**; UI still uses **lane** in state and labels—easy to extend inconsistently on the next feature.

### Tasks

- [x] Add or confirm in `AGENTS.md` (and/or README): new engine/API/persistence fields use **channel**; UI labels may still say “Lane”.
- [ ] When touching editor/compact code anyway: prefer `channelCount` in new UI state keys over new `lane*` names (no big-bang rename required).
- [x] Update [future-dev-priorities.md](./future-dev-priorities.md) §5 to mark dead `cell` handler work as **done**.

### Acceptance

- [ ] A new contributor can find the channel vs lane rule without reading all handlers.

---

## 4. Habits for every feature (ongoing—not one-off cleanup)

Use this on **each** feature branch so cleanup gains are not undone.

### Engine / persistence

- [ ] New persisted fields: `serialize` / `deserialize` / `normalizeIncomingState` (if legacy shapes apply).
- [ ] New setters: emit a **status selector** when UIs need incremental updates; use `emitFullState()` only on load, reset, `setvalueof`, `sync_all`—not on hot paths (see [ui-sync.md](./ui-sync.md)).
- [ ] Cell edits: rely on `generatedCellForSourceEdit` + `markPreviewDirty`; do not call `recomposeWindow` / `generateWindow` from interactive setters unless product requires a full re-roll.
- [ ] Add or extend tests in `ksh_engine.test.js`; touch `ksh_engine.max.test.js` if Max handlers or `getvalueof`/`setvalueof` change.

### UI

- [ ] Editor: optimistic local `state.sources` + `send("cell" …)`; do not wait for engine `cell` echo (none exists).
- [ ] After `.js` edits: `node scripts/sync-user-library.js` (or `--watch` during a session).

### Patch / device shell

- [ ] Wiring changes: edit `scripts/build-device-patch.js` → `node scripts/build-device-patch.js` → `node scripts/validate-device-patch.js`.

### Post-edit gate (required)

```sh
node ksh_engine.test.js
node ksh_engine.max.test.js
node scripts/validate-device-patch.js
node scripts/sync-user-library.js
```

Rebuild first when patch wiring changes:

```sh
node scripts/build-device-patch.js
```

---

## Deferred until a concrete need

| Topic | Defer because |
|-------|----------------|
| Throttle `preview` JSON during playback | Unlikely to matter at ≤32×8; profile in Live first |
| Split `ksh_ui.js` into layout / paint / input modules | Do when editor features make the file painful |
| Automated `jsui` tests | High setup cost; engine + VM tests cover core logic |
| Rename all UI `lane*` → `channel*` | Cosmetic/internal; do incrementally when editing those files |

---

## Quick reference: what not to do on the next feature

- Do **not** add `emitFullState()` on every cell or transport tick.
- Do **not** duplicate cell/rate normalization outside `ksh_constants.js` after item 1 is done.
- Do **not** hand-edit `Kick-Snare-Hat.amxd`; regenerate via `build-device-patch.js`.
- Do **not** call Max APIs from engine code paths used by `require("./ksh_engine")` in Node tests.

---

## Completion sign-off

When items **1–3** are checked off:

- [ ] All acceptance boxes in sections 1–3 are satisfied.
- [ ] Post-edit gate commands pass (section 4).
- [ ] Optional: link this file from README **Development verification** or `AGENTS.md` boot sequence.

You are in a good spot to add product features; use section 4 as the per-feature checklist from here on.
