# Legit demo seed

Professional launch demos need data that looks **real**, not like a test suite. Keep demo seed **separate** from QA fixtures.

## Goals

- Believable names, companies, emails, and dates
- Volumes that match a healthy product (not empty, not absurd)
- Media/thumbnails where the UI shows them
- Deterministic enough that every release reel looks consistent

## Anti-patterns

| Avoid | Prefer |
|-------|--------|
| `testuser1`, `foo@bar.com`, `asdf` | Plausible names and domains |
| Empty states only | Enough rows to show lists, filters, pagination |
| Lorem ipsum everywhere | Short real-sounding copy |
| Random huge dumps | Stable seed set versioned or keyed to release |
| Sharing the same DB as flaky E2E teardown | Dedicated demo profile / env / flag |

## Entrypoint conventions (consumer owns the script)

Discover in order; ask the user if none exist:

1. `package.json` scripts named `demo:seed`, `seed:demo`, `db:seed:demo`
2. `scripts/demo-seed.*` / `bin/demo-seed.*`
3. Documented WP-CLI or Artisan commands in `AGENTS.md` / README
4. Factory/seeder modules under `database/seeders`, `tests/demo`, `e2e/fixtures/demo`

Record the chosen command in the Release Brief under a short **Demo seed** note so marketing and future runs reuse it.

## Checklist before recording

- [ ] Seed targets the **demo** environment (not production)
- [ ] Feature bullets on the brief are visible with this data
- [ ] No secrets, real customer PII, or paid third-party content in seed
- [ ] Timezone/locale fixed if dates appear on screen
- [ ] Login/persona documented (who the camera “is”)

## Stack hints (patterns only)

- **Node/JS apps:** idempotent seed script; truncate demo tables or use a disposable DB
- **WordPress:** WP-CLI `eval-file` / custom command; wp-env or staging — never prod
- **Any:** prefer factories with a `demo` trait over copying production dumps

Do not hardcode one stack into this skill — follow the consumer’s entrypoint.
