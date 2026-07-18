# ss-release-distribution

**Phase: release proof assets (optional)** — part of post-ship go-to-market. See [`ss-flow.md`](../harness/ss-flow.md).

Prepare **legit demo seed** and capture **E2E demo clips/screenshots**; index paths on the Release Brief. Does **not** write channel copy (use [`ss-release-marketing`](./ss-release-marketing.md)) or stitch final video.

In **Agent** mode, follow [`release-distribution`](../skills/productivity/release-distribution/SKILL.md):

1. Ensure brief exists — `init-release-brief.cjs` if missing; fill features; `validate-release-brief.cjs --mode ready` (or `--mode structure` mid-fill).
2. Run legit seed per [SEED.md](../skills/productivity/release-distribution/SEED.md) — consumer entrypoint; separate from test fixtures.
3. Run tagged demo E2E per [DEMO-E2E.md](../skills/productivity/release-distribution/DEMO-E2E.md) (`@release` / `@demo`; video + screenshots).
4. Write **Proof assets** + suggested stitch order onto the brief.
5. **Handoff:** offer **`/ss-release-marketing`** or full **`/ss-release`**.

**Skip** when proof assets already exist and the user only wants copy. Full pipeline: [`ss-release`](./ss-release.md).

Available as `/ss-release-distribution` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
