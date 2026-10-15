# ss-reference-import-flow

Orient the human or agent on the **reference-import overlay** (evidence lane → product lane → Story TDD spine).

**Read first:** [`reference-import-flow`](../skills/engineering/reference-import-flow/SKILL.md) skill.

**Then read** the consumer addendum if this repo defines one (Quick Builder: `qb-bricks-import-workflow` under `quickpress-builder/.cursor/skills/`).

## Steps

1. Print the **phase table** (phases 0–6) from the skill — same columns: Belt, What to do, Exit criteria.
2. Print **two-lane rule** (evidence repo vs product repo) in one sentence each for **this** project if the addendum names them; otherwise ask the human to name both roots.
3. Ask: **Which single phase (0–6) and slice** should we run now?
4. **Do not skip ahead** — e.g. no product implement before slice evidence + `/ss-plan` state unless the user explicitly overrides.
5. For phases **3–5**, point to [`/ss-flow`](./ss-flow.md) for fresh-agent policy and Done leaves.

## When to use

- Bricks (or other) builder import initiatives
- User mentions REA, evidence pass, silent-gopher worktree, or getting lost between REA and Quick Builder
- Before starting a new **element** mapper

## When not to use

- Ordinary one-story work with no external reference builder → [`/ss-flow`](./ss-flow.md) only
- Bug belt → [`/ss-bug-fix`](./ss-bug-fix.md)

This command will be available in chat with `/ss-reference-import-flow`
