---
name: api-endpoint
description: How to add or change an endpoint or response field in the ClaimsDesk minimal API end to end - contract records, domain rule, endpoint with TypedResults and problem details, the matching web contract, and xUnit domain and API tests. Use when asked to add an API endpoint, add a field to a response, or add server-side validation.
---

# Add or change a ClaimsDesk API endpoint

Follow these steps in order. Keep each step small and run the tests as you go.

## 1. Rule first (domain)
- Put the business rule in `src/ClaimsDesk.Domain/<Feature>/` as a small static class or a method on the record.
  Inputs are explicit (pass `today`, the policy, other claims) so the rule is easy to unit test.
- New error? Add a constant to `ErrorCodes` (`UPPER_SNAKE_CASE`).

## 2. Contract (API and web together)
- Add or change records in `src/ClaimsDesk.Api/<Feature>/<Feature>Contracts.cs` (`sealed record`, PascalCase; JSON is
  camelCase with string enums).
- Mirror the change in `src/web/src/api/types.ts` in the same change. Never expose `ClaimantEmail` (R9).

## 3. Endpoint
- Map it in `Map<Feature>Endpoints` on the feature's `MapGroup`. Handler shape:

```csharp
private static async Task<Results<Ok<ClaimResponse>, ProblemHttpResult>> WithdrawClaim(
    string claimId,
    IClaimRepository claims,
    IPolicyRepository policies,
    ILoggerFactory loggerFactory,
    CancellationToken cancellationToken)
{
    var claim = await claims.GetAsync(claimId, cancellationToken);
    if (claim is null)
    {
        return ProblemResults.NotFound(ErrorCodes.ClaimNotFound, $"Claim {claimId} was not found.");
    }

    // Rule check in the domain (R8) -> 409 with a code when it fails
    // ... update through the repository, passing cancellationToken ...

    loggerFactory.CreateLogger("ClaimsDesk.Api.Claims")
        .LogInformation("Claim {ClaimId} withdrawn", claim.ClaimId); // ids only - never personal data (R9)

    return TypedResults.Ok(/* mapped response */);
}
```

- `TypedResults` only. 400 = `ProblemResults.Validation(errors)`, 404 = `ProblemResults.NotFound(code, detail)`,
  409 = `ProblemResults.Conflict(code, detail)`. No `try/catch (Exception)`.
- Time from an injected `TimeProvider`. Declare `IReadOnlyList<T>` variables before `TypedResults.Ok(...)` so the result
  type matches the declared return type.

## 4. Tests
- Domain: `tests/ClaimsDesk.Domain.Tests/<Rule>Tests.cs` - happy path plus every boundary, `[Trait("Rule", "R<n>")]`.
- API: `tests/ClaimsDesk.Api.Tests/<Feature>ApiTests.cs` with `ClaimsDeskApiFactory` (clock 2026-11-02): status code,
  response body and problem `code` for each failure. Use a fresh factory when the test changes data.
- Run `dotnet test -nologo -v q --filter "FullyQualifiedName~<Class>"`, then the full suite.

## 5. Done when
- Build and all tests pass; the contract matches `types.ts`; no personal data in logs or errors; rule IDs cited in tests.
