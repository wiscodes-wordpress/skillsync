# ss-release-marketing

**Phase: release channel pack (optional)** — part of post-ship go-to-market. See [`ss-flow.md`](../harness/ss-flow.md).

Build **email, social, YouTube, and SEO blog** drafts from the Release Brief (and any proof assets). Always finish with [`anti-slop`](../skills/productivity/anti-slop/SKILL.md). Does **not** seed data or record E2E (use [`ss-release-distribution`](./ss-release-distribution.md)).

In **Agent** mode, follow [`release-marketing`](../skills/productivity/release-marketing/SKILL.md):

1. Read or create `.harness/release-brief.md`; grill lightly only if empty.
2. Draft pack from [TEMPLATES.md](../skills/productivity/release-marketing/TEMPLATES.md) into `.harness/release/<version>/` or `docs/releases/<version>/`.
3. Run the **anti-slop** checklist on all prose.
4. Write pack `README.md`; report paths.

**Skip** when only demo clips are needed. Full pipeline: [`ss-release`](./ss-release.md). Long tutorial body after the SEO shell → [`technical-writing`](../skills/productivity/technical-writing/SKILL.md).

Available as `/ss-release-marketing` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
