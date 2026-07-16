# ss-security-audit

**Phase: security gate** — follow [`ss-flow.md`](../harness/ss-flow.md).

Run **after** [`/ss-review`](./ss-review.md) PASS (and any review fixes), **before** [`/ss-submit-pr`](./ss-submit-pr.md).

**Two phases (do not blur):**

1. **Phase A (scripts)** — deterministic inventory + pattern gates via `security-audit.cjs` (court record).
2. **Phase B (agent)** — judgment only on evidence; dismiss-by-default; never invent scanner findings or override Phase A FAIL.

In **Agent** mode, read and follow [`harness-security-audit.md`](../harness/harness-security-audit.md) end-to-end.

**Pre-step / Phase A (when vendored):**

```bash
node .cursor/vendor/skillsync/tools/security-audit.cjs . --write-state
```

Optional dependency advisories: add `--deps`. After Phase B verdict:

```bash
node .cursor/vendor/skillsync/tools/security-audit.cjs . --set-phase-b PASS
```

Overall **## Security Evidence** `Status: PASS` is required before `/ss-submit-pr`.

Available as `/ss-security-audit` when linked into **`.cursor/commands/`** (`docs/consumer-setup.md`).
