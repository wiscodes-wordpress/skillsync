# Hardening stages (security posture)

Ordered hardening checklist for the living HTML `#stages` section. Adapt titles to the product; keep intent. Prefer **folding into existing epics** + stories over one epic per stage.

| ID | Intent | Acceptance (one line) |
|----|--------|------------------------|
| **H0** | Name trust boundaries + surfaces in glossary language | Surfaces table complete; terms in `CONTEXT.md` or HTML until promoted |
| **H1** | Authz + CSRF at privileged entrypoints | Capabilities + nonces / real REST `permission_callback` on in-scope routes |
| **H2** | Input / output / SQL discipline on hot paths | Sanitize/validate/escape; prepared SQL where dynamic |
| **H3** | Secrets + dangerous APIs | No hardcoded secrets; no eval/extract patterns on entry paths |
| **H4** | Uploads / outbound / FE sinks (as applicable) | Allowlists + capability; FE XSS/redirect review or fallow follow-ups noted |
| **H5** | Gate wired | `/ss-security-audit` documented in posture + consumer flow; Evidence PASS required before PR |

## Rules

- Stages are **hardening slices**, not a pen-test novel or a chat TODO dump.
- Skip a stage only with an explicit non-goal in the HTML.
- H1–H4 may each become one or more `/ss-plan` stories.
- **H5** does not replace running the audit — it ensures the gate is part of the delivery loop.
- Jira: `data-epic` / `data-story`; refresh on `/ss-security-plan` only (one-way).
