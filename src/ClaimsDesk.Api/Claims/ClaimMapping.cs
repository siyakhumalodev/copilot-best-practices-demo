using ClaimsDesk.Domain.Claims;
using ClaimsDesk.Domain.Policies;

namespace ClaimsDesk.Api.Claims;

/// <summary>Maps domain claims to API contracts. The claimant's email is never mapped (R9).</summary>
public static class ClaimMapping
{
    public static ClaimSummaryResponse ToSummary(this Claim claim) => new(
        ClaimId: claim.ClaimId,
        PolicyNumber: claim.PolicyNumber,
        Peril: claim.Peril,
        IncidentDate: claim.IncidentDate,
        ReportedDate: claim.ReportedDate,
        ClaimedAmount: claim.ClaimedAmount,
        Status: claim.Status);

    public static ClaimResponse ToResponse(this Claim claim, Policy policy) => new(
        ClaimId: claim.ClaimId,
        PolicyNumber: claim.PolicyNumber,
        Product: policy.Product,
        Peril: claim.Peril,
        IncidentDate: claim.IncidentDate,
        ReportedDate: claim.ReportedDate,
        ClaimedAmount: claim.ClaimedAmount,
        Description: claim.Description,
        ClaimantName: claim.ClaimantName,
        Status: claim.Status,
        PolicyExcess: policy.Excess,
        PolicyCoverLimit: policy.CoverLimit,
        CreatedAt: claim.CreatedAt);
}
