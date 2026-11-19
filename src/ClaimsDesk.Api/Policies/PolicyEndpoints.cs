using ClaimsDesk.Api.Data;
using ClaimsDesk.Api.Infrastructure;
using ClaimsDesk.Domain.Claims;
using Microsoft.AspNetCore.Http.HttpResults;

namespace ClaimsDesk.Api.Policies;

/// <summary>HTTP endpoints for policies: <c>/api/policies</c>.</summary>
public static class PolicyEndpoints
{
    public static IEndpointRouteBuilder MapPolicyEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/policies").WithTags("Policies");

        group.MapGet("/", ListPolicies).WithName("ListPolicies").WithSummary("List all policies");
        group.MapGet("/{policyNumber}", GetPolicy).WithName("GetPolicy").WithSummary("Get a policy by its number");

        return app;
    }

    private static async Task<Ok<IReadOnlyList<PolicyResponse>>> ListPolicies(
        IPolicyRepository policies,
        CancellationToken cancellationToken)
    {
        var all = await policies.ListAsync(cancellationToken);
        IReadOnlyList<PolicyResponse> response = all.Select(policy => policy.ToResponse()).ToList();
        return TypedResults.Ok(response);
    }

    private static async Task<Results<Ok<PolicyResponse>, ProblemHttpResult>> GetPolicy(
        string policyNumber,
        IPolicyRepository policies,
        CancellationToken cancellationToken)
    {
        var policy = await policies.GetAsync(policyNumber, cancellationToken);
        if (policy is null)
        {
            return ProblemResults.NotFound(ErrorCodes.PolicyNotFound, $"Policy {policyNumber} was not found.");
        }

        return TypedResults.Ok(policy.ToResponse());
    }
}
