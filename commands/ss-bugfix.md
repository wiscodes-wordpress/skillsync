# ss-bugfix

**REQUIRED voice:** problem → evidence → proposed fix → wait for apply ([`anti-slop`](../skills/productivity/anti-slop/SKILL.md)).

**Ad-hoc** — not a Story spine step. Use when a bug needs runtime logs, not a guess-and-patch implement.

Follow [`bugfix`](../skills/engineering/bugfix/SKILL.md) end-to-end (instrument details: [`instrument.md`](../skills/engineering/bugfix/instrument.md)).

- Agent session only. If they switched to Cursor Debug Mode, stop and let that mode run.
- Start `tools/bugfix-debug-log.cjs start --tag <4hex>`, instrument POSTs, read `.harness/debug-<tag>.log`.
- Do every repro you can (tests, CLI, browser, device).
- Ping the human only if you cannot reach the repro, or for the **apply / skip / keep investigating** gate.
- Do not apply the product fix until they say apply.
- After apply: verify, stop ingest, strip probes, delete the debug log.

Hard/perf cases with no runtime path: [`diagnose`](../skills/engineering/diagnose/SKILL.md).

Available as `/ss-bugfix` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
