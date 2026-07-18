# Release marketing templates

Copy these skeletons into `.harness/release/<version>/` or `docs/releases/<version>/`. Replace placeholders. Run [`anti-slop`](../anti-slop/SKILL.md) after drafting.

---

## `README.md`

```markdown
# Release pack — <version>

- **Brief:** `.harness/release-brief.md` (or path)
- **Date:**
- **CTA:** [label](url)

## Channels

| File | Status |
|------|--------|
| [email.md](./email.md) | draft |
| [social.md](./social.md) | draft |
| [youtube.md](./youtube.md) | draft |
| [blog.md](./blog.md) | draft |

## Proof assets

- (from brief — clip/still paths)

## Publish notes

- Manual: ESP / social / YouTube / CMS — not automated by skillsync
```

---

## `email.md`

```markdown
# Email — <version>

## Subject
(< ~50 chars preferred; concrete change, not “Exciting update”)

## Preheader
(< ~90 chars; complements subject, does not repeat it)

## Body

Hi <name or segment>,

<1–2 sentences: what shipped, in plain language.>

<Bullet list of 3–5 features from the brief — one line each.>

<Optional: one proof line — “See it in the clip” / screenshot note.>

**CTA:** <label> → <url>

—

<Sign-off — human name/team, not “The <Product> Team™” unless that is real.>

## Plain-text alt

<Same content without markdown; keep CTA URL on its own line.>
```

---

## `social.md`

```markdown
# Social — <version>

## LinkedIn
- **Hard cap:** ~1,300 characters (aim ≤900)
- **Structure:** hook → what changed → who it helps → CTA link
- **Draft:**

<paste>

## X / short
- **Hard cap:** 280 characters (leave room for URL)
- **Structure:** one concrete claim + CTA
- **Draft:**

<paste>

## Optional Threads / short carousel notes

- Frame 1 hook:
- Frame 2–4: one bullet each from brief:
- Final frame CTA:
```

---

## `youtube.md`

```markdown
# YouTube — <version>

## Title options (pick one)
1. <specific outcome + product>
2. <feature name + what it does>
3. <audience problem + fix>

Avoid: “Ultimate guide”, “You won’t believe”, empty “new feature!!!”

## Thumbnail text (≤3 words)
-

## Description

<First 2 lines = hook + primary keyword once.>

What we cover:
- …

Chapters:
00:00 <intro>
00:__ <feature 1>
00:__ <feature 2>
…

Links:
- CTA: <url>
- Release notes: <url if any>

## Pinned comment
<One sentence + CTA URL. Invite one useful question — not “smash like”.>
```

---

## `blog.md` (SEO shell)

```markdown
# Blog — <version>

## SEO

| Field | Value |
|-------|--------|
| Primary keyword | |
| Secondary keywords | |
| Slug | `/blog/<slug>/` |
| Title / H1 | (include primary once; benefit-oriented, not clickbait) |
| Meta description | (≤155 chars; promise + audience; no stuffing) |

## Outline

1. Hook — problem or change in the first two paragraphs
2. What shipped (map to brief bullets)
3. How it works / who it is for
4. Proof (screenshots, clip embeds, or “see the demo”)
5. Get started CTA
6. Optional FAQ (2–4 real questions — schema-friendly)

## FAQ seeds

- Q:
  A:
- Q:
  A:

## Draft (short)

<Launch-angle draft or leave outline-only. For a long practitioner tutorial, hand off body to technical-writing.>

## Do not

- Keyword stuffing or repeating the primary keyword in every heading
- Claims blocked by the brief’s **Out of scope / do-not-claim**
```
