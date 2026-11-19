---
applyTo: "src/**/*.ts,src/**/*.tsx"
description: React and TypeScript conventions for the ClaimsDesk web app.
---

# React and TypeScript conventions

- Function components and hooks only; one component per file in `src/features/<feature>/`; named exports.
- API types in `src/api/types.ts` mirror the API contract exactly; data access only through `src/api/client.ts`.
- Handle loading, error and empty states. Format with `src/lib/format.ts`. No business-rule arithmetic in components.
- Labels for every input, semantic elements, never colour alone for status. Kebab-case `data-testid`s.
- Vitest + Testing Library tests next to components; query by role or label; mock `src/api/client.ts` with `vi.mock`.
