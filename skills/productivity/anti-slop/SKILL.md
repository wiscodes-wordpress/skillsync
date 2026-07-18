---
name: anti-slop
description: >
  Revise prose so it sounds human — ban AI-marker density, empty hype, and corporate
  synonym soup. Use when drafting or revising release marketing copy, emails, social posts,
  blog intros, YouTube descriptions, or any skillsync output that must not read like AI slop.
  Not for detector evasion.
---

# Anti-slop

Revision gate for **human-sounding prose**. Load before declaring release marketing (or similar) copy done.

**Not:** rewriting text to dodge AI detectors. **Is:** cutting tells, empty intensifiers, and fake warmth so a person who shipped the feature could have written it.

## When to use

| Use this | Skip |
|----------|------|
| Email, social, YouTube, launch blog, changelog blurbs | Pure code, harness state tables, ADR decision logs |
| After drafting channel copy in [`release-marketing`](../release-marketing/SKILL.md) | Chat terseness — that is [`caveman`](../caveman/SKILL.md) |
| Softening technical blog intros that sound generated | Deep tutorial body — prefer [`technical-writing`](../technical-writing/SKILL.md) |

## Density, not banlists alone

Slop is a **density** problem. One “seamless” in a long piece can stand. A cluster of unlock / seamless / delve / tapestry / embark / “I’m excited to announce” in the same screenful is generated text.

Score roughly per ~100 words: if two or more tier-1 markers appear, rewrite that block.

## Tier-1 markers (rewrite on sight in marketing)

- unlock, seamless, delve, tapestry, embark, landscape (as metaphor)
- “I’m excited to announce”, “We’re thrilled”, “game-changing”, “revolutionary”
- “In today’s fast-paced…”, “At the end of the day”, “It goes without saying”
- Fake empathy openers (“We know how hard it is to…”) with no specific product fact after
- Empty intensifiers stacked: truly / really / simply / robust / powerful / next-level

## Prefer

- **Specific nouns** — name the feature, screen, or outcome
- **One claim per sentence** — cut stacked benefits in one breath
- **Real product verbs** — ship, filter, save, export, schedule (not “empower”, “elevate”, “leverage”)
- **Short paragraphs** — especially email and social
- **Proof** — what changed for the user, or point at a clip / screenshot from the brief

## Channel modulation

| Channel | Tone |
|---------|------|
| Email | Warmer, direct; subject line earns the open; no brochure voice |
| Social | Shorter; hook in first line; hard length caps in templates |
| YouTube description | Scannable; chapters; no keyword stuffing |
| Blog / SEO shell | Clear promise; keywords in title/meta/H1 once; body still human |

Never compensate for weak substance with corporate-synonym soup.

## Consumer `TONE.md`

If the consumer has a brand `TONE.md` (path in the Release Brief or repo root), apply its bans and voice attributes **in addition** to this skill. When they conflict, consumer tone wins on brand words; this skill still wins on tier-1 AI markers.

## Slop pass checklist

Before calling copy done:

- [ ] Opening states a concrete change or problem — not a press-release throat-clear
- [ ] No tier-1 cluster in any ~100-word window
- [ ] Every paragraph earns its keep (cut filler)
- [ ] Claims match the Release Brief; nothing oversold in **Out of scope / do-not-claim**
- [ ] CTA is one clear action with a real URL when available
- [ ] Reads like a teammate wrote it after shipping — not like a launch template filled by a bot

## Out of scope

- Detector-evasion pipelines or “humanize API” tools
- Changing product facts to sound nicer
- Replacing [`technical-writing`](../technical-writing/SKILL.md) for long tutorials
