# ss-implement

**Phase: implementation** — follow [`ss-flow.md`](../harness/ss-flow.md).

**Default:** walk **all Remaining** RED→GREEN cycles (or legacy sprint slices) in one session — do not stop after Cycle 1 and wait for another `/ss-implement` unless blocked or the user scopes down.

**AFK alternative:** [`ss-loop`](./ss-loop.md) — fresh Paseo Cursor agent per cycle ([`docs/ss-loop.md`](../docs/ss-loop.md)).

1. [`ponytail`](../skills/engineering/ponytail/SKILL.md) — full session unless user opts out.
2. [`harness-generator.md`](../harness/harness-generator.md) — sequential vertical cycles, TDD evidence, and state updates.
3. **Evidence (Agent, when vendored):** `node .cursor/vendor/skillsync/tools/run-verification.cjs .` · `node .cursor/vendor/skillsync/tools/re-break.cjs . --cmd "…" --paths src/…` per completed cycle.
4. **Optional GitNexus** (when MCP indexed — [`docs/gitnexus.md`](../docs/gitnexus.md)): before changing a shared symbol, call `impact`; skip if MCP unavailable.

**Scope overrides (optional):** user may say `only Cycle N`, `through Cycle N`, or `stop after Cycle N`. Otherwise finish the Remaining list.

Available as `/ss-implement` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
