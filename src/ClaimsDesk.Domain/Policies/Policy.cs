namespace ClaimsDesk.Domain.Policies;

/// <summary>An insurance policy. <see cref="CoverLimit"/> and <see cref="Excess"/> are GBP.</summary>
public sealed record Policy(
    string PolicyNumber,
    string HolderName,
    Product Product,
    decimal CoverLimit,
    decimal Excess,
    DateOnly StartDate,
    DateOnly EndDate,
    PolicyStatus Status)
{
    /// <summary>
    /// R1: the policy covers an incident on or between its start and end dates (inclusive), unless it is cancelled.
    /// A lapsed policy still covers incidents that happened while it was in force.
    /// </summary>
    public bool CoversIncidentOn(DateOnly incidentDate) =>
        Status != PolicyStatus.Cancelled && incidentDate >= StartDate && incidentDate <= EndDate;
}
