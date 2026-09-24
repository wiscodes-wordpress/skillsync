# Production pulse — product set

Read from [SKILL.md](SKILL.md) when resolving **which** GitHub repos / Sentry projects to scan.

> Product names here are **data** for the author’s work set. Other fleets: add a row or set `sentry.projects` in `skillsync.config.json`.

## Detection

Scan **every** member of the set (unless the user named one product).

1. User named a repo, Sentry project, or URL → that product only.
2. Else non-empty `sentry.projects` in `skillsync.config.json` → that list. (`[]` and `""` are unset.)
3. Else origin is **this skillsync repo**, or the user said “work” / “On Demand” / “LOD”, or journal `defaultTrack` is `work` → **Lifeway work set**.
4. Else `git remote get-url origin` is `LifewayIT/lifeway-discipleship`, `lifeway-discipleship-tv`, `lifeway-discipleship-roku`, or `dce-on-demand-roku` → **Lifeway work set** (all three, not only cwd).
5. Else cwd repo only (plus `sentry.org` / `sentry.project` if set).

Say which products you scanned. Use Sentry’s real slugs when they differ from GitHub names — do not invent issues.

**Do not clone** the three Lifeway repos. [QUERY.md](QUERY.md) uses `gh api repos/LifewayIT/<repo>/…`.

---

## Lifeway work set

| Product | GitHub (`LifewayIT/…`) | Sentry slug (try once) | What “prod” means |
|---|---|---|---|
| Discipleship | `lifeway-discipleship` | `lifeway-discipleship` | API + Nx apps (mobile, Ministry Grid). Flags gate user-visible pain. |
| TV | `lifeway-discipleship-tv` | `lifeway-discipleship-tv` | Living Room / TV clients. Store build ≠ monorepo SHA. |
| Roku | `lifeway-discipleship-roku` | `lifeway-discipleship-roku` | Roku channel. Remote may still be `dce-on-demand-roku`. Sentry release is often channel version, not git SHA. |

**Org:** `sentry.org` in consumer config if set; else whatever `sentry-cli` / MCP is already authenticated as. Do not guess a second org.

**Shared**

- Environment: `production` unless the user names staging.
- Jira keys: `DCD-####`, `DC-####`.
- Default branch: `master`.
- One brief. Label findings `discipleship` / `tv` / `roku` (or `discipleship+tv` when deduped).
- Quiet product → **Things to note**, not a fake finding.
- **5 findings total.** Playback / auth / pay over device-specific noise.
- Same title or shared schema/API frame on two products → **one** finding.
- **FullStory:** latest event `contexts.fullstory.sessionUrl`. If set, that is Watch. Discipleship web / Ministry Grid: check every time. **TV / Roku:** usually absent (`n/a`); still use the URL if that field is set.

**Per product**

| Product | Cheap extra |
|---|---|
| Discipleship | Failed Actions on `master`; last prod deploy SHA. |
| TV | Own window. Do not reuse the monorepo SHA. |
| Roku | Own window. Channel publish lags git. |

If only some projects query, scan those and note the miss (`tv: Sentry not connected`).
