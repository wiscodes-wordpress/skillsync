# Repo profiles

Read from [SKILL.md](SKILL.md) Phase 3. A profile is a lookup: **which conventions apply, which commands verify, which review rules this codebase has earned.**

> **Convention note.** [`AGENTS.md`](../../../AGENTS.md) keeps product-specific keys and paths out of skillsync. The **mechanism** here is generic; the profile rows are data, and the Lifeway rows are the author's own. A consumer repo that documents itself well needs no row — [detection](#detection) covers it.

## Detection

Resolve in this order and stop at the first hit:

1. `git remote get-url origin` → match a profile below by repo name.
2. No match → **derive** the profile from the checked-out repo:
   - conventions: root `AGENTS.md` / `CLAUDE.md`, `.cursor/rules/*.mdc`, `.github/PULL_REQUEST_TEMPLATE/`
   - commands: `package.json` scripts, `Makefile`, `build.sbt`, CI workflow files under `.github/workflows/`
   - base branch: `gh repo view --json defaultBranchRef`
   - issue key pattern: `skillsync.config.json` → `issueKeyPattern`, else infer from branch names in `git log`
3. Still nothing → review on correctness, security, and tests only, and say in the output that no documented conventions were found. Do not invent house style.

**Derived beats stale.** If a row below contradicts what the repo says today, trust the repo and mention the drift.

---

## Lifeway (shared)

Applies to `github.com/LifewayIT/*` unless a repo row overrides it.

- **Base branch:** `master`. Trunk-based — short-lived branches, merged straight to `master`.
- **Feature flags gate releases**, not long-lived branches. A user-visible change with no flag is a should-fix question on rollout: how does this get turned off if it misbehaves?
- **No forks.** PRs originate from branches in the main repo (org security policy). A fork PR is a process finding.
- **Jira:** `lifeway.atlassian.net`. Keys seen in branches and titles: `DCD-####`, `DC-####`. Branch and title conventions vary (`DCD-6931/slug`, `[DC-1450] …`, `DCD-6903 | …`) — accept any of them, but a PR with no recoverable key **and** no intent in the body is finding #1.
- **PR body template:** Purpose of PR · Changes Made · Visual changes to check in review (optional) · Screenshot. A user-interface change with no screenshot or clip is a should-fix — the template asks for one and reviewers cannot see rendering from a diff.
- **Formatters own style.** Never nit what the repo's formatter rewrites (see per-repo rows).

## `lifeway-discipleship`

Polyglot monorepo: Scala.js event-sourced backend plus Nx frontends for Lifeway On Demand (iOS, Android, Apple TV, Fire TV, Android TV) and Ministry Grid. Conventions live in root `AGENTS.md`; full docs at `docs.disciple.prod.lifeway.com`.

**Surfaces → what to check**

| Changed paths | Review focus |
|---|---|
| `backend/api/**` | AppSync GraphQL command handlers. Commands are mutations, queries are separate resolvers (CQRS) — flag logic drifting across that line. |
| `backend/**` aggregates | **Event sourcing on DynamoDB.** Events are append-only history: a changed or removed event shape must still replay old events. Treat "can this aggregate still rehydrate from events written last year?" as a blocking question. |
| `backend/infrastructure/**` | AWS CDK. Check `npx cdk synth` runs and that resource renames don't imply a replace-and-lose-data. |
| `shared/schema.gql` | **GraphQL is the contract.** A schema change needs regenerated types on every consuming app and a compatibility story for clients already shipped to app stores and TV platforms. Removing or narrowing a field is blocking until old clients are accounted for. |
| `frontend/apps/**`, `frontend/packages/**` | Nx monorepo, Yarn 4 workspaces, 16 shared packages. A change inside `packages/**` lands on every app — check the other consumers, not just the one the PR is about. |
| `frontend/apps/mobile`, `tv` | React Native across five deployables. Ask which platforms were actually exercised. |
| `frontend/apps/ministry-grid` | Hybrid AngularJS + React — check which half the change belongs in and that the bridge between them stays intact. |
| EPUB reader (Scala.js + Preact) | Custom reader; changes here are high-blast-radius and rarely covered by app tests. |
| Relay-style connections | Cursor-based pagination throughout — flag offset thinking, unstable cursors, and missing `hasNextPage` handling. |

**Verification**

```bash
# backend
cd backend && sbt test
sbt scalafmtCheckAll
npx cdk synth                     # infrastructure changes

# frontend (from frontend/, the workspace root)
cd frontend && yarn lint && yarn test
yarn nx build mobile              # or ministry-grid
yarn nx graphql mobile            # after a schema change
```

**Formatters (do not nit these):** Scalafmt `backend/.scalafmt.conf` · Prettier `frontend/prettier.config.js` · Biome `frontend/apps/mobile/biome.json` · SwiftFormat for native iOS modules.

## `dce-on-demand-roku`

Roku channel for Lifeway On Demand. BrighterScript compiled with `bsc`. Owned by the DCE Study squad, Jira key `DCD`. Conventions in root `AGENTS.md`.

**Repo-specific review rules**

- **New `.brs` files are a finding.** Prefer BrighterScript `.bs`: its `#if DEBUG` blocks are stripped at transpile time, so debug code never ships. Raw `.brs` only skips `#if DEBUG` at runtime via the manifest flag — the code is still in the package and readable by anyone who unzips it. A new `.brs` file containing debug or diagnostic code is blocking on that ground; a new `.brs` file otherwise is should-fix.
- **SceneGraph lifecycle:** check field observers are torn down, `m.` state is cleared before reuse, and node trees aren't rebuilt per render. The repo's `AGENTS.md` carries a SceneGraph gotchas section — read it for the diff's surface.
- **`devAssert` and `Log_*`** are the house diagnostics; flag raw `print` left in the diff.
- **Sentry** is wired — check new error paths report, and that reports carry no user data.
- **Certification:** channel-store rules are enforced by `yarn cert:static` / `cert:full` and the pre-publish scripts. A change to manifest, assets, deep links, or playback should say whether certification checks were run.

**Verification**

```bash
npm run build         # bsc
npm run lint          # bslint
npm run format        # bsfmt --check
npm run biome         # JS tooling
npm run test:e2e      # WebdriverIO; device/emulator required
npm run cert:static   # certification static checks
```

Note `npm test` is not wired — unit coverage comes through E2E. Do not report a passing `npm test` as evidence.

## Other Lifeway repos

`lifeway-live`, `media-backend-mono-repo`, `contentplatform-APIGateway`, `dce-runbooks` and friends have **no profile row yet**. Apply the shared Lifeway section, derive the rest per [Detection](#detection), and say in the review output that conventions were derived rather than profiled. If a repo turns out to have durable review rules worth keeping, add a row here.
