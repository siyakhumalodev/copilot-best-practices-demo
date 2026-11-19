# ClaimsDesk API - Copilot instructions

This repository is the **ClaimsDesk API**: an ASP.NET Core minimal API (.NET 10) for the fictional Contoso Insurance.
Synthetic data only. Business rules are in the `claims-rules` skill (R1-R10). The web app lives in the separate
**claimsdesk-web** repository.

## Map

| Path | What |
|---|---|
| `src/ClaimsDesk.Domain/` | Business rules in plain C# |
| `src/ClaimsDesk.Api/` | Minimal API: `Claims/`, `Policies/`, `Data/`, `Infrastructure/ProblemResults.cs` |
| `tests/` | xUnit domain and API tests (fixed clock 2026-11-02) |

## Commands

`dotnet build -nologo -v q` · `dotnet test -nologo -v q` (filter one class first) · `dotnet run --project src/ClaimsDesk.Api` (http://localhost:5080)

## Contract with claimsdesk-web

`src/ClaimsDesk.Api/Claims/ClaimContracts.cs` is mirrored by `claimsdesk-web/src/api/types.ts`. Any contract change must be
made on both sides with the same field names and types (JSON is camelCase, enums are strings, dates `yyyy-MM-dd`).

## Conventions and guardrails

- Rules in `ClaimsDesk.Domain`; endpoints thin; `TypedResults`; problem details with an `ErrorCodes` code.
- Money is `decimal` GBP, 2 dp. Time from `TimeProvider`. `CancellationToken` everywhere.
- Every behaviour change ships with tests; never weaken a test.
- Never log claimant name or email (R9).
