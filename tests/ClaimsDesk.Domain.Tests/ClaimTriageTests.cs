using ClaimsDesk.Domain.Claims;

namespace ClaimsDesk.Domain.Tests;

public class ClaimTriageTests
{
    [Theory]
    [Trait("Rule", "R5")]
    [Trait("Rule", "R7")]
    [InlineData("2500.00", "2500.00", TriageOutcome.FastTrack)]
    [InlineData("2500.01", "2500.00", TriageOutcome.StandardReview)]
    [InlineData("3000.00", "3000.00", TriageOutcome.FastTrack)]
    [InlineData("3000.01", "3000.00", TriageOutcome.StandardReview)]
    public void Evaluate_AmountAtOrAboveEffectiveLimit_UsesInclusiveLimitAndFormattedMessage(
        string amount, string limit, TriageOutcome expected)
    {
        var effectiveLimit = Parse(limit);
        var claim = TestData.CreateClaim() with { ClaimedAmount = Parse(amount) };

        var result = ClaimTriage.Evaluate(claim, TestData.CreatePolicy(), [], effectiveLimit);

        Assert.Equal(expected, result.Outcome);
        var reason = Assert.Single(result.Reasons);
        Assert.Equal(expected == TriageOutcome.FastTrack ? TriageReasonCodes.FastTrackEligible
            : TriageReasonCodes.AboveFastTrackLimit, reason.Code);
        Assert.Equal(expected == TriageOutcome.FastTrack ? "Meets all fast-track criteria"
            : $"Claimed amount is above the fast-track limit of {Money.FormatGbp(effectiveLimit)}", reason.Message);
    }

    [Theory]
    [Trait("Rule", "R5")]
    [Trait("Rule", "R6")]
    [Trait("Rule", "R7")]
    [InlineData(0, TriageOutcome.FastTrack, TriageReasonCodes.FastTrackEligible)]
    [InlineData(30, TriageOutcome.FastTrack, TriageReasonCodes.FastTrackEligible)]
    [InlineData(31, TriageOutcome.StandardReview, TriageReasonCodes.LateNotification)]
    [InlineData(90, TriageOutcome.StandardReview, TriageReasonCodes.LateNotification)]
    [InlineData(91, TriageOutcome.Referred, TriageReasonCodes.VeryLateNotification)]
    public void Evaluate_ReportDelayBoundary_ReturnsExpectedOutcomeAndOnlyReason(
        int delay, TriageOutcome outcome, string code)
    {
        var claim = TestData.CreateClaim();
        claim = claim with { ReportedDate = claim.IncidentDate.AddDays(delay) };

        var result = ClaimTriage.Evaluate(claim, TestData.CreatePolicy(), [], 2500m);

        Assert.Equal(outcome, result.Outcome);
        Assert.Equal(code, Assert.Single(result.Reasons).Code);
    }

    [Theory]
    [Trait("Rule", "R6")]
    [InlineData(0, TriageOutcome.Referred)]
    [InlineData(13, TriageOutcome.Referred)]
    [InlineData(14, TriageOutcome.FastTrack)]
    public void Evaluate_PolicyStartOffset_RefersOnlyBeforeDay14(int offset, TriageOutcome outcome)
    {
        var claim = TestData.CreateClaim();
        var policy = TestData.CreatePolicy() with { StartDate = claim.IncidentDate.AddDays(-offset) };

        var result = ClaimTriage.Evaluate(claim, policy, [], 2500m);

        Assert.Equal(outcome, result.Outcome);
        Assert.Equal(outcome == TriageOutcome.Referred ? TriageReasonCodes.NewPolicy
            : TriageReasonCodes.FastTrackEligible, Assert.Single(result.Reasons).Code);
    }

    [Theory]
    [Trait("Rule", "R6")]
    [InlineData("8000.00", TriageOutcome.StandardReview, TriageReasonCodes.AboveFastTrackLimit)]
    [InlineData("8000.01", TriageOutcome.Referred, TriageReasonCodes.HighValueForCover)]
    public void Evaluate_CoverRatioBoundary_RefersOnlyStrictlyAbove80Percent(
        string amount, TriageOutcome outcome, string code)
    {
        var result = ClaimTriage.Evaluate(TestData.CreateClaim() with { ClaimedAmount = Parse(amount) },
            TestData.CreatePolicy(), [], 2500m);

        Assert.Equal(outcome, result.Outcome);
        Assert.Equal(code, Assert.Single(result.Reasons).Code);
    }

    [Theory]
    [Trait("Rule", "R5")]
    [Trait("Rule", "R6")]
    [Trait("Rule", "R7")]
    [InlineData(0, TriageOutcome.FastTrack, TriageReasonCodes.FastTrackEligible)]
    [InlineData(1, TriageOutcome.FastTrack, TriageReasonCodes.FastTrackEligible)]
    [InlineData(2, TriageOutcome.StandardReview, TriageReasonCodes.PriorClaims)]
    [InlineData(3, TriageOutcome.Referred, TriageReasonCodes.FrequentClaims)]
    [InlineData(4, TriageOutcome.Referred, TriageReasonCodes.FrequentClaims)]
    public void Evaluate_PriorCountBoundary_ReturnsExpectedOutcome(int count, TriageOutcome outcome, string code)
    {
        var claim = TestData.CreateClaim();
        var result = ClaimTriage.Evaluate(claim, TestData.CreatePolicy(), History(claim, count), 2500m);

        Assert.Equal(outcome, result.Outcome);
        Assert.Equal(code, Assert.Single(result.Reasons).Code);
    }

