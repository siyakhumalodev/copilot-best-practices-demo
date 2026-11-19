using ClaimsDesk.Domain.Policies;

namespace ClaimsDesk.Api.Data;

/// <summary>Reads policies. Policy numbers are matched case-insensitively.</summary>
public interface IPolicyRepository
{
    Task<Policy?> GetAsync(string policyNumber, CancellationToken cancellationToken);

    /// <summary>All policies, ordered by policy number.</summary>
    Task<IReadOnlyList<Policy>> ListAsync(CancellationToken cancellationToken);
}
