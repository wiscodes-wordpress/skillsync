# ss-loop

**Phase: AFK implementation** — Story Implement (AFK) under [`/ss-flow`](./ss-flow.md). Map: [`harness/ss-flow.md`](../harness/ss-flow.md). After Remaining is empty → [`/ss-finish`](./ss-finish.md).

**Away-from-keyboard (AFK) twin of [`ss-implement`](./ss-implement.md):** walk **Remaining** RED→GREEN cycles (or sprint slices) by spawning a **fresh Cursor agent per cycle** via [Paseo](https://paseo.sh/). Memory stays in `.harness/state.md` + git. Interactive implement stays `/ss-implement`.

**Setup (once):** [`docs/ss-loop.md`](../docs/ss-loop.md) — Paseo daemon, Cursor provider, Auto-review / `permissions.json`.

1. Preconditions — `node .cursor/vendor/skillsync/tools/validate-state.cjs . --mode implement`; Paseo daemon running; Cursor provider available (`paseo provider` / MCP `list_providers`).
2. Orchestrator — [`harness-loop.md`](../harness/harness-loop.md) + run:
   `node .cursor/vendor/skillsync/tools/ss-loop.cjs .`
   (defaults: **Cursor** provider, **`composer-2.5`** model — cost-efficient Cursor Models pool; override with `--model` only when needed)
3. Default: all **Remaining** cycles in order — **one fresh agent per cycle** (no duplicate respawns when Remaining is unchanged). Scope overrides (passed through to the tool): `only Cycle N`, `through Cycle N`, or flags `--cycle N` / `--through N` / `--max-iterations N`.
4. After Remaining is empty → **Next Action** points at `/ss-review` (`harness-critic`). Do not skip review.

**Evidence:** same as implement — **`## TDD Evidence`** + Verification Plan via `run-verification.cjs`.

Available as `/ss-loop` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
