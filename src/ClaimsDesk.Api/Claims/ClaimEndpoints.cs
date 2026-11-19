using System.Diagnostics.CodeAnalysis;
using ClaimsDesk.Api.Data;
using ClaimsDesk.Api.Infrastructure;
using ClaimsDesk.Domain.Claims;
using Microsoft.AspNetCore.Http.HttpResults;

namespace ClaimsDesk.Api.Claims;

/// <summary>HTTP endpoints for claims: <c>/api/claims</c>.</summary>
public static class ClaimEndpoints
{
    private const string LoggerCategory = "ClaimsDesk.Api.Claims";

    public static IEndpointRouteBuilder MapClaimEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/claims").WithTags("Claims");

        group.MapGet("/", ListClaims).WithName("ListClaims").WithSummary("List claims, most recently reported first");
        group.MapGet("/{claimId}", GetClaim).WithName("GetClaim").WithSummary("Get a claim by its id");
        group.MapPost("/", SubmitClaim).WithName("SubmitClaim").WithSummary("Submit a new claim");

        return app;
    }

    private static async Task<Ok<IReadOnlyList<ClaimSummaryResponse>>> ListClaims(
        ClaimStatus? status,
        IClaimRepository claims,
        CancellationToken cancellationToken)
    {
        var matches = await claims.ListAsync(status, cancellationToken);
        IReadOnlyList<ClaimSummaryResponse> response = matches.Select(claim => claim.ToSummary()).ToList();
        return TypedResults.Ok(response);
    }

    private static async Task<Results<Ok<ClaimResponse>, ProblemHttpResult>> GetClaim(
        string claimId,
        IClaimRepository claims,
        IPolicyRepository policies,
        CancellationToken cancellationToken)
    {
        var claim = await claims.GetAsync(claimId, cancellationToken);
        if (claim is null)
        {
            return ProblemResults.NotFound(ErrorCodes.ClaimNotFound, $"Claim {claimId} was not found.");
        }

        var policy = await policies.GetAsync(claim.PolicyNumber, cancellationToken)
            ?? throw new InvalidOperationException($"Claim {claim.ClaimId} refers to unknown policy {claim.PolicyNumber}.");

        return TypedResults.Ok(claim.ToResponse(policy));
    }

    private static async Task<Results<Created<ClaimResponse>, ProblemHttpResult>> SubmitClaim(
        SubmitClaimRequest request,
        IClaimRepository claims,
        IPolicyRepository policies,
        TimeProvider timeProvider,
        ILoggerFactory loggerFactory,
        CancellationToken cancellationToken)
    {
        if (!TryCreateNewClaim(request, out var newClaim))
        {
            return ProblemResults.Validation(MissingRequiredFields(request));
        }

        var now = timeProvider.GetUtcNow();
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var policy = await policies.GetAsync(newClaim.PolicyNumber, cancellationToken);
        var errors = ClaimValidator.Validate(newClaim, policy, today);
        if (policy is null || errors.Count > 0)
        {
            return ProblemResults.Validation(errors);
        }

        var claim = await claims.AddAsync(
            newClaim with { PolicyNumber = policy.PolicyNumber },
            reportedDate: today,
            createdAt: now,
            cancellationToken);

        loggerFactory.CreateLogger(LoggerCategory)
            .LogInformation("Claim {ClaimId} submitted for policy {PolicyNumber}", claim.ClaimId, claim.PolicyNumber);

        return TypedResults.Created($"/api/claims/{claim.ClaimId}", claim.ToResponse(policy));
    }

    // R3: policy number, peril, incident date and claimed amount must be present before any other rule is checked.
    private static bool TryCreateNewClaim(SubmitClaimRequest request, [NotNullWhen(true)] out NewClaim? newClaim)
    {
        if (request is { PolicyNumber: { } policyNumber, Peril: { } peril, IncidentDate: { } incidentDate, ClaimedAmount: { } claimedAmount }
            && !string.IsNullOrWhiteSpace(policyNumber))
        {
            newClaim = new NewClaim(
                PolicyNumber: policyNumber.Trim(),
                Peril: peril,
                IncidentDate: incidentDate,
                ClaimedAmount: claimedAmount,
                Description: request.Description?.Trim() ?? string.Empty,
                ClaimantName: request.ClaimantName?.Trim() ?? string.Empty,
                ClaimantEmail: request.ClaimantEmail?.Trim() ?? string.Empty);
            return true;
        }

        newClaim = null;
        return false;
    }

    private static List<ValidationError> MissingRequiredFields(SubmitClaimRequest request)
    {
        var errors = new List<ValidationError>();
        if (string.IsNullOrWhiteSpace(request.PolicyNumber))
        {
            errors.Add(Required("policyNumber", "Policy number"));
        }

        if (request.Peril is null)
        {
            errors.Add(Required("peril", "Peril"));
        }

        if (request.IncidentDate is null)
        {
            errors.Add(Required("incidentDate", "Incident date"));
        }

        if (request.ClaimedAmount is null)
        {
            errors.Add(Required("claimedAmount", "Claimed amount"));
        }

        return errors;
    }

    private static ValidationError Required(string field, string label) =>
        new(ErrorCodes.FieldRequired, field, $"{label} is required.");
}
