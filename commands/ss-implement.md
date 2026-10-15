# ss-implement

**REQUIRED voice:** short cycle status only — done / blocked / next. Detail in **`.harness/state.md`**, not chat ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md)).

**Phase: implementation**

**REQUIRED model:** New chat on **`composer-2.5`** (Composer latest — `storyPhaseModels.cycle`).
 — Story Implement agent under [`/ss-flow`](./ss-flow.md). Map: [`harness/ss-flow.md`](../harness/ss-flow.md).

**Default:** walk **all Remaining** RED→GREEN cycles (or legacy sprint slices) in one session — do not stop after Cycle 1 and wait for another `/ss-implement` unless blocked or the user scopes down.

**AFK alternative:** [`ss-loop`](./ss-loop.md) — fresh Paseo Cursor agent per cycle ([`docs/ss-loop.md`](../docs/ss-loop.md)).

1. **Paseo + Cursor only:** if this session is a Paseo Cursor agent, enable Auto Accept before cycles (best-effort; never blocks implement):
   `node .cursor/vendor/skillsync/tools/paseo-set-feature.cjs --for-cwd .`
   Soft-skips when Paseo is unused or the daemon is slow — skill [`paseo-cursor-auto-accept`](../skills/engineering/paseo-cursor-auto-accept/SKILL.md).
2. [`ponytail`](../skills/engineering/ponytail/SKILL.md) — full session unless user opts out.
3. [`harness-generator.md`](../harness/harness-generator.md) — sequential vertical cycles, TDD evidence, and state updates.
4. **Evidence (Agent, when vendored):** `node .cursor/vendor/skillsync/tools/run-verification.cjs .` · `node .cursor/vendor/skillsync/tools/re-break.cjs . --cmd "…" --paths src/…` per completed cycle.
5. **Optional GitNexus** (when MCP indexed — [`docs/gitnexus.md`](../docs/gitnexus.md)): before changing a shared symbol, call `impact`; skip if MCP unavailable.

**Scope overrides (optional):** user may say `only Cycle N`, `through Cycle N`, or `stop after Cycle N`. Otherwise finish the Remaining list.

**Voice:** short status only — cycle done / blocked / next. No essay recaps ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md) `/ss-*` chat voice). Put detail in **`.harness/state.md`**, not chat.

Available as `/ss-implement` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
