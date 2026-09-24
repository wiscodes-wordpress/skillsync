# Sentry / GitHub queries

Read from [SKILL.md](SKILL.md) when gathering. Skip any command that 401s / 404s — that source is **not connected**, not empty.

Empty `sentry.org` / `sentry.project` / `sentry.projects: []` in config means **unset**. Do not pass blank flags.

Do **not** clone the Lifeway repos. Query GitHub by `owner/name`.

## Sentry

If MCP tools exist for Sentry, use those with the same filters. Else `sentry-cli` (must already be logged in):

```bash
sentry-cli issues list --org <org> --project <slug> --query "environment:production" --stats-period 24h
```

Tighten `--query` when you have a release: `environment:production release:<release>`.

For one issue URL, `sentry-cli issues list` is enough to confirm it still exists; do not dump `--verbose` stacks into chat.

**404 on slug:** try the next profile slug once, then mark that product `Sentry not connected`. Do not guess a third name.

### Latest event (repro + FullStory)

For each kept issue, fetch **one** latest event:

```bash
sentry-cli api "0/issues/<issue_id>/events/latest/"
```

From that JSON, take only:

| Need | Where |
|---|---|
| Repro | `request.url` / `transaction` / `culprit`; last navigation/click breadcrumbs; tags `browser`, `os`, `device`, `release`, `environment` |
| FullStory | **`contexts.fullstory.sessionUrl`** — that string is the Watch link. (Sentry UI: Contexts → FullStory → sessionUrl.) |
| Sentry replay | Replay id or `*.sentry.io/replays/` — only if `sessionUrl` is missing |

If `contexts.fullstory.sessionUrl` is present, put it in Watch. Do not omit it. Do not paste the event JSON. No user email/id. Do not search FullStory yourself.

## GitHub (per product)

```bash
gh api repos/LifewayIT/<repo>/releases/latest --jq '{tag:.tag_name,at:.published_at,sha:.target_commitish}'
gh api repos/LifewayIT/<repo>/deployments --jq '.[0:3]|map({env:.environment,sha:.sha,at:.created_at})'
gh api "repos/LifewayIT/<repo>/actions/runs?branch=master&status=failure&per_page=5" --jq '.workflow_runs[:5]|map({name:.name,at:.updated_at,url:.html_url})'
```

Use `master` on the Lifeway set; use the repo default branch elsewhere (`gh repo view LifewayIT/<repo> --json defaultBranchRef`).

No `LifewayIT` access → note it and continue with Sentry only (or the reverse).
