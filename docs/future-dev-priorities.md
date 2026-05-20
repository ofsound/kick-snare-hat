# Future development priorities

Prioritized improvements aimed at **ease of future development** on Kick Snare Hat—not end-user features or performance tuning. Derived from a codebase review (engine, UIs, patch tooling, and tests).

**Suggested execution order:** 1 → 2 (use while doing 1) → 3 → 4 (can land in parallel) → 5 (cleanup when touching the editor).

---

## 1. Single shared schema for cells, channels, and rates

**Priority:** Highest

**Problem:** Adding a parameter or cell field today touches several places with near-duplicate logic:

- `ksh_engine.js` — setters, `cloneCell`, `defaultCell`, `normalizeGateMode`, `normalizeRate`
- `ksh_ui_shared.js` — `defaultCell`, `cloneCell`, `applyEngineState`, `applyStatusMessage`
- `ksh_compact_ui.js` / `ksh_ui.js` — local state and send helpers
- Literal fallbacks in engine and UI if `ksh_constants.js` fails to load (must stay manually in sync)

**Proposal:**

- Extend `ksh_constants.js`, or add `ksh_schema.js` loaded via `require` (Node) and `include()` (Max) from engine and both UIs.
- Centralize:
  - Cell defaults and `cloneCell` / `normalizeGateMode`
  - Rate allowlist (one array for engine validation and UI `cycleRate`)
  - Optional: small helpers for Max-facing status strings (e.g. `"steps " + n`)

**Acceptance criteria:**

- One implementation of cell clone/normalize used by engine and UIs.
- Rate list defined once; engine and UI stay aligned.
- README “Adding a parameter” updated to point at the shared module first.

**Payoff:** New fields become “update schema once, wire handlers” instead of hunting four copies.

---

## 2. Dev-visible errors instead of silent `catch {}`

**Priority:** High

**Problem:** Many paths swallow errors with empty `catch` blocks (`engine_state`, `preview`, `safeMessnamed`, patcher resize, etc.). That helps the device survive Live reload/recompile but **hides real bugs** during feature work.

**Proposal:**

- Add a simple debug switch (e.g. `KSH_DEBUG` at the top of a shared file, or a commented `var` developers flip locally).
- When enabled, `post()`:
  - JSON parse failures in UI handlers
  - Unexpected `messnamed` errors (distinguish from known reload transients if possible)
  - Patcher/box resize failures
- Default remains silent in normal use.

**Acceptance criteria:**

- Flipping debug on surfaces at least parse and deserialize failures without changing production behavior when off.
- Document the flag in README or `AGENTS.md`.

**Payoff:** Faster iteration in Max; fewer “UI didn’t update and I don’t know why” sessions.

---

## 3. Harden `setvalueof` / `deserialize` against bad JSON

**Priority:** High

**Problem:** `setvalueof` calls `JSON.parse` without a guard. Corrupt or partial `pattrstorage` data can throw on device load and break the session.

**Proposal:**

- Wrap `JSON.parse` and `deserialize` in try/catch.
- On failure: `post()` a short, actionable message; keep or restore last good engine state (or minimal safe defaults).
- Optionally emit `engine_state` once after successful recovery so UIs resync.

**Acceptance criteria:**

- Invalid JSON string does not crash the `js` object.
- Valid partial state still applies via existing `deserialize` guards where possible.
- Add or extend coverage in `ksh_engine.max.test.js` for malformed `setvalueof` input.

**Payoff:** Safe to extend serialization (new fields, migrations) without bricking devices in Live.

---

## 4. Written contract for UI ↔ engine sync

**Priority:** Medium

**Problem:** The sync model is correct but **implicit**: optimistic editor `state.sources`, no `cell` echo from engine, different compact vs editor roles. New work often risks full `emitFullState` on every edit or expecting round-trip `cell` messages.

**Proposal:**

- Add a short doc (`docs/ui-sync.md` or a README section) covering:
  - **`engine_state`** — payload is `serialize()`: sources + globals; **not** generated grid.
  - **`preview`** — generated grid only (`snapshot()` subset).
  - **Status selectors** — which engine setters emit `steps`, `channels`, `mode`, etc. vs full state.
  - **When to call `sync_all`** — load, editor open, after `setvalueof`, etc.
  - **Compact vs editor** — compact holds layout + `previewData`; editor holds full `sources` and sends `cell` / channel commands.
  - **Optimistic UI** — editor updates local cells then sends to engine; engine does not echo `cell` to UI today.

**Acceptance criteria:**

- A new contributor can answer “what message fires when I change velocity?” without reading all handlers.
- Link from `README.md` and/or `AGENTS.md`.

**Payoff:** Less re-learning on every feature; fewer accidental bus floods or UI/engine desync.

---

## 5. Remove or implement dead UI paths; standardize `channel` in new code

**Priority:** Medium (low effort, high clarity)

**Problem:**

- `applyIncomingCell` and the `anything()` `cell` branch in `ksh_ui.js` have **no producer** in engine or patch—dead code that looks intentional.
- **Lane vs channel** naming splits engine/API (`channel`) from UI state (`laneCount`, `lanes`); workable via `normalizeIncomingState` but easy to extend inconsistently.

**Proposal:**

- **Either** remove `applyIncomingCell` and the UI `cell` handler, **or** have the engine emit `cell` after programmatic edits if echo-back is desired.
- Add to `AGENTS.md`: new engine/API/persistence fields use **channel**; UI labels may still say “Lane”.
- Optionally rename internal UI `laneCount` → `channelCount` only when already editing those files (no big-bang rename required).

**Acceptance criteria:**

- No orphaned handlers without a documented producer.
- Naming rule visible in agent/contributor docs.

**Payoff:** Less noise when navigating the editor; naming does not split further on the next feature.

---

## Deliberately lower priority (for this list)

| Topic | Why deferred |
|-------|----------------|
| Transport jump fires one step only | Product behavior; document in UI-sync or README when testing scrub/loop |
| Preview JSON on every refresh step during playback | Optimize when profiling shows a problem |
| Automated `jsui` tests | High setup cost; engine + Max VM tests already cover core logic |
| 500 ms editor visibility polling | Max limitation; note in UI-sync doc rather than refactor first |

---

## References

- Architecture: `AGENTS.md`, `README.md` (“Adding a parameter”)
- Engine rules: `.cursor/rules/max-js-engine.mdc`
- UI rules: `.cursor/rules/max-jsui.mdc`
- Tests: `ksh_engine.test.js`, `ksh_engine.max.test.js`
