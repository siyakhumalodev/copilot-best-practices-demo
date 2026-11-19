---
applyTo: "src/web/src/**/*.ts,src/web/src/**/*.tsx"
description: React and TypeScript conventions for the ClaimsDesk web app.
---

# React and TypeScript conventions

- Function components and hooks only; one component per file in `src/features/<feature>/`; named exports.
- Strict TypeScript: no `any`, no non-null `!` without a guard. API types live in `src/api/types.ts` and mirror
  `src/ClaimsDesk.Api/Claims/ClaimContracts.cs` exactly - change both together.
- Data access only through `src/api/client.ts` (`ApiError` carries the problem details). Every screen handles loading, error
  and empty states.
- Formatting only through `src/lib/format.ts` (`formatGbp`, `formatDate`, `perilLabel`). No business-rule arithmetic in
  components - rules live in the API.
- Accessibility: every input has a `<label>`; use semantic elements (`table`, `button`, `nav`); never convey status by colour alone.
- Test ids are kebab-case `data-testid` values (`claim-row-<id>`, `field-error-<field>`).
- Tests sit next to the component (`*.test.tsx`) and use Vitest + Testing Library. Query by role or label first; mock
  `src/api/client.ts` with `vi.mock`.
- British English in UI text. No new npm packages without asking.
