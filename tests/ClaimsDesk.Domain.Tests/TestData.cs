using ClaimsDesk.Domain.Claims;
using ClaimsDesk.Domain.Policies;

namespace ClaimsDesk.Domain.Tests;

/// <summary>Builders for valid domain objects. Tests change only what matters, with <c>with</c> expressions.</summary>
internal static class TestData
{
    /// <summary>The fixed "today" for domain tests - the same date as the API tests' clock.</summary>
    public static readonly DateOnly Today = new(2026, 11, 2);

    /// <summary>An active home policy: £10,000.00 cover, £250.00 excess, in force from 100 days ago.</summary>
    public static Policy CreatePolicy() => new(
        PolicyNumber: "POL-900001",
        HolderName: "Synthetic Customer 901",
        Product: Product.Home,
        CoverLimit: 10_000.00m,
        Excess: 250.00m,
        StartDate: Today.AddDays(-100),
        EndDate: Today.AddDays(265),
        Status: PolicyStatus.Active);

    /// <summary>A valid £500.00 accidental damage claim on <see cref="CreatePolicy"/> for an incident 3 days ago.</summary>
    public static NewClaim CreateNewClaim() => new(
        PolicyNumber: "POL-900001",
        Peril: Peril.AccidentalDamage,
        IncidentDate: Today.AddDays(-3),
        ClaimedAmount: 500.00m,
        Description: "Laptop knocked off a desk; the screen cracked.",
        ClaimantName: "Synthetic Customer 901",
        ClaimantEmail: "customer901@example.com");

    /// <summary>A submitted £500.00 claim on <see cref="CreatePolicy"/>, reported the day after the incident.</summary>
    public static Claim CreateClaim() => new(
        ClaimId: "CLM-2026-0901",
        PolicyNumber: "POL-900001",
        Peril: Peril.AccidentalDamage,
        IncidentDate: Today.AddDays(-3),
        ReportedDate: Today.AddDays(-2),
        ClaimedAmount: 500.00m,
        Description: "Laptop knocked off a desk; the screen cracked.",
        ClaimantName: "Synthetic Customer 901",
        ClaimantEmail: "customer901@example.com",
        Status: ClaimStatus.Submitted,
        CreatedAt: new DateTimeOffset(Today.AddDays(-2).ToDateTime(new TimeOnly(9, 0)), TimeSpan.Zero));
}
