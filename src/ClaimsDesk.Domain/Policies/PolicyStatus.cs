namespace ClaimsDesk.Domain.Policies;

/// <summary>The status of a policy. A lapsed policy still covers incidents from while it was in force (R1).</summary>
public enum PolicyStatus
{
    Active,
    Lapsed,
    Cancelled,
}
