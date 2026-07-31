# GitNexus + skillsync (`ss-*`)

Optional **code knowledge graph** for Cursor agents. skillsync owns delivery process (`ss-*`); [GitNexus](https://github.com/abhigyanpatwari/GitNexus) owns structural facts (call chains, blast radius, clusters).

**Not a skillsync skill pack.** Install and index with the GitNexus CLI; skillsync only documents when agents should call its Model Context Protocol (MCP) tools during `ss-*`.

## License (commercial products)

GitNexus OSS is [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/). **Commercial product work** (e.g. paid WordPress plugins) needs a **commercial license** from [Akon Labs](https://akonlabs.com) (`founders@akonlabs.com`) — including local/dev-only MCP use. Do not enable this on commercial consumers until that grant is in place.

## Machine setup (once)

```bash
npm install -g gitnexus@latest
gitnexus setup -c cursor
```

Writes `~/.cursor/mcp.json` and installs GitNexus skills under `~/.cursor/skills/`. One MCP server serves all indexed repos via `~/.gitnexus/registry.json`.

Prefer a global install so MCP startup does not cold-`npx` past Cursor timeouts.

## Per-repo setup (each consumer)

From the **consumer repository root**:

```bash
gitnexus analyze
# optional: gitnexus analyze --embeddings
# optional: gitnexus analyze --skills
```

Commit a **`.gitnexusrc`** (index stays gitignored under `.gitnexus/`):

```json
{
  "defaultBranch": "main",
  "skipContextFiles": true,
  "skipSkills": false
}
```

- **`skipContextFiles: true`** — do not rewrite consumer / skillsync `AGENTS.md` / `CLAUDE.md` blocks.
- Re-index when agents report a stale graph, after large merges, or before a risky refactor: `gitnexus status` then `gitnexus analyze`.

Optional Cursor 2.4+ **hooks** (per project): see upstream [gitnexus-cursor-integration](https://github.com/abhigyanpatwari/GitNexus/tree/main/gitnexus-cursor-integration). Merge into existing `.cursor/hooks.json` if present.

## How it plugs into `ss-*`

When the **gitnexus** MCP server is connected and the repo is indexed, agents **should** use these tools. If MCP is missing or the index is stale, continue the normal `ss-*` loop — do not block delivery.

| Phase | Command | GitNexus use |
|-------|---------|--------------|
| Architecture | `/ss-arch-plan` | `query` / `context` / clusters — map modules and call chains before drafting HTML |
| Plan | `/ss-plan` | `context` on symbols named in the story — seed Behavior & Test Contracts with real dependents |
| Implement | `/ss-implement` | Before editing a shared symbol: `impact` (upstream). After a vertical cycle that touched public APIs: `detect_changes` if useful |
| Review | `/ss-review` | `detect_changes` on the working tree / branch — flag missed processes; `impact` on high-risk renames |
| Submit PR | `/ss-submit-pr` | Optional `detect_changes` summary for PR risk notes (does not replace security audit) |
| Security | `/ss-security-audit` | Optional `explain` / PDG tools only if the index was built with `--pdg`; not a substitute for Semgrep / skillsync audit |

Skip GitNexus for release/GTM (`/ss-release*`), journal handoff, and pure prose phases.

### Tool cheat sheet

| MCP tool | Ask when… |
|----------|-----------|
| `list_repos` / resource `gitnexus://repos` | Confirm the repo is indexed |
| `query` | “Where does auth / checkout / block save live?” |
| `context` | 360° view of one function/class before changing it |
| `impact` | Blast radius before a signature or shared helper change |
| `detect_changes` | Pre-commit / pre-PR: what processes does this diff touch? |
| `trace` | Shortest path between two symbols |
| `route_map` / `api_impact` | REST or route handler changes |
| `rename` | Coordinated multi-file rename (prefer dry-run first) |

Prefer **one** targeted tool call over dumping the whole graph into context (see [`ss-flow.md`](../harness/ss-flow.md) context budget).

## Consumer checklist

1. Commercial license cleared (if the product is commercial).
2. `gitnexus setup -c cursor` on the machine; Cursor shows **gitnexus** MCP tools.
3. `gitnexus analyze` in the consumer root; `gitnexus status` clean enough to trust.
4. `.gitnexusrc` with `skipContextFiles: true` when using skillsync `AGENTS.md`.
5. Agents follow the phase table above during `ss-*`; no new slash command required.

## Uninstall / pause

```bash
gitnexus uninstall          # dry-run
gitnexus uninstall --force  # apply
gitnexus clean              # drop this repo’s index
```
