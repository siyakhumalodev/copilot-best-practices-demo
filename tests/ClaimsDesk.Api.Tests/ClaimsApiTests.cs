using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ClaimsDesk.Api.Claims;
using ClaimsDesk.Domain.Claims;

namespace ClaimsDesk.Api.Tests;

public class ClaimsApiTests(ClaimsDeskApiFactory factory) : IClassFixture<ClaimsDeskApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task ListClaims_NoFilter_ReturnsAllSeededClaims()
    {
        var claims = await _client.GetFromJsonAsync<List<ClaimSummaryResponse>>("/api/claims", TestJson.Options);

        Assert.NotNull(claims);
        Assert.Equal(12, claims.Count);
    }

    [Fact]
    public async Task ListClaims_NoFilter_ReturnsMostRecentlyReportedFirst()
    {
        string[] expectedOrder =
        [
            "CLM-2026-0009", "CLM-2026-0006", "CLM-2026-0011", "CLM-2026-0002", "CLM-2026-0010", "CLM-2026-0003",
            "CLM-2026-0001", "CLM-2026-0012", "CLM-2026-0007", "CLM-2026-0008", "CLM-2026-0005", "CLM-2026-0004",
        ];

        var claims = await _client.GetFromJsonAsync<List<ClaimSummaryResponse>>("/api/claims", TestJson.Options);

        Assert.NotNull(claims);
        Assert.Equal(expectedOrder, claims.Select(claim => claim.ClaimId));
    }

    [Fact]
    public async Task ListClaims_StatusSubmitted_ReturnsOnlySubmittedClaims()
    {
        string[] expectedIds = ["CLM-2026-0001", "CLM-2026-0006", "CLM-2026-0009", "CLM-2026-0010", "CLM-2026-0011"];

        var claims = await _client.GetFromJsonAsync<List<ClaimSummaryResponse>>(
            "/api/claims?status=Submitted", TestJson.Options);

        Assert.NotNull(claims);
        Assert.All(claims, claim => Assert.Equal(ClaimStatus.Submitted, claim.Status));
        Assert.Equal(expectedIds, claims.Select(claim => claim.ClaimId).Order(StringComparer.Ordinal));
    }

    [Fact]
    [Trait("Rule", "R9")]
    public async Task GetClaim_KnownId_ReturnsDetailWithoutClaimantEmail()
    {
        var response = await _client.GetAsync("/api/claims/CLM-2026-0001");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        var claim = JsonSerializer.Deserialize<ClaimResponse>(json, TestJson.Options);
        Assert.NotNull(claim);
        Assert.Equal(Peril.EscapeOfWater, claim.Peril);
        Assert.Equal(250.00m, claim.PolicyExcess);
        Assert.Equal("Synthetic Customer 001", claim.ClaimantName);
        using var document = JsonDocument.Parse(json);
        Assert.False(document.RootElement.TryGetProperty("claimantEmail", out _));
        Assert.DoesNotContain("customer001@example.com", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetClaim_UnknownId_Returns404WithClaimNotFoundCode()
    {
        var response = await _client.GetAsync("/api/claims/CLM-2026-9999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemResponse>(TestJson.Options);
        Assert.NotNull(problem);
        Assert.Equal(ErrorCodes.ClaimNotFound, problem.Code);
    }

    [Fact]
    [Trait("Rule", "R3")]
    public async Task SubmitClaim_ValidClaim_Returns201WithLocationAndSubmittedStatus()
    {
        await using var isolatedFactory = new ClaimsDeskApiFactory();
        using var client = isolatedFactory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/claims", ValidRequest(), TestJson.Options);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("/api/claims/CLM-2026-0013", response.Headers.Location?.OriginalString);
        var claim = await response.Content.ReadFromJsonAsync<ClaimResponse>(TestJson.Options);
        Assert.NotNull(claim);
        Assert.Equal("CLM-2026-0013", claim.ClaimId);
        Assert.Equal(ClaimStatus.Submitted, claim.Status);
        Assert.Equal(ClaimsDeskApiFactory.Today, claim.ReportedDate);
    }

    [Fact]
    [Trait("Rule", "R2")]
    public async Task SubmitClaim_AmountAboveCoverLimit_Returns400AmountOutOfRange()
    {
        var request = ValidRequest() with { PolicyNumber = "POL-100002", Peril = Peril.Collision, ClaimedAmount = 20_000.00m };

        var errors = await PostExpectingValidationErrors(request);

        Assert.Equal(ErrorCodes.AmountOutOfRange, errors[0].Code);
    }

    [Fact]
    [Trait("Rule", "R1")]
    public async Task SubmitClaim_CancelledPolicy_Returns400PolicyNotInForce()
    {
        var request = ValidRequest() with { PolicyNumber = "POL-100005", Peril = Peril.Collision };

        var errors = await PostExpectingValidationErrors(request);

        var error = Assert.Single(errors);
        Assert.Equal(ErrorCodes.PolicyNotInForce, error.Code);
        Assert.Equal("incidentDate", error.Field);
    }

    [Fact]
    [Trait("Rule", "R3")]
    public async Task SubmitClaim_MissingPeril_Returns400FieldRequired()
    {
        var request = ValidRequest() with { Peril = null };

        var errors = await PostExpectingValidationErrors(request);

        var error = Assert.Single(errors);
        Assert.Equal(ErrorCodes.FieldRequired, error.Code);
        Assert.Equal("peril", error.Field);
    }

    [Fact]
    public async Task Health_Get_Returns200()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static SubmitClaimRequest ValidRequest() => new(
        PolicyNumber: "POL-100001",
        Peril: Peril.AccidentalDamage,
        IncidentDate: ClaimsDeskApiFactory.Today.AddDays(-3),
        ClaimedAmount: 450.00m,
        Description: "Coffee spilled on a laptop keyboard.",
        ClaimantName: "Synthetic Customer 001",
        ClaimantEmail: "customer001@example.com");

    // Posts a claim that must be rejected and returns the validation errors from the problem details.
    private async Task<IReadOnlyList<ValidationError>> PostExpectingValidationErrors(SubmitClaimRequest request)
    {
        var response = await _client.PostAsJsonAsync("/api/claims", request, TestJson.Options);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemResponse>(TestJson.Options);
        Assert.NotNull(problem);
        Assert.Equal(ErrorCodes.ValidationFailed, problem.Code);
        Assert.NotNull(problem.Errors);
        Assert.NotEmpty(problem.Errors);
        return problem.Errors;
    }
}
