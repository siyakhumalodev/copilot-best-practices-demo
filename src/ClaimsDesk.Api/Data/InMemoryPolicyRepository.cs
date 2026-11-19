using System.Collections.Frozen;
using ClaimsDesk.Domain.Policies;

namespace ClaimsDesk.Api.Data;

/// <summary>
/// In-memory policies for the demo. Policies never change, so the store is immutable - and therefore thread-safe
/// without a lock.
/// </summary>
public sealed class InMemoryPolicyRepository : IPolicyRepository
{
    private readonly FrozenDictionary<string, Policy> _policies;

    public InMemoryPolicyRepository(IEnumerable<Policy> policies)
    {
        _policies = policies.ToFrozenDictionary(policy => policy.PolicyNumber, StringComparer.OrdinalIgnoreCase);
    }

    public Task<Policy?> GetAsync(string policyNumber, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(_policies.GetValueOrDefault(policyNumber));
    }

    public Task<IReadOnlyList<Policy>> ListAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        IReadOnlyList<Policy> result = _policies.Values
            .OrderBy(policy => policy.PolicyNumber, StringComparer.Ordinal)
            .ToList();
        return Task.FromResult(result);
    }
}
