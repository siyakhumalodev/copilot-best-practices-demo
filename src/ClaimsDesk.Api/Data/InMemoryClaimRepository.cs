using System.Globalization;
using ClaimsDesk.Domain.Claims;

namespace ClaimsDesk.Api.Data;

/// <summary>Thread-safe in-memory claims for the demo. Changes are lost when the API restarts.</summary>
public sealed class InMemoryClaimRepository : IClaimRepository
{
    private readonly Lock _gate = new();
    private readonly Dictionary<string, Claim> _claims;

    public InMemoryClaimRepository(IEnumerable<Claim> claims)
    {
        _claims = claims.ToDictionary(claim => claim.ClaimId, StringComparer.OrdinalIgnoreCase);
    }

    public Task<IReadOnlyList<Claim>> ListAsync(ClaimStatus? status, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        lock (_gate)
        {
            IReadOnlyList<Claim> result = _claims.Values
                .Where(claim => status is null || claim.Status == status)
                .OrderByDescending(claim => claim.ReportedDate)
                .ThenByDescending(claim => claim.ClaimId, StringComparer.Ordinal)
                .ToList();
            return Task.FromResult(result);
        }
    }

    public Task<IReadOnlyList<Claim>> ListByPolicyAsync(string policyNumber, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        lock (_gate)
        {
            IReadOnlyList<Claim> result = _claims.Values
                .Where(claim => string.Equals(claim.PolicyNumber, policyNumber, StringComparison.OrdinalIgnoreCase))
                .OrderBy(claim => claim.IncidentDate)
                .ThenBy(claim => claim.ClaimId, StringComparer.Ordinal)
                .ToList();
            return Task.FromResult(result);
        }
    }

    public Task<Claim?> GetAsync(string claimId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        lock (_gate)
        {
            return Task.FromResult(_claims.GetValueOrDefault(claimId));
        }
    }

    public Task<Claim> AddAsync(
        NewClaim newClaim,
        DateOnly reportedDate,
        DateTimeOffset createdAt,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        lock (_gate)
        {
            var claim = new Claim(
                ClaimId: $"CLM-{reportedDate.Year}-{NextSequence():D4}",
                PolicyNumber: newClaim.PolicyNumber,
                Peril: newClaim.Peril,
                IncidentDate: newClaim.IncidentDate,
                ReportedDate: reportedDate,
                ClaimedAmount: newClaim.ClaimedAmount,
                Description: newClaim.Description,
                ClaimantName: newClaim.ClaimantName,
                ClaimantEmail: newClaim.ClaimantEmail,
                Status: ClaimStatus.Submitted,
                CreatedAt: createdAt);
            _claims.Add(claim.ClaimId, claim);
            return Task.FromResult(claim);
        }
    }

    public Task<Claim?> UpdateStatusAsync(string claimId, ClaimStatus newStatus, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        lock (_gate)
        {
            if (!_claims.TryGetValue(claimId, out var claim))
            {
                return Task.FromResult<Claim?>(null);
            }

            var updated = claim with { Status = newStatus };
            _claims[updated.ClaimId] = updated;
            return Task.FromResult<Claim?>(updated);
        }
    }

    // The next sequence is one more than the highest in use (CLM-2026-0012 -> 13). Callers hold the lock.
    private int NextSequence() => _claims.Keys.Select(SequenceOf).DefaultIfEmpty(0).Max() + 1;

    private static int SequenceOf(string claimId) =>
        int.Parse(claimId[(claimId.LastIndexOf('-') + 1)..], CultureInfo.InvariantCulture);
}
