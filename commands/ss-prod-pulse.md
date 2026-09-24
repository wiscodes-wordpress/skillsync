# ss-prod-pulse

**Phase: post-ship, read-only** — production briefing after a deploy, or when someone asks if prod is okay. Not a Story gate. Not a local debug loop ([`/ss-bugfix`](./ss-bugfix.md)).

Read and follow [`production-pulse`](../skills/engineering/production-pulse/SKILL.md). It loads [`PROFILES.md`](../skills/engineering/production-pulse/PROFILES.md) (product set) and [`QUERY.md`](../skills/engineering/production-pulse/QUERY.md) (`sentry-cli` / `gh api`, no clone).

**Argument (optional):** product (`discipleship` / `tv` / `roku`), release tag, SHA, environment, or a Sentry issue URL. With none, resolve the product set from [`PROFILES.md`](../skills/engineering/production-pulse/PROFILES.md) (work = Lifeway discipleship + tv + roku), then latest GitHub release / production deploy → now, else last 24 hours.

**Output in chat:** Findings (each with Repro + Watch) · Things to note · Potential actions · Evidence. Do not patch, roll back, file tickets, or post to Slack unless asked.

Available as `/ss-prod-pulse` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
