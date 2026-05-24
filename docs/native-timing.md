# Native playback

Native playback is the transport playback path. The engine precomputes MIDI hits into a Max `coll`; the patch schedules notes on transport step edges and forwards UI flash events to the UIs.

For the UI ↔ engine message contract, see [ui-sync.md](./ui-sync.md).

---

## Responsibilities

| Layer | Role |
| --- | --- |
| `ksh_engine.js` | Builds the playback table, publishes clock metadata, opens or closes the native patch gate, handles `transport_position` for editor step feedback and refresh-window generation, and serves pattern persistence. |
| Max patch (`scripts/build-device-patch.js`) | Derives the current playback row from `plugsync~`, looks up `coll ksh_native_playback`, outputs MIDI through `pipe` / `makenote`, and sends `note_hit` to `ksh_engine_events`. |
| UIs | Compact and editor listen for `note_hit` to flash cells. There is no playback-mode toggle. |

Old saved sets may contain a legacy `nativeTiming` field. The engine ignores it on restore and does not write it back.

---

## Playback table

`buildNativePlaybackRows()` fills one sparse row per native playback index. Row count is `stepCount × cyclePeriod`, where `cyclePeriod` is the least common multiple of active per-cell cycle lengths plus any per-channel boomerang period needed to represent the active loop length (with extra expansion when probability &lt; 100%). The table is capped at **2048** rows; above that, native playback is treated as unsupported and the gate stays closed.

Each stored hit is a flat list of **9** fields (`KSH_CONSTANTS.NATIVE_HIT_FIELD_COUNT`):

| Index | Field | Use |
| ---: | --- | --- |
| 0 | pitch | `makenote` pitch |
| 1 | velocity | `makenote` velocity |
| 2 | duration ms | `makenote` duration |
| 3 | MIDI channel | fixed device channel (1) |
| 4 | delay ms | `pipe` delay for swing / timing humanize |
| 5 | UI channel | 1-based lane index for `note_hit` |
| 6 | UI generated step | 1-based generated-grid step after per-channel playback mapping |
| 7 | UI source | 1-based source pattern |
| 8 | UI source step | 1-based source-grid step after per-channel playback mapping |

Swing and timing humanize are applied when the table is built: early hits are placed on earlier row indices with a positive `pipe` delay. Timing humanize uses `stepIntervalMs × 0.2 × (timingHumanize / 100)` as its maximum ± offset in milliseconds.

Velocity humanize is rolled into stored velocities at table build time. Cycle gates and probability are resolved when the table is built (probability uses a 16× row expansion when any cell has probability &lt; 100%).

Roll values expand one logical step into multiple 9-field hits inside the same
step duration. Roll `1` is the default and emits the existing single hit; roll
`2`-`8` emit evenly spaced subdivisions within the step. Probability and cycle
gates are evaluated once for the logical step, then all roll hits are emitted if
the step plays. Swing and timing humanize apply only to the first roll hit; the
remaining subdivisions use their exact intra-step offsets. Roll note durations
are clamped below the subdivision interval to avoid overlapping repeated notes.

Per-channel playback mode is also resolved when rows are built. `normal`
preserves the current generated step order, `reverse` mirrors the transport
position through the channel loop length, and `boomerang` plays forward then
backward with repeated endpoints.

The engine pushes rows with:

- `messnamed("ksh_native_playback_commands", "clear")`
- `messnamed("ksh_native_playback_commands", "store", <rowIndex>, ...fields)`

Any edit that changes generated output triggers `syncNativePlaybackTable()`.
During interactive table swaps, the engine closes `ksh_native_timing_gate`,
clears the shared note scheduler if transport is running, publishes the new rows
and metadata, primes the patch `change` object with the current native row via
`ksh_native_step_reset set <row>`, then reopens the gate if native playback is
supported. This can drop pending delayed notes during an edit, but it
prevents metadata or row-table updates from producing out-of-time MIDI edges.
Transport-driven refresh-window swaps also close the gate while rows are
replaced, but they do not clear pending delayed notes or prime away the current
step.

---

## Patch clock and step edges

**Clock metadata** (`messnamed("ksh_native_meta", "meta", beatsPerStep, phaseOffsetBeats, nativePlaybackStepCount)`) feeds:

- `beatsPerStep` → native step duration
- `phaseOffsetBeats` → expr phase inlet
- `nativePlaybackStepCount` → expr modulo length

**Step index** comes from `plugsync~` beat position after a `trigger` has
updated and emitted the packed `transport_position` message:

```text
expr floor(((beat - phase) / beatsPerStep) + 0.000001) % stepCount
```

**Step edges** use a `change` object:

- `transportbeat` is `t f b f`: first it updates the packed beat, then it
  bangs `transport_position` through the engine and native gates, then it
  computes the native step. That prevents the first play edge from hitting a
  stale stopped gate.
- Step integers reach `change` only while `is_playing` is 1
  (`native-step-input-gate`) and `ksh_native_timing_gate` is 1
  (`native-mode-gate`), so stopped transport or a closed native gate does not
  silently prime step 0.
- On transport stop and device load, `set -1` resets `change` memory (`sel 0` from `live.observer is_playing`, plus `loadbang`).
- A bang from `change` on a new step index looks up the current row in
  `coll ksh_native_playback`.

**Gate** (`messnamed("ksh_native_timing_gate", 0|1)`): the engine sets `1` only when `device_active` and a supported table size are both true.

**MIDI output path:**

```text
coll ksh_native_playback → zl.iter 9 → unpack → pipe → makenote → noteout
```

**UI flash path** (same unpack, fields 5–8):

```text
pack → prepend note_hit → s ksh_engine_events
```

---

## Engine Transport

`transport_position` still runs for:

- `current_step` (editor playhead when the editor is active)
- Refresh-window generation (`stack` / `per_channel`) and native table rebuilds on new refresh-boundary steps
- Transport stop → engine `reset` and scheduler clear on the playing→stopped transition
- No per-step `emitNote` / `note_hit` from the engine during transport playback; the patch owns note output

Auditions and other one-shot notes still use the engine outlet into the shared `pipe` / `makenote` path.

---

## Patch wiring checklist

Regenerate from `scripts/build-device-patch.js`; `scripts/validate-device-patch.js` asserts native scheduler boxes and lines. Do not break:

- `r ksh_native_meta` → `route meta` → `unpack f f i` → bps / phase / steps
- `transportbeat` (`t f b f`) → update/bang `transportpos`, then step `expr`
- `transportpos` → `unpack` → `is_playing` to input gate
- `native-step-input-gate` → `native-mode-gate` → `change`
- `native-step-reset-msg` (`set -1`) ← `sel 0` (stop) and `loadbang`
- `r ksh_native_step_reset` → `change` for table-swap priming
- `r ksh_native_playback_commands` → `coll ksh_native_playback`
- `r ksh_native_timing_gate` → `native-mode-gate` before `change`
- `zl.iter 9` → `unpack i i i i f i i i i` → MIDI + `note_hit` send

---

## Tests

- `ksh_engine.test.js` — `buildNativePlaybackRows()`, metadata fields, native playback gating, transport suppression from the JS outlet, and legacy `nativeTiming` compatibility.
- `ksh_engine.max.test.js` — coll `store` messages, timing gate, native table swaps, and transport suppression from the JS outlet.
