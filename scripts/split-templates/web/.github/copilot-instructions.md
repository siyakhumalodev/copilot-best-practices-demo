# ClaimsDesk web - Copilot instructions

This repository is the **ClaimsDesk web app** (React 19 + TypeScript + Vite) for the fictional Contoso Insurance.
Synthetic data only. The API lives in the separate **claimsdesk-api** repository (http://localhost:5080, proxied as `/api`).

## Map

| Path | What |
|---|---|
| `src/api/` | `types.ts` (contract) and `client.ts` (all HTTP calls) |
| `src/features/claims/` | Screens and components, tests next to them |
| `src/lib/format.ts` | Money, date and label formatting |
| `e2e/` | Playwright tests (they start or reuse the API from `../claimsdesk-api`) |

## Commands

`npm run dev` (http://localhost:5173) · `npm test` · `npm run lint` · `npm run typecheck` · `npm run e2e`

## Contract with claimsdesk-api

`src/api/types.ts` mirrors `claimsdesk-api/src/ClaimsDesk.Api/Claims/ClaimContracts.cs`. Change both sides together with the
same field names and types. Business rules (excess, triage, overdue) are calculated by the API - never in components.

## Conventions and guardrails

- Function components, named exports, strict TypeScript (no `any`), accessible markup, kebab-case `data-testid`s.
- Format money and dates only with `src/lib/format.ts`. British English in UI text.
- Every behaviour change ships with tests; never weaken a test. No new packages without asking.
