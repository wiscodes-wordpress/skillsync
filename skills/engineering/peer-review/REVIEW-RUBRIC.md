# Peer review rubric

Read from [SKILL.md](SKILL.md) Phase 3. Stack-agnostic. Repo-specific conventions and commands come from [PROFILES.md](PROFILES.md).

## Severity ladder

Four levels. Every drafted comment carries exactly one, and the label is part of the posted text so the author can triage at a glance.

| Label | Means | Bar to use it |
|-------|-------|---------------|
| **blocking** | Merging this ships a defect, a security hole, or data loss | You can state inputs/state → wrong result, and point at the code path. No hypotheticals. |
| **should-fix** | Real problem, not a merge blocker — missing test on a risky path, a convention violation the repo documents, a maintainability trap | Named consequence, even if delayed. Cite the convention file when the finding rests on one. |
| **question** | You suspect something but cannot prove it, or intent is unclear | Genuinely open. If you know the answer, it belongs in one of the levels above. |
| **nit** | Naming, ordering, phrasing, style a formatter doesn't enforce | Optional by construction. Author may ignore without replying. |

**Downgrade when uncertain.** A blocking finding that turns out to be wrong costs you the author's trust for every future review. A question that turns out to be a bug costs nothing — the author answers it and fixes it.

## Comment budget

Nit spam is the characteristic failure of machine PR review. Enforce:

- **≤3 nits per PR.** Over that, drop the weakest ones — do not "just mention" them all.
- **Zero nits about anything the repo's formatter owns.** If Prettier, Biome, Scalafmt, or `bsfmt` would rewrite it, CI already owns it. Say nothing.
- **One comment per distinct issue.** The same mistake in eight files is one full comment naming the pattern; the other locations get a short "same as above" pointer, not a rewritten comment. It counts once against the budget.
- **No comment that only restates the diff.** "This adds a new prop" tells the author nothing.
- **No comment already made by a human on the PR.** Read the existing threads first.

If total drafted comments exceed ~15, the honest review is usually "this PR is too large to review well" — say that as a should-fix and cover the highest-risk surface thoroughly instead of every surface thinly.

## Dimensions

Score only what the diff actually touches. Each finding gets `file:line` + failure scenario + suggested fix.

### Correctness

- Behavior change per input case: null/undefined, empty collection, zero, negative, boundary, unicode, very large
- Off-by-one, inverted conditional, wrong operator precedence, `==` vs `===`
- Unhandled rejection, swallowed error, `catch` that logs and continues into a bad state
- Async ordering: race between fetch and unmount, missing await, parallel writes to shared state
- Callers of every changed signature — grep them; unmigrated callers are the most common real defect
- Deleted code: what depended on it

### Security

- Authorization and capability checks on every new entry point, not just authentication
- Input validated and sanitized at the trust boundary, output escaped at the sink
- Injection surfaces: string-built queries, shell interpolation, dynamic imports, template rendering
- Secrets, tokens, internal hostnames, or customer data in source, logs, or error payloads
- New dependency: is it needed, maintained, and does it pull a large transitive tree
- Debug code, verbose logs, or test bypasses reachable in a release build

### Tests

- Does the changed risk surface have a test that **would fail if the change were reverted**? Write down which test and how it fails. This is the question, not "is there a test file".
- Assertions on behavior, not on implementation detail or mock call counts
- No test weakened, skipped, or deleted to make the suite green — check the diff for removed assertions, widened matchers, `skip`/`only`
- Right level of the pyramid: a unit test where a unit test suffices, end-to-end (E2E) only for real user journeys
- New branch coverage for new error and empty paths

### Contracts and compatibility

- Public interface, schema, or API shape changed → are all consumers updated, and is the old shape still accepted where clients may lag?
- Generated artifacts regenerated (types, GraphQL documents, migrations, locale files)
- Persisted data shape changed → migration for existing rows, and behavior for records written by the old code
- Feature-flag or version guard where the repo releases behind flags

### Frontend, when the diff touches user interface

- Loading, empty, error, and offline states for every new data path
- Keyboard reachability, focus order, visible focus, accessible name on interactive elements
- Effect dependency arrays: stale closures, missing cleanup, effects that should be derived state
- Avoidable re-renders from new object/array/function identities in props or context
- Design tokens over hardcoded color, spacing, and typography literals; both light and dark modes
- Localization keys for new user-facing strings

