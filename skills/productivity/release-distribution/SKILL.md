---
name: release-distribution
description: >
  Prepare legit demo seed data and capture release proof assets from tagged E2E
  demo journeys (video clips, screenshots), then index paths on the Release Brief.
  Use when preparing a release reel, running /ss-release-distribution or /ss-release,
  or turning Playwright demo specs into launch proof. Does not stitch final videos
  or upload to social platforms.
---

# Release distribution

Make the product **look real** for launch, then capture **proof assets** for the shared Release Brief and [`release-marketing`](../release-marketing/SKILL.md).

Invoke via **`/ss-release-distribution`** or as the distribution phase of **`/ss-release`**.

## When to use

| Use this | Skip / use something else |
|----------|---------------------------|
| Need believable demo data + recorded feature journeys | Channel copy only → [`release-marketing`](../release-marketing/SKILL.md) |
| Release reel / What’s new clips from existing E2E | Everyday TDD E2E spines → stay in delivery loop |
| Indexing clip/still paths onto the brief | Auto-upload to YouTube / social |

**Non-goals:** no CapCut/FFmpeg stitch automation (v1 lists ordered clips only); no ESP/social APIs; no product-specific seed scripts (document conventions; consumer owns entrypoints).

## Order in the release flow

```text
Release Brief → legit seed → tagged demo E2E → proof index on brief → (optional) /ss-release-marketing
```

## Shared artifact: Release Brief

**Default:** `.harness/release-brief.md` (same contract as release-marketing).

Ensure **Features (3–5 bullets)** exist before seeding/recording. Fill **Proof assets** at the end of this skill.

Grill lightly only if the brief is empty.

**Deterministic:** prefer `init-release-brief.cjs` when the brief is missing; run `validate-release-brief.cjs --mode ready` before treating the brief as launch-ready (see [`release-marketing`](../release-marketing/SKILL.md) gates).

## Workflow

### 1. Read / complete the brief

Version, audience, features to demo, CTA. Ask 2–4 questions max if fields are missing.

### 2. Legit demo seed

Follow [SEED.md](SEED.md). Separate from test fixtures (`user1@test.com`). Discover or ask for the consumer entrypoint (`scripts/demo-seed`, WP-CLI, factories, etc.).

### 3. Demo E2E journeys

Follow [DEMO-E2E.md](DEMO-E2E.md). Prefer tags `@release` / `@demo`. Enable video + screenshots. Pace for watching. Assert journey spines lightly — do not re-assert every unit branch.

Locators: prefer role/label priority per [`accessible-locator-priority.md`](../../../harness/accessible-locator-priority.md).

### 4. Asset index

Append or update the brief:

```markdown
## Proof assets

| Order | Feature bullet | Artifact | Path | Notes |
|------:|----------------|----------|------|-------|
| 1 | … | video | `…` | ~Ns |
| 2 | … | screenshot | `…` | |

### Suggested stitch order

1. …
2. …

Manual edit in CapCut (or similar) — skillsync does not stitch in v1.
```

Report paths to the user. Hand off to **`/ss-release-marketing`** when they want the channel pack.

## Consumer expectations

- Browser E2E (usually Playwright) with video recording available for demo tags
- A discoverable demo-seed entrypoint, or willingness to name one
- Optional brand `TONE.md` (used by marketing, not required here)

## Out of scope

- Final video encode / upload
- Replacing CI E2E gates or TDD spines
- Inventing features not on the brief
