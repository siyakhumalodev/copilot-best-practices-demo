---
applyTo: "tests/**/*.cs"
description: xUnit test conventions for the ClaimsDesk domain and API tests.
---

# .NET test conventions

- xUnit. Test names follow `Method_Scenario_ExpectedResult`, for example
  `Validate_AmountOnePennyOverCoverLimit_ReturnsAmountOutOfRange`.
- Domain rules: unit tests in `ClaimsDesk.Domain.Tests` using the `TestData` builders. Cover the boundaries (exactly at a limit,
  one penny over, same day, day after) and tag the rule: `[Trait("Rule", "R4")]`.
- API behaviour: `ClaimsDesk.Api.Tests` with `ClaimsDeskApiFactory` - fixed clock **2026-11-02T09:00Z**, seeded data, ids
  `CLM-2026-0001`... Deserialise with `TestJson.Options`. Tests that create or change data use a fresh factory.
- Assert problem details by `code` (for example `AMOUNT_OUT_OF_RANGE`), not by message text.
- Arrange / Act / Assert, one behaviour per test, `[Theory]` with `[InlineData]` for tables of cases.
- No sleeps, no randomness, no real clock.
- Run what you changed first (`dotnet test -nologo -v q --filter "FullyQualifiedName~<ClassName>"`), then the whole suite.
