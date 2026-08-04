---
name: bulletproof-react
description: >-
  Feature-based React application architecture adapted from Bulletproof React.
  Use when scaffolding or restructuring a React app, placing features/API/state,
  enforcing import boundaries, or reviewing React project structure. Triggers on
  React SPA/app architecture, feature folders, unidirectional imports, API layer,
  and scalable frontend structure.
progressive_disclosure:
  entry_point:
    summary: "Feature-based React architecture with shared → features → app flow"
    when_to_use:
      - "Scaffolding or restructuring a React application"
      - "Deciding where components, API, and state should live"
      - "Reviewing React project structure or cross-feature coupling"
      - "Planning a scalable frontend for a team"
    quick_start:
      - "Colocate code under src/features/{name}; keep shared code out of features"
      - "Enforce shared → features → app; no cross-feature imports"
      - "Separate server state (query library) from client UI state"
---

# Bulletproof React

Scalable React application architecture adapted from
[alan2207/bulletproof-react](https://github.com/alan2207/bulletproof-react).

Use this skill for **application structure and boundaries**. For render/bundle
micro-rules use `frontend-react-best-practices`. For RTL/Jest patterns use
`jest-react-testing`. For PR review checklists use `typescript-react-reviewer`.

**Not a default `ss-*` load.** Link in the consumer via `linkedSkills` and read
on demand when `AGENTS.md` / the diff surface is a React SPA or app shell.

## Core principles

1. **Feature modules** — most product code lives under `src/features/`.
2. **Unidirectional flow** — shared → features → app (never the reverse).
3. **No cross-feature imports** — compose features at the app/route layer.
4. **Colocation** — keep API, components, hooks, and types next to the feature.
5. **Server vs client state** — fetch/cache with a query library; keep UI state local until it must be shared.

## When to use

- Starting or reshaping a React (Vite / Next.js / similar) application
- Adding a new feature and choosing folder layout
- Reviewing whether imports cross feature or layer boundaries
- Aligning a team on where API hooks, forms, and shared UI belong

## Project structure

```text
src/
├── app/           # routes, providers, app shell (framework-specific)
├── components/    # shared UI used across features
├── config/        # env and global config
├── features/      # feature modules (bulk of product code)
├── hooks/         # shared hooks
├── lib/           # preconfigured clients (api, auth, query)
├── stores/        # rare global client state
├── testing/       # test utils and mocks
├── types/         # shared types
└── utils/         # shared pure helpers
```

### Feature layout

Include only folders the feature needs:

```text
src/features/awesome-feature/
├── api/           # fetchers + query hooks for this feature
├── components/
├── hooks/
├── stores/
├── types/
└── utils/
```

Prefer **direct imports** over feature barrel `index.ts` files when bundlers
struggle with tree-shaking (Vite). If a public API is needed, keep it thin.

## Architecture rules

| Rule | Do | Don't |
|------|----|-------|
| Feature isolation | Compose at `app/` / routes | `features/a` import from `features/b` |
| Direction | Shared modules imported by features and app | Features or app imported by `components/`, `hooks/`, `lib/`, `utils/` |
| Shared UI | Truly reusable primitives in `components/` | Dump feature screens into `components/` |
| API | Feature `api/` + shared `lib` client | Scatter fetch calls inside random components |

Enforce with ESLint `import/no-restricted-paths` (or equivalent) when the repo
can sustain it: one zone per feature blocking other features, plus zones that
block `features`/`app` from being imported by shared folders.

## API layer

For each endpoint (or related group):

1. Request/response **types** (and validation schemas when used)
2. **Fetcher** using the shared API client in `lib/`
3. **Query/mutation hook** (e.g. TanStack Query) colocated in the feature `api/`

Keep fetchers testable without React. Prefer Mock Service Worker (MSW) over
mocking `fetch` in feature tests.

## State management

| Kind | Default |
|------|---------|
| Local UI | `useState` / `useReducer` |
| Forms | Form library + schema validation (e.g. React Hook Form + Zod) |
| Server data | Query library (cache, retries, invalidation) |
| Cross-feature client UI | Lift only when needed; global store (e.g. Zustand) sparingly |

Do not put server entities into a global client store by default.

## Components and styling

- Prefer **composition** (children/slots) over large boolean prop matrices.
- One clear responsibility per component; extract complex JSX.
- Shared styling system is consumer-defined (Tailwind, CSS modules, design system). Follow the repo; do not invent a second system.
- File names: kebab-case for files/folders; PascalCase for components.

## Error handling and security

- Feature-level **error boundaries** plus a root fallback.
- Central API client handles auth refresh and user-visible error notifications where appropriate.
- Treat client-side authz as UX only; **always enforce on the server**.
- Prefer HttpOnly cookies for tokens when the stack allows; never trust `localStorage` alone for high-value sessions.
- Sanitize untrusted HTML before render.

## Testing and performance

- Prefer **integration tests** of feature workflows; unit-test shared utils; end-to-end (E2E) for critical journeys.
- Behavior over implementation; accessible queries — see `jest-react-testing`.
- Route-level code splitting; avoid over-splitting. Deeper render/bundle rules → `frontend-react-best-practices`.

## Feature workflow

1. Types / schemas for the API surface
2. Fetcher + query hooks in `features/{name}/api/`
3. Feature UI components
4. Wire routes/providers in `app/`
5. Integration tests for the user-visible flow

## Related skills

- `frontend-react-best-practices` — re-renders, bundles, composition micro-rules
- `jest-react-testing` — Jest + React Testing Library
- `typescript-react-reviewer` — review-time anti-patterns
- `arch-plan` — product/plugin architecture living HTML (not React folder layout)

## Attribution

Patterns derived from [Bulletproof React](https://github.com/alan2207/bulletproof-react).
Adapt library choices (Query, Zustand, form libs, CSS) to the consumer repo;
keep the **boundaries and colocation** rules even when the stack differs.
