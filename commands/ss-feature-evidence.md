# ss-feature-evidence

**Phase: human feature check** — follow [`harness/ss-flow.md`](../harness/ss-flow.md). Run **after `/ss-security-audit` PASS**, before `/ss-handoff` and `/ss-submit-pr`. Usually via [`/ss-finish`](./ss-finish.md).

Records a paced browser end-to-end (E2E) journey (Playwright first) with **video on**, then writes a watch card. **Does not** replace critic / security, open a PR, or produce Ship launch clips (`/ss-release-distribution`).

In **Agent** mode, follow [`feature-video-evidence`](../skills/engineering/feature-video-evidence/SKILL.md):

1. Name **one** feature (user, or Behavior & Test Contracts in **`.harness/state.md`**).
2. Confirm the consumer has Playwright (or existing Cypress). If not, stop and say what is missing.
3. Tag or add an `@evidence` spec per [RECORDING.md](../skills/engineering/feature-video-evidence/RECORDING.md). Locators: [`accessible-locator-priority.md`](../harness/accessible-locator-priority.md).
4. Run `--grep @evidence --workers=1` (or the consumer’s evidence script).
5. Collect the clip:

```bash
node .cursor/skills/feature-video-evidence/scripts/collect-video.cjs . --slug "<kebab-feature>"
```

6. Write **`.harness/feature-evidence.md`** from [CARD.md](../skills/engineering/feature-video-evidence/CARD.md). Pointer only on **`.harness/state.md`**.
7. Print the **card** and **video** paths. Human watches and ticks **Human verdict**. Do not tick it for them.

**Skip** when there is no user-visible surface, no browser E2E, or the human already saw the feature live.

In **Ask** mode, print the skill outline and exact commands; write files only if asked.

**Inputs:** feature name; app URL from consumer `AGENTS.md` / env. Not production hosts unless the human names one.

**Voice:** print the two paths and next step only ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md)).

Available as `/ss-feature-evidence` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
