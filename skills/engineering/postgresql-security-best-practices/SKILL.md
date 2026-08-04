---
name: postgresql-security-best-practices
description: Security-first PostgreSQL development with least privilege, parameterized SQL, row-level security, safe migrations, and operational hardening.
progressive_disclosure:
  entry_point:
    summary: "Security-first PostgreSQL development with least privilege, parameterized SQL, row-level security, and safe migrations"
    when_to_use:
      - "Writing or reviewing SQL"
      - "Designing schemas, roles, or grants"
      - "Adding migrations, functions, or views"
      - "Reviewing database security for an app or SaaS project"
    quick_start:
      - "Use parameterized queries, not string concatenation"
      - "Apply least privilege to roles, grants, and default privileges"
      - "Enable row-level security for user-facing data"
---

# PostgreSQL Security & Best Practices

**Security posture:** treat the database as a trust boundary, not a shared dumping ground.

Use this skill when a project relies on PostgreSQL directly or through a platform such as Supabase.

## Core principles

1. **Least privilege** - every role gets only the access it needs.
2. **Parameterized SQL** - never build SQL by concatenating user input.
3. **Row-level security** - protect tenant and user data at the database layer.
4. **Safe migrations** - keep schema changes reversible and reviewable.
5. **Operational hygiene** - backups, restore tests, and audit visibility are part of security.

## When to use

Reference this skill when:

- Designing a schema or new database feature
- Reviewing SQL for injection or privilege issues
- Creating roles, grants, functions, views, or triggers
- Adding migrations or seed scripts
- Hardening an application that stores sensitive data in PostgreSQL

## Security baseline

### Roles and privileges

- Use separate roles for owner, migrator, application runtime, and read-only access.
- Revoke broad defaults before granting what you actually need.
- Avoid using superuser privileges in application code.
- Keep ownership narrow and intentional.

### Row-level security

- Enable row-level security on user-owned or tenant-owned tables.
- Write policies for each required access pattern.
- Test policies with both allowed and denied roles.
- Do not rely on application code alone for tenant isolation.

### Parameterized queries

```sql
-- Good: parameterized
select *
from public.users
where email = $1;

-- Bad: string concatenation
-- select * from public.users where email = '...user input...'
```

- Use bind parameters from the client library or query builder.
- Do not interpolate identifiers from untrusted input.
- Whitelist identifiers when dynamic table or column names are unavoidable.

### Functions and definer context

- Treat `SECURITY DEFINER` functions as privileged code.
- Set a safe `search_path` explicitly inside privileged functions.
- Keep definer functions small and well-reviewed.
- Prefer invoker-security functions unless escalation is required.

### Views and materialized views

- Use views to simplify access, not to bypass authorization.
- Check whether views expose columns you meant to hide.
- Review permissions on materialized views and refresh jobs.

## Schema and migration best practices

- Make migrations small and reversible.
- Backfill in phases for large tables.
- Add indexes deliberately and verify query plans.
- Avoid lock-heavy changes during peak traffic.
- Version control schema changes alongside application code.

## Data safety

- Encrypt secrets outside the database when possible.
- Store only the minimum sensitive data required.
- Redact secrets and tokens in logs.
- Use audit trails for security-relevant changes.

## Operational security

- Keep backups and test restores regularly.
- Confirm point-in-time recovery expectations if the system needs them.
- Monitor slow queries, failed logins, and privilege changes.
- Review extensions before enabling them in production.

## Review checklist

- [ ] SQL uses parameters, not string concatenation
- [ ] Roles are least-privilege and purpose-built
- [ ] Row-level security exists where tenant or user isolation matters
- [ ] `SECURITY DEFINER` functions have explicit `search_path`
- [ ] Migrations are safe to run in production
- [ ] Sensitive data is minimized and redacted from logs
- [ ] Backups and restore path are documented
- [ ] Extensions are intentional and reviewed

## Related skills

- `supabase-security`
- `security-plan`

