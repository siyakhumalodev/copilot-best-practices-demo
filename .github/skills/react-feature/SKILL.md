---
name: react-feature
description: How to add or change a screen, component or displayed field in the ClaimsDesk React app - mirror the API contract in types.ts, extend the API client, build an accessible component with loading/error states and test ids, and add Vitest + Testing Library tests. Use for any change under src/web/src.
---

# Add or change a ClaimsDesk web feature

## Steps
1. **Contract.** Update `src/web/src/api/types.ts` to match the API contract exactly (field names, nullability, string
   unions for enums). Comment any field that is `null` for some records.
2. **Client.** Add or extend a function in `src/web/src/api/client.ts`; it throws `ApiError` (status + problem details)
   on failure. Components never call `fetch` directly.
3. **Component.** In `src/web/src/features/<feature>/`: a named-export function component, one per file. Handle loading,
   error and empty states. Format with `formatGbp` / `formatDate` / `perilLabel` from `src/lib/format.ts`.
4. **Accessibility.** Labels for inputs, semantic table markup, text alongside any colour (e.g. "Overdue" next to an amber
   cell), focus stays sensible after navigation.
5. **Test ids.** Add `data-testid` (kebab-case) to anything Playwright or a unit test checks.
6. **Tests.** `*.test.tsx` next to the component; render with Testing Library, query by role/label, mock the client:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../api/client', () => ({ listClaims: vi.fn() }))
```

7. **Check.** `npm test --prefix src/web`, `npm run lint --prefix src/web`, `npm run typecheck --prefix src/web`.

## Don'ts
- No business-rule maths in components (excess, triage, overdue thresholds come from the API).
- No new packages, no inline styles for state, no `any`.
