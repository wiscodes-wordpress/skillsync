---
name: technical-writing
description: >
  Write and revise technical blog posts, tutorials, and documentation with
  clear structure, accurate code examples, and accessible prose. Use when
  drafting or editing long-form technical content, reference pages, course
  notes, README sections, or turning research into publishable articles.
---

# Technical Writing

Produce technical content that reads like a strong blog post: precise, well-structured, and clear to practitioners — not telegraphic notes or marketing copy.

## When to use

- Drafting or revising blog posts, tutorials, guides, or reference pages
- Turning course notes, transcripts, or research into publishable articles
- Improving clarity, flow, or structure of existing technical prose
- Deciding how to present code, diagrams, tables, and callouts

## Core principles

1. **Lead with the problem.** Open with why the reader should care — a concrete pain, a wrong assumption, or a gap in their mental model. Avoid throat-clearing ("In this post we will…").
2. **One idea per section.** Each heading should answer one question the reader has at that point. If a section does two jobs, split it.
3. **Show, then generalize.** Prefer a minimal working example before abstract rules. Name files, commands, and versions when they matter.
4. **Accessible precision.** Use plain language for explanations; keep technical terms exact where accuracy depends on them. Define jargon on first use.
5. **Earn every paragraph.** If removing a paragraph does not change what the reader understands or can do, cut it.

## Structure workflow

### 1. Clarify audience and outcome

Before writing, state (internally or with the user):

- **Who** is reading (beginner, practitioner, decision-maker)?
- **What** they should know or be able to do when finished
- **What** is explicitly out of scope

### 2. Outline before prose

Propose a scannable outline: title, hook, 3–7 sections, closing takeaway. Get alignment before drafting long sections.

Typical shapes:

| Shape | Use when |
|-------|----------|
| Problem → approach → steps → pitfalls | Tutorials, how-tos |
| Concept → why it matters → examples → tradeoffs | Explainers |
| Thesis → evidence → synthesis | Opinion or lessons-learned posts |
| Reference sections (glossary, API, checklist) | Lookup pages |

### 3. Draft section by section

Write in order. Each section should:

- Open with the question it answers
- Deliver the answer in the fewest words that preserve accuracy
- Close with a bridge to the next section when helpful

### 4. Revise for scanability

After the draft exists:

- Shorten paragraphs (aim for one main thought each)
- Add `##` / `###` breaks where the reader would pause
- Move repetitive structure into lists or tables
- Pull long commands or code into fenced blocks with language tags

## Format decisions

Argue these explicitly — do not default to prose:

| Choice | Prefer prose when | Prefer list/table/code when |
|--------|-------------------|-----------------------------|
| Prose vs list | Items build on each other | Items are parallel and scannable |
| Inline vs block code | Single token or identifier | Multi-line, runnable, or illustrative |
| Diagram vs text | Relationships are simple | Architecture, flows, or hierarchies clarify faster visually |
| Callout vs inline | Aside would derail the argument | Warning, tip, or note stands alone |
| Quote vs paraphrase | Original wording is the point | Only the idea matters |

## Code and commands

- Use fenced blocks with the correct language tag
- Show realistic but minimal examples — no placeholder soup (`foo`, `bar`) unless teaching naming
- Include setup context the reader needs (directory, env, version) in prose before the block
- For diffs or edits, show only what changed plus enough surrounding context to apply it
- Never use HTML entities inside code fences — show literal characters

## Voice and style

- Complete sentences; good grammar; no telegraphic fragment chains
- Confident but not hype — avoid "revolutionary", "game-changing", "simply"
- Active voice by default
- Second person ("you") for tutorials; first person sparingly for lived experience posts
- Same standards for titles and descriptions: accurate, specific, not clickbait

## Front matter (when the consumer uses it)

If the target repo uses YAML front matter (e.g. blog `content/`), include only fields the site expects. Typical fields:

```yaml
---
title: "Specific, benefit-oriented title"
date: YYYY-MM-DD
description: "One or two sentences for SEO and previews — what the reader gains"
author: "Name"
tags: [topic, topic]
draft: true
---
```

Match existing posts in the repo for field names and conventions.

## Revision checklist

Before calling a piece done:

- [ ] Opening states the problem or promise in the first two paragraphs
- [ ] Headings form a logical table of contents
- [ ] Code blocks run or are clearly pseudo-code
- [ ] No section repeats another without new information
- [ ] Jargon defined or linked on first use
- [ ] Closing states takeaway or next step — not a generic "hope this helps"
- [ ] Title and description match the body

## Out of scope

- SEO keyword stuffing or platform-specific publishing steps unless the user asks
- Non-technical marketing copy
- Bible study or devotional content (use project-specific theology/script skills instead)
- Video scripts (use script-writing skills when those exist in the consumer repo)
