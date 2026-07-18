---
name: release-marketing
description: >
  Build a release channel pack from a Release Brief — email, social, YouTube, and
  SEO-aware blog shell — then run anti-slop before finish. Use when shipping a release,
  writing launch copy, running /ss-release-marketing or /ss-release, or turning changelog
  bullets into go-to-market assets. Does not upload to ESPs or social APIs.
---

# Release marketing

Produce a **channel pack** from a shared **Release Brief** (and optional proof assets from [`release-distribution`](../release-distribution/SKILL.md)). Always finish with [`anti-slop`](../anti-slop/SKILL.md).

Invoke via **`/ss-release-marketing`** or as the marketing phase of **`/ss-release`**.

## When to use

| Use this | Skip / use something else |
|----------|---------------------------|
| Post-ship launch copy for email / social / YouTube / blog | Pre-ship planning → ss delivery loop (`/ss-plan`, etc.) |
| Turning a changelog into channel-ready drafts | Long tutorial body → [`technical-writing`](../technical-writing/SKILL.md) after this SEO shell |
| Need human-sounding marketing prose | Demo seed / E2E clips only → [`release-distribution`](../release-distribution/SKILL.md) |

**Non-goals:** no auto-post to email ESP, LinkedIn, X, or YouTube; no product-specific brand kits (consumers add `TONE.md` / wrappers).

## Order in the release flow

```text
Release Brief → (optional) /ss-release-distribution → /ss-release-marketing → anti-slop → pack paths
```

Orchestrator: **`/ss-release`** runs brief → distribution (when available) → this skill.

## Shared artifact: Release Brief

**Default path:** `.harness/release-brief.md`  
**Alternate (if consumer commits releases):** `docs/releases/<version>/brief.md` — use when the brief already lives there or the user asks to commit the pack.

### Brief sections (create or complete)

```markdown
# Release Brief

- **Version:**
- **Date:**
- **Audience:**

## Features (3–5 bullets)

-

## Proof assets

- (filled by release-distribution: clips, stills, E2E tags)

## Primary CTA

- **Label:**
- **URL:**

## Out of scope / do-not-claim

-

## Tone

- **TONE.md path:** (optional)
```

**Grill lightly** (2–4 questions) only if the brief is missing or empty. Do **not** re-interview when a brief already exists unless the user asks to refresh.

## Output pack

Prefer:

1. `.harness/release/<version>/` when staying local/harness-scoped  
2. `docs/releases/<version>/` when the consumer wants committed launch docs  

Write:

| File | Role |
|------|------|
| `README.md` | Index + links to brief + proof |
| `email.md` | Subject, preheader, body, CTA, plain-text alt |
| `social.md` | LinkedIn + X/short |
| `youtube.md` | Titles, description, chapters, pinned comment, thumbnail text |
| `blog.md` | SEO shell + outline or short draft |

Skeletons: [TEMPLATES.md](TEMPLATES.md).

## Workflow

### 1. Load inputs

1. Release Brief (create/complete if needed).
2. Proof assets section (clips/stills) — if empty, note gaps in `README.md`; still draft copy from feature bullets.
3. Consumer `TONE.md` when the brief points at one.
4. Changelog / PR / tag notes the user provides.

### 2. Draft each channel

Fill templates from [TEMPLATES.md](TEMPLATES.md). One idea per channel piece; reuse the same 3–5 bullets — do not invent features.

**Blog / SEO:** marketing owns keywords, slug, title/H1 rules, meta description, outline (and a short draft if asked). For a long practitioner tutorial, hand off the body to [`technical-writing`](../technical-writing/SKILL.md) — do not merge skills.

### 3. Anti-slop pass

Read [`anti-slop`](../anti-slop/SKILL.md). Revise every prose file until the checklist passes. Prefer specific product language over hype.

### 4. Index and handoff

Write `README.md` with paths. Tell the user where the pack lives. Next steps are manual publish (ESP, social, YouTube, CMS) unless the consumer has its own wrappers.

## Interaction model

1. Synthesize from brief first — do not start with a long interview.
2. Ask only for missing brief fields or CTA URL.
3. Persist the pack; summarize what was written.

## Out of scope

- Uploading or scheduling posts
- Video editing / stitching (see distribution skill)
- Replacing technical-writing or external YouTube *script* skills
- Product Jira keys or brand-only slash commands