    [Theory]
    [Trait("Rule", "R5")]
    [InlineData(ClaimStatus.Submitted, true)]
    [InlineData(ClaimStatus.InReview, true)]
    [InlineData(ClaimStatus.Approved, true)]
    [InlineData(ClaimStatus.Settled, true)]
    [InlineData(ClaimStatus.Withdrawn, false)]
    [InlineData(ClaimStatus.Rejected, false)]
    public void Evaluate_HistoryStatus_CountsOnlyQualifyingStatuses(ClaimStatus status, bool qualifies)
    {
        var claim = TestData.CreateClaim();
        Claim[] history = [.. History(claim, 1), claim with { ClaimId = "candidate", Status = status }];

        var result = ClaimTriage.Evaluate(claim, TestData.CreatePolicy(), history, 2500m);

        Assert.Equal(qualifies ? TriageOutcome.StandardReview : TriageOutcome.FastTrack, result.Outcome);
    }

    [Theory]
    [Trait("Rule", "R5")]
    [InlineData(-366, false)]
    [InlineData(-365, true)]
    [InlineData(-364, true)]
    [InlineData(0, true)]
    [InlineData(1, false)]
    public void Evaluate_IncidentWindowAcrossLeapYear_UsesInclusive365Days(int offset, bool qualifies)
    {
        var claim = TestData.CreateClaim() with
        {
            IncidentDate = new DateOnly(2024, 3, 1),
            ReportedDate = new DateOnly(2024, 3, 2)
        };
        var policy = TestData.CreatePolicy() with { StartDate = new DateOnly(2022, 1, 1) };
        // Reported/created dates deliberately disagree with the incident window.
        var candidate = claim with
        {
            ClaimId = "candidate",
            IncidentDate = claim.IncidentDate.AddDays(offset),
            ReportedDate = claim.IncidentDate.AddDays(100),
            CreatedAt = claim.CreatedAt.AddYears(1)
        };

        var result = ClaimTriage.Evaluate(claim, policy, [.. History(claim, 1), candidate], 2500m);

        Assert.Equal(qualifies ? TriageOutcome.StandardReview : TriageOutcome.FastTrack, result.Outcome);
    }

    [Theory]
    [Trait("Rule", "R5")]
    [InlineData("other", "pol-900001", true)]
    [InlineData("other", "POL-OTHER", false)]
    [InlineData("CLM-2026-0901", "POL-900001", false)]
    [InlineData("clm-2026-0901", "POL-900001", false)]
    public void Evaluate_HistoryIdentity_RespectsCaseInsensitivePolicyAndExcludesSelf(
        string candidateId, string policyNumber, bool qualifies)
    {
        var claim = TestData.CreateClaim();
        var candidate = claim with { ClaimId = candidateId, PolicyNumber = policyNumber };

        var result = ClaimTriage.Evaluate(claim, TestData.CreatePolicy(), [.. History(claim, 1), candidate], 2500m);

        Assert.Equal(qualifies ? TriageOutcome.StandardReview : TriageOutcome.FastTrack, result.Outcome);
    }

    [Fact]
    [Trait("Rule", "R6")]
    [Trait("Rule", "R7")]
    public void Evaluate_AllReferralAndStandardIndicators_ReturnsEveryReferralReasonOnly()
    {
        var claim = TestData.CreateClaim() with { ClaimedAmount = 8000.01m };
        claim = claim with { ReportedDate = claim.IncidentDate.AddDays(91) };
        var policy = TestData.CreatePolicy() with { StartDate = claim.IncidentDate };

        var result = ClaimTriage.Evaluate(claim, policy, History(claim, 3), 2500m);

        Assert.Equal(TriageOutcome.Referred, result.Outcome);
        AssertCodes(result, TriageReasonCodes.VeryLateNotification, TriageReasonCodes.NewPolicy,
            TriageReasonCodes.HighValueForCover, TriageReasonCodes.FrequentClaims);
    }

    [Fact]
    [Trait("Rule", "R7")]
    public void Evaluate_AllStandardFailures_ReturnsEveryFailureReason()
    {
        var claim = TestData.CreateClaim() with { ClaimedAmount = 3000m };
        claim = claim with { ReportedDate = claim.IncidentDate.AddDays(31) };

        var result = ClaimTriage.Evaluate(claim, TestData.CreatePolicy(), History(claim, 2), 2500m);

        Assert.Equal(TriageOutcome.StandardReview, result.Outcome);
        AssertCodes(result, TriageReasonCodes.AboveFastTrackLimit, TriageReasonCodes.LateNotification,
            TriageReasonCodes.PriorClaims);
    }

    [Theory]
    [Trait("Rule", "R5")]
    [InlineData(ClaimStatus.Settled)]
    [InlineData(ClaimStatus.Rejected)]
    [InlineData(ClaimStatus.Withdrawn)]
    public void Evaluate_ClosedTarget_StillComputesTriage(ClaimStatus status)
    {
        var result = ClaimTriage.Evaluate(TestData.CreateClaim() with { Status = status },
            TestData.CreatePolicy(), [], 2500m);

        Assert.Equal(TriageOutcome.FastTrack, result.Outcome);
    }

    private static IEnumerable<Claim> History(Claim target, int count) =>
        Enumerable.Range(1, count).Select(i => target with
        {
            ClaimId = $"prior-{i}", IncidentDate = target.IncidentDate.AddDays(-i)
        });

    private static decimal Parse(string value) =>
        decimal.Parse(value, System.Globalization.CultureInfo.InvariantCulture);

    private static void AssertCodes(Triage result, params string[] expected) =>
        Assert.Equal(expected.Order(StringComparer.Ordinal),
            result.Reasons.Select(reason => reason.Code).Order(StringComparer.Ordinal));
}
