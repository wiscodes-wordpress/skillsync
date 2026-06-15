# Accessible locator priority (shared)

**Product-agnostic.** Applies to any UI test stack — React Testing Library, Playwright, Cypress, Vitest browser mode, etc. Query the **accessibility tree** the way users and assistive technology do. Semantic HTML (`button`, `label`, `heading`) yields stable tests; `div` + `onClick` yields brittle ones.

Consumers document their runner in **`AGENTS.md`** (Jest, PHPUnit, Playwright, Cypress, …). This file defines **priority**, not a specific framework.

## Priority order (use the highest that works)

1. **Role** — buttons, links, headings, checkboxes, textboxes, navigation, listitems
2. **Label** — form fields with associated labels
3. **Placeholder**
4. **Text** — visible copy users would read
5. **Alt text** / **title**
6. **Test ID** (`data-testid`, `data-test-id`, etc.) — **last resort only**

Do not default to test IDs when role or label would work.

## Framework examples (same priority, different APIs)

| Priority | React Testing Library | Playwright | Cypress (testing-library plugin) |
|----------|----------------------|------------|--------------------------------|
| Role | `getByRole('button', { name: 'Save' })` | `page.getByRole('button', { name: 'Save' })` | `cy.findByRole('button', { name: 'Save' })` |
| Label | `getByLabelText('Email')` | `page.getByLabel('Email')` | `cy.findByLabelText('Email')` |
| Placeholder | `getByPlaceholderText('…')` | `page.getByPlaceholder('…')` | `cy.findByPlaceholderText('…')` |
| Text | `getByText('Welcome')` | `page.getByText('Welcome')` | `cy.findByText('Welcome')` |
| Alt / title | `getByAltText` / `getByTitle` | `page.getByAltText` / `page.getByTitle` | analogous |
| Test ID (last) | `getByTestId` | `page.getByTestId` | `cy.get('[data-testid=…]')` |

**Non-browser stacks** (PHPUnit, pure API tests): no locators — assert through **public interfaces** (HTTP response, hook return value, CLI output). See [`tdd`](../skills/engineering/tdd/SKILL.md).

## Rules for agents and critics

- **Do not add `data-testid`** to production UI solely to make tests pass. Fix semantics (`button`, `label`, `heading`, ARIA) first.
- **Stay high in the hierarchy** — role on a list item beats chaining CSS into nested divs.
- When duplicate text appears, narrow with filters or scope to a parent landmark.
- **Codegen / recorded selectors** must be edited — generated CSS/xpath is often brittle; replace with role/label queries.
- Prefer framework **auto-wait** over manual `sleep()` when the runner supports it.

## Agent verification loop (any stack)

Objective success criteria — not “looks good”:

1. Code changes (human or agent)
2. **Repo test command** runs (hook or CI) — e.g. `yarn test`, `phpunit`, `npx playwright test`
3. On failure → logs/trace → fix **production code** (not weaken tests)
4. Re-run until green

**CLI green is the merge gate** — exploratory browser/MCP tools draft tests; the configured runner proves them.

## Stack-specific skills

Read what the consumer links in **`AGENTS.md`** / **`skillsync.config.json`**, for example:

- [`jest-react-testing`](../skills/engineering/jest-react-testing/SKILL.md) — RTL unit/component
- [`wordpress-testing-qa`](../skills/engineering/wordpress-testing-qa/SKILL.md) — PHPUnit, WP E2E

## Further reading (Playwright example)

[Playwright: E2E Testing and Agent Verification](https://denmercs.com/playwright-e2e-testing-and-agent-verification) — one concrete walkthrough of this philosophy with Playwright, traces, and agent loops (DenMercs).
