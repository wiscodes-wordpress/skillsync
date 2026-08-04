---
name: supabase-security
description: Security-first Supabase development with row-level security, auth boundaries, storage policies, service role safety, and database best practices.
progressive_disclosure:
  entry_point:
    summary: "Security-first Supabase development with row-level security, auth boundaries, storage policies, and service role safety"
    when_to_use:
      - "Building or reviewing a Supabase app"
      - "Configuring auth, RLS, storage, or edge functions"
      - "Checking whether server and client secrets are separated correctly"
      - "Reviewing data access patterns for public, authenticated, and admin flows"
    quick_start:
      - "Keep service role keys server-side only"
      - "Enable RLS on every user-facing table"
      - "Use storage policies and auth-aware access checks"
---

# Supabase Security & Best Practices

Use this skill for Supabase projects that rely on PostgreSQL, Supabase Auth, Storage, Realtime, or Edge Functions.

This skill builds on `postgresql-security-best-practices`.

## Security invariants

1. **The anon key can be public; the service role key cannot.**
2. **RLS is required for user-facing tables.**
3. **Authorization belongs in policies, not just in client code.**
4. **Storage buckets need access policies too.**
5. **Admin operations stay on trusted server code or edge functions with explicit checks.**

## When to use

Reference this skill when:

- Starting a Supabase-backed app or feature
- Reviewing access to tables, storage buckets, or RPC functions
- Implementing auth flows or role-based access
- Building edge functions that touch privileged data
- Debugging a permission issue that might be policy-related

## Supabase security baseline

### Authentication and session handling

- Use Supabase Auth for user identity, but do not treat authentication as authorization.
- Validate the logged-in user before sensitive operations.
- Keep session handling predictable across browser and server contexts.

### Row-level security

- Turn on row-level security for every table that contains user or tenant data.
- Write explicit `select`, `insert`, `update`, and `delete` policies.
- Verify policies for anonymous, authenticated, and admin paths.
- Avoid "allow all authenticated users" policies unless the table is truly non-sensitive.

### Keys and secrets

- Use the anon key in client-facing code.
- Use the service role key only on trusted server code.
- Never ship the service role key to the browser, mobile client, or public bundle.
- Keep Supabase secrets in environment variables or secret storage.

### Storage

- Treat buckets as part of the authorization surface.
- Define storage policies for read and write access.
- Prefer signed URLs or server-mediated access for sensitive files.
- Do not assume a private bucket is enough without policy review.

### Edge functions and RPC

- Verify auth context before privileged actions.
- Do not skip authorization just because the call originates from an edge function.
- Validate input before calling database functions.
- Keep privileged functions narrow and auditable.

## PostgreSQL alignment

Use the PostgreSQL skill for:

- parameterized SQL
- role and grant design
- schema changes and migrations
- functions, views, and `SECURITY DEFINER` review

Supabase projects should still follow normal PostgreSQL hardening.

## Common mistakes

- Relying on client-side checks without RLS
- Using the service role key in frontend code
- Leaving storage buckets open without policies
- Assuming authenticated users may access any row
- Exposing admin RPCs without a policy or server-side guard

## Review checklist

- [ ] Every sensitive table has RLS enabled
- [ ] Policies exist for the required CRUD paths
- [ ] The anon key is the only public key
- [ ] The service role key stays server-side
- [ ] Storage buckets have explicit read/write policies
- [ ] Edge functions validate auth and inputs
- [ ] Admin-only operations are not reachable from untrusted clients
- [ ] PostgreSQL best practices are followed for queries, roles, and migrations

## Related skills

- `postgresql-security-best-practices`
- `security-plan`

