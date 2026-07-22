# Semgrep rules — WordPress plugin (skillsync)

Small, high-signal rules used by `tools/security-assess.cjs` for **whole-plugin** health (Stage 2). Not part of the per-PR `/ss-security-audit` gate.

- Prefer local rules over fragile community packs.
- Avoid Semgrep `join` mode (may require login).
- Optional extra configs: `skillsync.config.json` → `securityAssess.semgrepExtraConfigs` (e.g. `p/php` is already requested by the tool when available).

Install Semgrep: `pipx install semgrep` or `brew install semgrep`.
