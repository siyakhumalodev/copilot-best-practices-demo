namespace ClaimsDesk.Domain.Claims;

public enum TriageOutcome
{
    FastTrack,
    StandardReview,
    Referred
}

public sealed record TriageReason(string Code, string Message);

public sealed record Triage(TriageOutcome Outcome, IReadOnlyList<TriageReason> Reasons);

public static class TriageReasonCodes
{
    public const string FastTrackEligible = "FAST_TRACK_ELIGIBLE";
    public const string AboveFastTrackLimit = "ABOVE_FAST_TRACK_LIMIT";
    public const string LateNotification = "LATE_NOTIFICATION";
    public const string PriorClaims = "PRIOR_CLAIMS";
    public const string VeryLateNotification = "VERY_LATE_NOTIFICATION";
    public const string NewPolicy = "NEW_POLICY";
    public const string HighValueForCover = "HIGH_VALUE_FOR_COVER";
    public const string FrequentClaims = "FREQUENT_CLAIMS";
}
