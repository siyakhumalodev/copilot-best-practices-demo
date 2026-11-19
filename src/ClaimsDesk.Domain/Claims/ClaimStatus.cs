namespace ClaimsDesk.Domain.Claims;

/// <summary>Where a claim is in its lifecycle (R8). Settled, Rejected and Withdrawn are closed.</summary>
public enum ClaimStatus
{
    Submitted,
    InReview,
    Approved,
    Rejected,
    Settled,
    Withdrawn,
}
