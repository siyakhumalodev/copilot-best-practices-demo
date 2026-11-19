using ClaimsDesk.Domain.Claims;
using ClaimsDesk.Domain.Policies;

namespace ClaimsDesk.Api.Data;

/// <summary>
/// Synthetic demo data. Every date is relative to <c>today</c>, so the demo never ages; with today = 2026-11-02 the
/// claims are CLM-2026-0001 to CLM-2026-0012. Names and email addresses are synthetic.
/// </summary>
public static class SeedData
{
    public static IReadOnlyList<Policy> Policies(DateOnly today) =>
    [
        new("POL-100001", Customer(1), Product.Home, 250_000.00m, 250.00m, today.AddDays(-200), today.AddDays(165), PolicyStatus.Active),
        new("POL-100002", Customer(2), Product.Motor, 15_000.00m, 300.00m, today.AddDays(-100), today.AddDays(265), PolicyStatus.Active),
        new("POL-100003", Customer(3), Product.Travel, 10_000.00m, 100.00m, today.AddDays(-10), today.AddDays(355), PolicyStatus.Active),
        new("POL-100004", Customer(4), Product.Home, 150_000.00m, 500.00m, today.AddDays(-400), today.AddDays(-35), PolicyStatus.Lapsed),
        new("POL-100005", Customer(5), Product.Motor, 8_000.00m, 250.00m, today.AddDays(-300), today.AddDays(65), PolicyStatus.Cancelled),
        new("POL-100006", Customer(6), Product.Home, 200_000.00m, 350.00m, today.AddDays(-330), today.AddDays(35), PolicyStatus.Active),
    ];

    public static IReadOnlyList<Claim> Claims(DateOnly today)
    {
        // Sequence, policy, peril, incident (days ago), reported (days ago), amount, status, customer, description
        return
        [
            Seed(1, "POL-100001", Peril.EscapeOfWater, 20, 18, 1_850.00m, ClaimStatus.Submitted, 1,
                "Water leaking from a corroded pipe under the kitchen sink damaged the floor and base units."),
            Seed(2, "POL-100002", Peril.Windscreen, 9, 8, 420.00m, ClaimStatus.Approved, 2,
                "A stone chip on the motorway spread into a crack across the windscreen."),
            Seed(3, "POL-100001", Peril.Theft, 60, 15, 3_200.00m, ClaimStatus.InReview, 1,
                "Bicycle and power tools stolen from a locked garden shed."),
            Seed(4, "POL-100006", Peril.Storm, 250, 248, 2_100.00m, ClaimStatus.Settled, 6,
                "Roof tiles dislodged and a fence panel blown down in high winds."),
            Seed(5, "POL-100006", Peril.AccidentalDamage, 120, 119, 650.00m, ClaimStatus.Settled, 6,
                "Television knocked off its stand while moving furniture; the screen cracked."),
            Seed(6, "POL-100003", Peril.LostBaggage, 5, 4, 780.00m, ClaimStatus.Submitted, 3,
                "Checked suitcase did not arrive at the destination airport and has not been traced."),
            Seed(7, "POL-100002", Peril.Collision, 45, 44, 6_400.00m, ClaimStatus.InReview, 2,
                "Rear-end collision at a roundabout; the bumper, boot lid and parking sensors need replacing."),
            Seed(8, "POL-100004", Peril.EscapeOfWater, 100, 90, 12_500.00m, ClaimStatus.Withdrawn, 4,
                "An overflowing bath leaked through the ceiling into the living room below."),
            Seed(9, "POL-100001", Peril.AccidentalDamage, 3, 2, 240.00m, ClaimStatus.Submitted, 1,
                "Red wine spilled on the living room carpet, leaving a permanent stain."),
            Seed(10, "POL-100006", Peril.EscapeOfWater, 12, 11, 2_400.00m, ClaimStatus.Submitted, 6,
                "The washing machine hose split and flooded the utility room."),
            Seed(11, "POL-100002", Peril.Theft, 6, 5, 12_800.00m, ClaimStatus.Submitted, 2,
                "Car stolen from the driveway overnight; reported to the police the next morning."),
            Seed(12, "POL-100004", Peril.Storm, 150, 40, 900.00m, ClaimStatus.InReview, 4,
                "Storm damage to the conservatory roof, found when the garden furniture was put away."),
        ];

        Claim Seed(
            int sequence,
            string policyNumber,
            Peril peril,
            int incidentDaysAgo,
            int reportedDaysAgo,
            decimal claimedAmount,
            ClaimStatus status,
            int customer,
            string description)
        {
            var reportedDate = today.AddDays(-reportedDaysAgo);
            return new Claim(
                ClaimId: $"CLM-{today.Year}-{sequence:D4}",
                PolicyNumber: policyNumber,
                Peril: peril,
                IncidentDate: today.AddDays(-incidentDaysAgo),
                ReportedDate: reportedDate,
                ClaimedAmount: claimedAmount,
                Description: description,
                ClaimantName: Customer(customer),
                ClaimantEmail: $"customer{customer:D3}@example.com",
                Status: status,
                CreatedAt: new DateTimeOffset(reportedDate.ToDateTime(new TimeOnly(9, 0)), TimeSpan.Zero));
        }
    }

    private static string Customer(int number) => $"Synthetic Customer {number:D3}";
}
