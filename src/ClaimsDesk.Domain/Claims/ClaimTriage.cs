using ClaimsDesk.Domain.Policies;

namespace ClaimsDesk.Domain.Claims;

/// <summary>R5-R7: evaluates current facts without changing or persisting lifecycle state.</summary>
public static class ClaimTriage
{
    public static Triage Evaluate(Claim claim, Policy policy, IEnumerable<Claim> history, decimal fastTrackMaxAmount)
    {
        // R5: inclusive incident-date window; policy and claim identities are case-insensitive.
        var priorCount = history.Count(candidate =>
            !string.Equals(candidate.ClaimId, claim.ClaimId, StringComparison.OrdinalIgnoreCase)
            && string.Equals(candidate.PolicyNumber, claim.PolicyNumber, StringComparison.OrdinalIgnoreCase)
            && candidate.Status is not (ClaimStatus.Withdrawn or ClaimStatus.Rejected)
            && candidate.IncidentDate <= claim.IncidentDate
            && claim.IncidentDate.DayNumber - candidate.IncidentDate.DayNumber <= 365);
        var reportDelay = claim.ReportedDate.DayNumber - claim.IncidentDate.DayNumber;
        var reasons = new List<TriageReason>();

        // R6: all applicable referral reasons, taking precedence over R5/R7.
        if (reportDelay > 90)
            reasons.Add(new(TriageReasonCodes.VeryLateNotification, "Reported more than 90 days after the incident"));
        if (claim.IncidentDate.DayNumber - policy.StartDate.DayNumber < 14)
            reasons.Add(new(TriageReasonCodes.NewPolicy, "Incident within the first 14 days of cover"));
        if (claim.ClaimedAmount > policy.CoverLimit * 0.8m)
            reasons.Add(new(TriageReasonCodes.HighValueForCover, "Claimed amount is more than 80% of the cover limit"));
        if (priorCount >= 3)
            reasons.Add(new(TriageReasonCodes.FrequentClaims, "3 or more prior claims in the last 12 months"));
        if (reasons.Count > 0)
            return new(TriageOutcome.Referred, reasons);

        // R7: every failed fast-track condition, using the same effective limit for comparison and display.
        if (claim.ClaimedAmount > fastTrackMaxAmount)
            reasons.Add(new(TriageReasonCodes.AboveFastTrackLimit,
                $"Claimed amount is above the fast-track limit of {Money.FormatGbp(fastTrackMaxAmount)}"));
        if (reportDelay > 30)
            reasons.Add(new(TriageReasonCodes.LateNotification, "Reported more than 30 days after the incident"));
        if (priorCount >= 2)
            reasons.Add(new(TriageReasonCodes.PriorClaims, "2 or more prior claims in the last 12 months"));
        if (reasons.Count > 0)
            return new(TriageOutcome.StandardReview, reasons);

        return new(TriageOutcome.FastTrack,
            [new(TriageReasonCodes.FastTrackEligible, "Meets all fast-track criteria")]);
    }
}
