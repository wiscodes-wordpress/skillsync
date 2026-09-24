# ss-peer-review

**Phase: inbound review** — review a pull request **someone else** wrote. For your own branch use [`/ss-review`](./ss-review.md) (harness critic, PASS/FAIL into `.harness/state.md`).

Read and follow [`peer-review`](../skills/engineering/peer-review/SKILL.md) end-to-end. It loads [`REVIEW-RUBRIC.md`](../skills/engineering/peer-review/REVIEW-RUBRIC.md) (severity ladder, comment budget) and [`PROFILES.md`](../skills/engineering/peer-review/PROFILES.md) (repo conventions and verification commands) at Phase 3.

**Argument:** a PR number or URL. With no argument, list what is waiting:

```bash
node tools/list-prs.cjs        # or .cursor/vendor/skillsync/tools/list-prs.cjs when vendored
```

**Non-negotiable:** drafts every comment in chat first and posts only on an explicit go; never approves, never pushes to the author's branch, never resolves their threads.

Available as `/ss-peer-review` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`) or copied into `~/.claude/commands/`.