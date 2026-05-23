# Agent Execution Protocol: Kick Snare Hat

## 1. Boot sequence

- **Scan:** Read every `.cursor/rules/*.mdc` before your first substantive reply.
- **Stack:** Max for Live MIDI device for **Ableton Live 12.4+**. Logic lives in Max **`js`** / **`jsui`** files (ES5-style JavaScript). **Node.js** is only for tests and repo scripts—not a web app, no React, no npm app toolchain.
- **Ignore:** Svelte/React/Tailwind/Vite/TanStack rules and MCP skills unless this repo gains those files.
- **Workflow source of truth:** `.cursor/rules/post-edit-verification.mdc` for the mandatory post-edit gate (including Ableton sync).
- **Feature prep:** Before feature work, read `docs/feature-prep-checklist.md`; for architecture priorities and unresolved risks, read `docs/future-dev-priorities.md`.

---

## 2. Reasoning and constraints

### A. Think before coding

- **Surface tradeoffs:** State assumptions explicitly. If two or more interpretations exist, **ask**; do not guess.
- **Halt on ambiguity:** If a request is unclear, name the confusion and stop.
- **Senior dev filter:** Prefer the smallest change that satisfies the request. No speculative abstractions.

### B. Surgical implementation

- **Strict scope:** Change only what the task requires.
- **No side effects:** Do not refactor adjacent code, comments, or formatting.
- **Style match:** Mirror existing patterns in `ksh_*.js` and `scripts/` (var, IIFE engine export, Max message handlers as top-level functions).
- **Naming:** New engine/API/persistence fields use **channel**. UI display text may still say “Lane”; avoid widening the internal lane/channel split in new code.
- **Orphan policy:** Remove symbols made unused by *your* edits. Leave pre-existing dead code alone.

### C. Goal-driven loop

1. **Reproduce:** Run or extend `ksh_engine.test.js`, or define a concrete failure in Live.
2. **Execute:** Implement the minimum change.
3. **Verify:** Run the post-edit gate (tests, patch validation when relevant, **Ableton sync**).

---

## 3. Repository map

| Path | Role |
|------|------|
| `ksh_engine.js` | Sequencer engine; Max `js` inlet handlers + `module.exports` for Node tests |
| `ksh_compact_ui.js` | Compact device-strip `jsui` (Presentation) |
| `ksh_ui.js` | Floating editor `jsui` subpatcher |
| `ksh_ui_shared.js` | Shared UI helpers (`include` from both UIs) |
| `ksh_constants.js` | Shared hard limits for engine, UI, and tests |
| `kick-snare-hat.maxpat` | Editable Max patch JSON (wiring shell) |
| `Kick-Snare-Hat.amxd` | Generated M4L device (embedded patch) |
| `ksh_engine.test.js` | Node `assert` tests against exported engine class |
| `ksh_engine.max.test.js` | VM tests for Max wrapper message plumbing |
| `scripts/build-device-patch.js` | Regenerates `.maxpat` + `.amxd`, then syncs to User Library |
| `scripts/validate-device-patch.js` | Patch line wiring + `.amxd` payload checks |
| `scripts/sync-user-library.js` | Copies device artifacts into Ableton User Library |
| `docs/feature-prep-checklist.md` | Future-facing checklist for feature branches |
| `docs/future-dev-priorities.md` | Architecture priorities and non-blocking risks |
| `docs/ui-sync.md` | UI ↔ engine event contract |

**Max message indexes are 1-based** in Live; engine internals use 0-based indices. See `README.md` for message reference.

---

## 4. Architecture (do not break casually)

- **Engine ↔ UI:** Engine emits `engine_state` / `preview` via `messnamed("ksh_engine_events", ...)`. UIs send commands through `messnamed("ksh_ui_commands", ...)` and the patch routes them to `ksh_engine.js`.
- **Persistence:** hidden `textedit` Live parameter `ksh_pattern_data` stores compact JSON via `text` message from the engine; restore via `pattern_data` (not `setvalueof`, which rejects Live’s atom lists). UIs mirror state; they are not the source of truth.
- **Transport:** `plugsync~` + `transport_position` drive step timing; `live.observer` for tempo and stop → `reset`.
- **Dual runtime:** `ksh_engine.js` wraps the class in an IIFE with `module.exports` for Node and Max-only `outlet` / `Task` / `messnamed` code behind `if (typeof module === "undefined" || !module.exports)`.

---

## 5. Post-edit gate (required)

After **any substantive device edit** (see `post-edit-verification.mdc`):

```sh
node ksh_engine.test.js
node ksh_engine.max.test.js
node scripts/validate-device-patch.js
node scripts/sync-user-library.js
```

When **patch wiring or `scripts/build-device-patch.js`** changes:

```sh
node scripts/build-device-patch.js
node scripts/validate-device-patch.js
```

(`build-device-patch.js` already calls sync; still run sync if you edited `.js` without rebuilding.)

Override sync destination with `KSH_ABLETON_DEST`. Default macOS path is documented in `README.md`.

---

**Status:** Protocol active.