### Maintainability

- Duplication of something already in the codebase — grep before flagging, and name the existing helper
- Boundary discipline: does the logic live in the layer the repo documents for it
- Naming that contradicts the domain language in `AGENTS.md` / `CONTEXT.md`
- Comments on changed lines: are they explaining *why*, or narrating *what* the code already says
- Dead code, commented-out blocks, stray debug statements left in the diff

## Recommendation mapping

| Findings present | Recommend |
|------------------|-----------|
| Any **blocking** | request changes |
| **should-fix** only | comment — say which ones you would want resolved before merge |
| **question** / **nit** only | approve *(recommendation only — the human clicks it)* |
| Nothing material | approve, and state residual risk and what you did not verify |

Never recommend approve while a critical check was skipped on a high-risk change. Say what needs running first.

## Team review patterns

Mined from real review history by [`review-patterns`](../review-patterns/SKILL.md) (`/ss-review-patterns`), then scrubbed, generalized and gated: every line below was raised in **at least 3 PRs by at least 2 different reviewers**, and it names no person, product or repo. Counts show strength. **older only** means nobody has raised it in the last 12 months — still sound, but lower priority. **recent** means it only appeared in the last 12 months.

These sharpen the dimensions above with what reviewers on real teams actually flag. Use them to pick findings and to phrase them. They do not change the severity ladder or the comment budget.

_Last mined: 2026-10 · 3,338 merged PRs · 2,745 reviewer comments · 18 reviewers._

### Correctness

- On every new call site, ask what happens with null, missing, or unexpected input, especially when sibling call sites already guard against it. _(56 PRs · 8 reviewers)_
- Let the type system enforce correctness: no casts or suppressed type errors to quiet the checker, validate untrusted data at the boundary, and make matches over a closed set exhaustive so a new case fails to compile. _(41 PRs · 4 reviewers)_
- When a fix or feature lands on one platform or client, ask whether the sibling platforms need it too, and either include it or say why not. Shared code must work on every target. _(14 PRs · 5 reviewers)_
- Every subscription, timer, listener, or in-flight request gets cancelled or released when its owner goes away, so nothing leaks, double-fires, or updates stale state. _(13 PRs · 3 reviewers · older only)_
- Don't paper over missing or impossible values with fake defaults like empty strings. Represent absence explicitly, and assert or fail loudly when something that must exist doesn't. _(10 PRs · 3 reviewers)_

### Security

- Treat dynamically loaded third-party scripts, keys shipped in client code, and anything newly made public as security questions the author must answer, not style notes. _(9 PRs · 4 reviewers)_

### Tests

- Ask how each behavior change was verified. Pure logic gets a unit test; platform and device user interface gets tried on real hardware, and "tested on device" in a review is valued. _(38 PRs · 7 reviewers)_
- Tests do what a user does: query by visible text and accessible roles, assert the visible outcome, wait on state changes rather than fixed sleeps, and mock only true external boundaries. Shared setup lives in shared helpers. _(23 PRs · 4 reviewers)_

### Architecture

- Shared components don't know about any one caller. Logic lives in the module that owns the concern, and callers pass in a decision (a flag, a display value) rather than raw data the component must interpret. _(28 PRs · 4 reviewers)_
- Configuration comes from deploy-time environment variables, not from branching on hostnames or hard-coded per-environment values. An integration turns on because its ID is supplied, not because of an if-check. _(12 PRs · 7 reviewers)_
- Import from a feature's public entry point, never deep into its files. If something is missing, export it from the owning feature. _(7 PRs · 2 reviewers)_
- Third-party integrations such as analytics or support widgets go through the app's own provider or adapter layer, not straight to the vendor's SDK. Turning one vendor off must not affect the others. _(6 PRs · 2 reviewers)_

### Maintainability

