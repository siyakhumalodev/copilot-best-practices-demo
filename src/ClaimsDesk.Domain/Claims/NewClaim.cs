namespace ClaimsDesk.Domain.Claims;

/// <summary>A claim as submitted, before validation. The server sets the id, reported date and status.</summary>
public sealed record NewClaim(
    string PolicyNumber,
    Peril Peril,
    DateOnly IncidentDate,
    decimal ClaimedAmount,
    string Description,
    string ClaimantName,
    string ClaimantEmail);
