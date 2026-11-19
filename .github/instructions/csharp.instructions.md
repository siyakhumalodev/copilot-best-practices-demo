---
applyTo: "src/ClaimsDesk.Api/**/*.cs,src/ClaimsDesk.Domain/**/*.cs"
description: C# and ASP.NET Core minimal API conventions for the ClaimsDesk API and domain.
---

# C# conventions

- File-scoped namespaces that match the folder (`ClaimsDesk.Api.Claims`). Feature folders keep contracts, mapping and
  endpoints together.
- `sealed record` for contracts and domain values. Nullable reference types are on - fix warnings, don't silence them with `!`.
- Endpoints: `Map<Feature>Endpoints(this IEndpointRouteBuilder app)` with `MapGroup("/api/<feature>")`. Handlers are
  `static` methods returning `TypedResults` (for example `Results<Ok<ClaimResponse>, ProblemHttpResult>`), not `IResult`.
- Every handler takes a `CancellationToken` and passes it on. Async all the way: no `.Result`, `.Wait()` or `async void`.
- Validation and business rules live in `ClaimsDesk.Domain` and return `ValidationError` lists. Endpoints translate them with
  `ProblemResults` (400 validation, 404 not found, 409 conflict) and an `ErrorCodes` constant.
- Time: inject `TimeProvider`; today is `DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime)`.
- Logging: `ILoggerFactory.CreateLogger("ClaimsDesk.Api.<Feature>")` with structured templates
  (`"Claim {ClaimId} withdrawn"`). Never string interpolation in log calls, never personal data (R9).
- Money: `decimal`; round results with `Money.RoundGbp`; format amounts in messages as `en-GB` currency (`£1,350.00`).
- No `catch (Exception)` in endpoints - unhandled errors go to the problem-details exception handler.
- Prefer small static rule classes in the domain (`ClaimValidator`) that take their inputs explicitly, so they are easy to test.
