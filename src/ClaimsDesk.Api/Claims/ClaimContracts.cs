using ClaimsDesk.Domain.Claims;
using ClaimsDesk.Domain.Policies;

namespace ClaimsDesk.Api.Claims;

// Mirrored by src/web/src/api/types.ts - change both together.
// JSON is camelCase with enums as strings; DateOnly is "yyyy-MM-dd"; money is a JSON number with 2 decimal places.

/// <summary>Body of <c>POST /api/claims</c>. Every member is nullable so missing fields can be reported as FIELD_REQUIRED (R3).</summary>
public sealed record SubmitClaimRequest(
    string? PolicyNumber,
    Peril? Peril,
    DateOnly? IncidentDate,
    decimal? ClaimedAmount,
    string? Description,
    string? ClaimantName,
    string? ClaimantEmail);

/// <summary>A row in the claims list.</summary>
public sealed record ClaimSummaryResponse(
    string ClaimId,
    string PolicyNumber,
    Peril Peril,
    DateOnly IncidentDate,
    DateOnly ReportedDate,
    decimal ClaimedAmount,
    ClaimStatus Status);

/// <summary>A claim's detail, with the policy figures a handler needs. Never includes the claimant's email (R9).</summary>
public sealed record ClaimResponse(
    string ClaimId,
    string PolicyNumber,
    Product Product,
    Peril Peril,
    DateOnly IncidentDate,
    DateOnly ReportedDate,
    decimal ClaimedAmount,
    string Description,
    string ClaimantName,
    ClaimStatus Status,
    decimal PolicyExcess,
    decimal PolicyCoverLimit,
    DateTimeOffset CreatedAt);
