using ClaimsDesk.Domain.Claims;

namespace ClaimsDesk.Api.Data;

/// <summary>Stores claims. Claim ids and policy numbers are matched case-insensitively.</summary>
public interface IClaimRepository
{
    /// <summary>Claims, optionally only those with <paramref name="status"/>, most recently reported first, then by claim id (descending).</summary>
    Task<IReadOnlyList<Claim>> ListAsync(ClaimStatus? status, CancellationToken cancellationToken);

    /// <summary>Every claim on a policy, oldest incident first.</summary>
    Task<IReadOnlyList<Claim>> ListByPolicyAsync(string policyNumber, CancellationToken cancellationToken);

    Task<Claim?> GetAsync(string claimId, CancellationToken cancellationToken);

    /// <summary>Adds a Submitted claim with the next id, <c>CLM-{reported year}-{sequence:D4}</c>.</summary>
    Task<Claim> AddAsync(NewClaim newClaim, DateOnly reportedDate, DateTimeOffset createdAt, CancellationToken cancellationToken);

    /// <summary>
    /// Sets a claim's status, or returns <see langword="null"/> when the claim does not exist.
    /// Lifecycle rules (R8) are checked by the caller, not here.
    /// </summary>
    Task<Claim?> UpdateStatusAsync(string claimId, ClaimStatus newStatus, CancellationToken cancellationToken);
}
