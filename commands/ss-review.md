# ss-review

**Phase: critic** — follow [`harness/ss-flow.md`](../harness/ss-flow.md). Prefer [`/ss-finish`](./ss-finish.md) for the full Done agent; use this leaf for critic-only or re-review.

**Pre-step (Agent, when vendored):** run hard gates before the rubric:

```bash
node .cursor/vendor/skillsync/tools/run-verification.cjs .
node .cursor/vendor/skillsync/tools/tdd-audit.cjs .
```

Then read and follow [`harness-critic.md`](../harness/harness-critic.md) end-to-end (loads [`critic-tdd-testing.md`](../harness/critic-tdd-testing.md) when state has TDD contracts).

**Optional GitNexus** (when MCP indexed — [`docs/gitnexus.md`](../docs/gitnexus.md)): run `detect_changes` on the working tree / branch and fold high-risk process hits into the critic notes. Skip if MCP unavailable.

Available as `/ss-review` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
