using System.Net;
using System.Net.Http.Json;
using ClaimsDesk.Api.Policies;
using ClaimsDesk.Domain.Claims;
using ClaimsDesk.Domain.Policies;

namespace ClaimsDesk.Api.Tests;

public class PoliciesApiTests(ClaimsDeskApiFactory factory) : IClassFixture<ClaimsDeskApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task GetPolicy_KnownNumber_ReturnsPolicy()
    {
        var policy = await _client.GetFromJsonAsync<PolicyResponse>("/api/policies/POL-100001", TestJson.Options);

        Assert.NotNull(policy);
        Assert.Equal("POL-100001", policy.PolicyNumber);
        Assert.Equal(Product.Home, policy.Product);
        Assert.Equal(250_000.00m, policy.CoverLimit);
        Assert.Equal(250.00m, policy.Excess);
        Assert.Equal(ClaimsDeskApiFactory.Today.AddDays(-200), policy.StartDate);
        Assert.Equal(PolicyStatus.Active, policy.Status);
    }

    [Fact]
    public async Task GetPolicy_UnknownNumber_Returns404WithPolicyNotFoundCode()
    {
        var response = await _client.GetAsync("/api/policies/POL-999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemResponse>(TestJson.Options);
        Assert.NotNull(problem);
        Assert.Equal(ErrorCodes.PolicyNotFound, problem.Code);
    }

    [Fact]
    public async Task ListPolicies_NoFilter_ReturnsSeededPoliciesInNumberOrder()
    {
        var policies = await _client.GetFromJsonAsync<List<PolicyResponse>>("/api/policies", TestJson.Options);

        Assert.NotNull(policies);
        Assert.Equal(6, policies.Count);
        Assert.Equal("POL-100001", policies[0].PolicyNumber);
    }
}
