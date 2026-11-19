using ClaimsDesk.Domain.Policies;

namespace ClaimsDesk.Api.Policies;

/// <summary>A policy as returned by <c>/api/policies</c>.</summary>
public sealed record PolicyResponse(
    string PolicyNumber,
    string HolderName,
    Product Product,
    decimal CoverLimit,
    decimal Excess,
    DateOnly StartDate,
    DateOnly EndDate,
    PolicyStatus Status);

/// <summary>Maps domain policies to API contracts.</summary>
public static class PolicyMapping
{
    public static PolicyResponse ToResponse(this Policy policy) => new(
        PolicyNumber: policy.PolicyNumber,
        HolderName: policy.HolderName,
        Product: policy.Product,
        CoverLimit: policy.CoverLimit,
        Excess: policy.Excess,
        StartDate: policy.StartDate,
        EndDate: policy.EndDate,
        Status: policy.Status);
}
