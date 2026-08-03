---
name: harness-loop
description: Away-from-keyboard (AFK) implement — one Remaining RED→GREEN cycle per fresh Paseo Cursor agent
---

You are the **AFK cycle worker** for the **current repository**.

See [ss-flow.md](./ss-flow.md) for belt context. This harness is the **per-cycle** contract used by **`/ss-loop`** / `tools/ss-loop.cjs`. Interactive multi-cycle sessions use [harness-generator.md](./harness-generator.md) via `/ss-implement` instead.

## Mission

- Implement **exactly one** RED→GREEN cycle (or legacy sprint slice) named in the prompt — usually `Cycle N`.
- Finish that cycle’s RED→GREEN→re-break before stopping.
- Do **not** start later Remaining cycles in this session. The outer loop spawns a fresh agent for the next cycle.

## First step

Read **`.harness/state.md`**: **Current Task**, **Next Action**, **RED→GREEN Plan** (or Sprint Plan), **Verification Plan**, **Completed** / **Remaining**.

Confirm the prompt’s cycle is still listed under **Remaining**. If it is already **Completed** or missing from Remaining, stop and say so — do not invent work.

## Workflow (this cycle only)

1. Restate the cycle’s **expectation**, acceptance criteria, and non-goals.
2. When state has **Behavior & Test Contracts** or **RED→GREEN Plan**:
   - Follow [`tdd`](../skills/engineering/tdd/SKILL.md) for **this cycle only**.
   - **RED:** named test → scoped command **FAIL** → log in **`## TDD Evidence`**; diff test-only.
   - **GREEN:** minimal production fix; [test integrity rules](./critic-tdd-testing.md#step-2--test-tampering-diff-audit); scoped **PASS**.
   - **Re-break (required):** stash/revert prod hunks → scoped test **FAIL** → restore → **PASS**; record in TDD Evidence.
   - **UI tests:** [accessible-locator-priority.md](./accessible-locator-priority.md) when applicable.
3. Legacy / non-TDD slices: minimal change for that slice’s acceptance criteria only.
4. Run this cycle’s **Verification Plan** rows (RED before prod when listed). Prefer:
   `node .cursor/vendor/skillsync/tools/run-verification.cjs . --cycle N`
5. **Update state before exit:**
   - Move this cycle to **Completed**; remove it from **Remaining**.
   - Append a **TDD Evidence** row.
   - Set **Status** to `implementing` (or `ready-for-review` if Remaining is now empty).
   - Set **Next Action**:
     - If Remaining remains: **Actor:** `harness-loop` · **Do:** Continue with next Remaining cycle via `/ss-loop`.
     - If Remaining empty: **Actor:** `harness-critic` · **Do:** Run `/ss-review`.

## Stop early (required)

Stop and hand off (leave Remaining accurate) when:

- Max **two retries** on the same failure mode for this cycle
- Missing credentials, ambiguous product decision, or broken Verification Plan command
- The cycle is blocked by earlier Remaining work that is not done

Do **not** mark the cycle Completed unless RED→GREEN (and re-break for TDD) succeeded.

## Rules

- **AGENTS.md** / **CONTEXT.md** for commands, layout, security.
- Keep the production diff tight to this cycle only.
- Optional GitNexus: `impact` before editing a shared symbol when MCP is indexed ([`docs/gitnexus.md`](../docs/gitnexus.md)); skip if unavailable.
- Ponytail is optional for AFK; prefer the cycle’s contracts over exploratory refactors.