- Names say what a thing actually is or does, use the shared domain vocabulary, and stay accurate as scope grows. Rename vague, misleading, inverted, or misspelled names before they spread. _(46 PRs · 5 reviewers)_
- When the same logic appears on two screens or in two hooks, ask whether it should be one shared utility before it drifts. _(41 PRs · 10 reviewers)_
- Code comments describe what the code does and why, not the history of this change. Timings, version numbers, "used to do X", and comments tied to one specific case go stale; that context belongs in the commit message. _(12 PRs · 4 reviewers)_
- Name or explain numeric literals like delays, sizes, and thresholds so it's clear why that value was chosen and where else it applies. _(5 PRs · 2 reviewers · older only)_
- When the codebase already has a library or pattern for a job, use it instead of introducing a second way. _(4 PRs · 2 reviewers · older only)_
- When a file keeps growing, move self-contained pieces into their own files near where they're used, and keep entry and routing files thin. _(3 PRs · 2 reviewers)_

### Simplicity

- Question flexibility nobody needs yet (extra IDs, unused props, guards for unlikely races) and remove code and properties that are no longer used. _(73 PRs · 9 reviewers)_
- Don't store state you can derive, and don't keep two copies of one value. Model mutually exclusive states as one status value, not several booleans. _(8 PRs · 3 reviewers · older only)_

### Intent and process

- Any change to a default, a visibility level, a version, an ignore list, or an allowed-vulnerability count needs a stated reason. Reviewers ask "why now, when it wasn't needed before?" _(26 PRs · 6 reviewers)_
- Unrelated fixes go in a follow-up PR. When you spot something outside the change, label it "not from this PR" and don't block on it. _(35 PRs · 5 reviewers)_
- When a change touches compiled or native layers that downstream builds depend on, bump the build version in the same change so those builds regenerate. _(9 PRs · 3 reviewers · older only)_
- If a lint rule keeps getting disabled inline, change the shared lint config (or a scoped override) instead of scattering ignore comments. Let linters, not reviewers, police style. _(8 PRs · 2 reviewers · older only)_
- Shared dependency versions and the runtime version come from one central catalog or version file, never pinned per package. _(3 PRs · 2 reviewers · recent)_

### Observability

- Every operation that can fail has a deliberate error path: what the user sees, whether it retries, and what gets reported with enough context to debug. Never swallow errors silently, and pick log severity on purpose. _(30 PRs · 4 reviewers)_
- Use the project's logger, never `console`, and question new logs that only helped while debugging. _(21 PRs · 5 reviewers)_

### User interface

- Reuse existing design tokens and shared constants instead of adding near-duplicate colors or hard-coded sizes. Values owned by the design pipeline are not edited by hand. _(36 PRs · 4 reviewers)_
- Watch for work repeated on every render, tick, or call: unstable callbacks and objects passed down, effects with too-broad dependencies, and stored state where a derived value would do. _(37 PRs · 5 reviewers)_
- All user-facing text, including accessibility labels and fallbacks, goes through the localization layer. Reuse shared strings before adding new ones, and avoid building sentences by gluing variables into them. _(14 PRs · 3 reviewers)_
- Check visual changes against the design source (spacing, sizes, copy, focus states, assets). When the design and the code disagree, raise it with design instead of inventing values. _(12 PRs · 2 reviewers)_
- Every interactive element has an accessible label (and a hint when the action isn't obvious) that says what it is and what happens. Skip empty or redundant labels. _(11 PRs · 5 reviewers)_
- Let content and the user's text-size settings drive layout. Question fixed heights, fixed widths, and character-count truncation that break with larger fonts or other screens. _(6 PRs · 2 reviewers · older only)_

### AI-assisted changes

- When AI helped write the change, look for narrating comments and edits to generated or owned files. Fix the root cause in the agent instructions or a hook, not just in the diff. _(8 PRs · 4 reviewers · recent)_

### How comments are written

- Phrase most comments as questions ("Should this…?", "Any reason…?"), which leaves room for context the reviewer lacks. Use direct statements for clear rule violations. _(37 PRs · 6 reviewers)_
- Mark non-blocking feedback explicitly ("suggestion (non-blocking)", "nitpick, don't worry about it", "good either way") so the author knows what must change before merge. _(47 PRs · 8 reviewers)_
- When the fix is small and concrete, use a suggestion block so the author can apply it in one click. _(52 PRs · 6 reviewers)_
- For a repeated issue, write the full comment once, then leave short "same question" pointers on the other lines. _(26 PRs · 4 reviewers)_
- Call out specific good work (a cleanup, a useful helper, a good test) in the line comment where it happens, not a generic "LGTM". _(51 PRs · 6 reviewers)_
