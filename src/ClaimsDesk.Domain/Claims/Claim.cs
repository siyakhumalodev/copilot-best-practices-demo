namespace ClaimsDesk.Domain.Claims;

/// <summary>
/// A claim against a policy. <see cref="ClaimantName"/> and <see cref="ClaimantEmail"/> are personal data (R9):
/// never log them or put them in URLs or messages.
/// </summary>
public sealed record Claim(
    string ClaimId,
    string PolicyNumber,
    Peril Peril,
    DateOnly IncidentDate,
    DateOnly ReportedDate,
    decimal ClaimedAmount,
    string Description,
    string ClaimantName,
    string ClaimantEmail,
    ClaimStatus Status,
    DateTimeOffset CreatedAt)
{
    /// <summary>R8: a claim is open while it is Submitted, InReview or Approved.</summary>
    public bool IsOpen => Status is ClaimStatus.Submitted or ClaimStatus.InReview or ClaimStatus.Approved;
}
