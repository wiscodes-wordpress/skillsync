# ss-release

**Phase: release / go-to-market (optional)** — after ship (merge / tag / user request). Not a gate for [`ss-submit-pr`](./ss-submit-pr.md). See [`ss-flow.md`](../harness/ss-flow.md).

Orchestrates the full release pack: **Release Brief → distribution proof → marketing channels → anti-slop**, with deterministic structure gates.

In **Agent** mode:

1. **Brief** — if `.harness/release-brief.md` is missing, run `node <vendor>/tools/init-release-brief.cjs . [--version <ver>]`. Grill lightly (2–4 questions) only if empty fields remain. Fill version, audience, 3–5 feature bullets, CTA, do-not-claim.
2. **Validate brief** — `node <vendor>/tools/validate-release-brief.cjs . --mode ready` (use `--mode structure` right after init). Fix until exit 0.
3. **Distribution** — follow [`release-distribution`](../skills/productivity/release-distribution/SKILL.md): legit seed → tagged `@release`/`@demo` E2E → index proof assets on the brief. If the consumer has no E2E/seed yet, note gaps and continue.
4. **Marketing** — follow [`release-marketing`](../skills/productivity/release-marketing/SKILL.md): write the channel pack under `.harness/release/<version>/` or `docs/releases/<version>/`.
5. **Anti-slop** — apply [`anti-slop`](../skills/productivity/anti-slop/SKILL.md) to all prose before finish.
6. **Validate pack** — `node <vendor>/tools/validate-release-pack.cjs . [--version <ver>]`. Fix until exit 0.
7. **Report** — list brief path, proof table, and pack paths.

**Partial runs:** [`ss-release-distribution`](./ss-release-distribution.md) or [`ss-release-marketing`](./ss-release-marketing.md) alone.

**Skip** during story TDD. **After** merge/tag when launch assets are needed.

Available as `/ss-release` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
