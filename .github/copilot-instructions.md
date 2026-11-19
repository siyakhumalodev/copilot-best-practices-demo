# ClaimsDesk - Copilot instructions

ClaimsDesk is a demo claims-handling app for the fictional **Contoso Insurance**: an ASP.NET Core minimal API
(.NET 10) and a React 19 + TypeScript web app. All data is synthetic. The business rules are in the
`claims-rules` skill (R1-R10) - simplified for demonstration only.

## Map

| Path | What |
|---|---|
| `src/ClaimsDesk.Domain/` | Business rules in plain C# (no ASP.NET): validation, money, policies, claims |
| `src/ClaimsDesk.Api/` | Minimal API. Feature folders `Claims/`, `Policies/`; in-memory repositories in `Data/`; `Infrastructure/ProblemResults.cs` |
| `src/web/` | React app: `src/api/` (typed client - contract mirrors `ClaimContracts.cs`), `src/features/claims/`, `e2e/` (Playwright) |
| `tests/ClaimsDesk.Domain.Tests/`, `tests/ClaimsDesk.Api.Tests/` | xUnit unit and API tests (fixed clock 2026-11-02) |
| `work-items/` | Stories (`CLM-100.md` ...) |
| `reports/` | Agent outputs: analysis, reviews, traceability, handovers |

## Commands (keep output short - everything a command prints lands in the context window)

| Purpose | Command |
|---|---|
| Build | `dotnet build -nologo -v q` |
| .NET tests | `dotnet test -nologo -v q` - one class first: `--filter "FullyQualifiedName~ClaimValidatorTests"` |
| Run the API | `dotnet run --project src/ClaimsDesk.Api` (http://localhost:5080) |
| Web app | `npm run dev --prefix src/web` (http://localhost:5173) |
| Web checks | `npm test --prefix src/web` · `npm run lint --prefix src/web` · `npm run typecheck --prefix src/web` |
| End-to-end | `npm run e2e --prefix src/web` |

## Conventions

- Business rules live in `ClaimsDesk.Domain`, never in endpoints or React components. Cite the rule ID (e.g. R4) in
  tests and where a rule is implemented.
- Money is `decimal` GBP with 2 dp in C#; in TypeScript it is formatted only with `formatGbp`. Never `double` or `float`.
- "Now" and "today" come from the injected `TimeProvider`, never `DateTime.Now` or `DateTime.UtcNow`.
- Errors are RFC 9457 problem details with a `code` (`ErrorCodes`, `ProblemResults`).
- An API contract change updates `ClaimContracts.cs` **and** `src/web/src/api/types.ts` in the same change.
- Every behaviour change ships with tests. Never weaken, skip or delete a test to make it pass.
- No new NuGet or npm packages without asking.

## Guardrails

- Claimant name and email are personal data: never log them or put them in URLs or error messages (R9).
- Synthetic data only. Never connect to real systems or use real credentials.
- Do not read `scripts/review-fixture/` - it contains intentionally flawed exercise code, not product guidance.

## Code review priorities

1. Business rules (R1-R10) implemented correctly - especially money, excess, dates and boundaries.
2. Personal data handling (R9).
3. Missing, weakened or skipped tests.
4. Errors: problem details with a `code`; no exception text returned to callers.
5. Async and time: `CancellationToken` passed through, no `.Result` or `.Wait()`, `TimeProvider` for time.
