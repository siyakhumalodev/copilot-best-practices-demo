using System.Globalization;
using ClaimsDesk.Domain.Claims;
using ClaimsDesk.Domain.Policies;

namespace ClaimsDesk.Domain.Tests;

public class ClaimValidatorTests
{
    [Fact]
    [Trait("Rule", "R1")]
    [Trait("Rule", "R2")]
    [Trait("Rule", "R3")]
    public void Validate_ValidClaim_ReturnsNoErrors()
    {
        var errors = ClaimValidator.Validate(TestData.CreateNewClaim(), TestData.CreatePolicy(), TestData.Today);

        Assert.Empty(errors);
    }

    // R1 - policy cover

    [Fact]
    [Trait("Rule", "R1")]
    public void Validate_UnknownPolicy_ReturnsPolicyNotFoundOnly()
    {
        // The amount is above any cover limit: the checks that need the policy are skipped.
        var claim = TestData.CreateNewClaim() with { ClaimedAmount = 999_999.00m };

        var errors = ClaimValidator.Validate(claim, policy: null, TestData.Today);

        AssertSingleError(errors, ErrorCodes.PolicyNotFound, "policyNumber");
    }

    [Fact]
    [Trait("Rule", "R1")]
    public void Validate_IncidentOnPolicyStartDate_ReturnsNoErrors()
    {
        var policy = TestData.CreatePolicy();
        var claim = TestData.CreateNewClaim() with { IncidentDate = policy.StartDate };

        Assert.Empty(ClaimValidator.Validate(claim, policy, TestData.Today));
    }

    [Fact]
    [Trait("Rule", "R1")]
    public void Validate_IncidentDayBeforePolicyStart_ReturnsPolicyNotInForce()
    {
        var policy = TestData.CreatePolicy();
        var claim = TestData.CreateNewClaim() with { IncidentDate = policy.StartDate.AddDays(-1) };

        var errors = ClaimValidator.Validate(claim, policy, TestData.Today);

        AssertSingleError(errors, ErrorCodes.PolicyNotInForce, "incidentDate");
    }

    [Fact]
    [Trait("Rule", "R1")]
    public void Validate_IncidentOnPolicyEndDate_ReturnsNoErrors()
    {
        var policy = EndedPolicy();
        var claim = TestData.CreateNewClaim() with { IncidentDate = policy.EndDate };

        Assert.Empty(ClaimValidator.Validate(claim, policy, TestData.Today));
    }

    [Fact]
    [Trait("Rule", "R1")]
    public void Validate_IncidentDayAfterPolicyEnd_ReturnsPolicyNotInForce()
    {
        var policy = EndedPolicy();
        var claim = TestData.CreateNewClaim() with { IncidentDate = policy.EndDate.AddDays(1) };

        var errors = ClaimValidator.Validate(claim, policy, TestData.Today);

        AssertSingleError(errors, ErrorCodes.PolicyNotInForce, "incidentDate");
    }

    [Fact]
    [Trait("Rule", "R1")]
    public void Validate_CancelledPolicy_ReturnsPolicyNotInForce()
    {
        var policy = TestData.CreatePolicy() with { Status = PolicyStatus.Cancelled };

        var errors = ClaimValidator.Validate(TestData.CreateNewClaim(), policy, TestData.Today);

        AssertSingleError(errors, ErrorCodes.PolicyNotInForce, "incidentDate");
    }

    [Fact]
    [Trait("Rule", "R1")]
    public void Validate_LapsedPolicyCoveringIncidentDate_ReturnsNoErrors()
    {
        var policy = EndedPolicy();
        var claim = TestData.CreateNewClaim() with { IncidentDate = policy.EndDate.AddDays(-10) };

        Assert.Empty(ClaimValidator.Validate(claim, policy, TestData.Today));
    }

    // R2 - claimed amount

    [Fact]
    [Trait("Rule", "R2")]
    public void Validate_AmountExactlyAtCoverLimit_ReturnsNoErrors()
    {
        var policy = TestData.CreatePolicy();
        var claim = TestData.CreateNewClaim() with { ClaimedAmount = policy.CoverLimit };

        Assert.Empty(ClaimValidator.Validate(claim, policy, TestData.Today));
    }

    [Fact]
    [Trait("Rule", "R2")]
    public void Validate_AmountOnePennyOverCoverLimit_ReturnsAmountOutOfRange()
    {
        var policy = TestData.CreatePolicy();
        var claim = TestData.CreateNewClaim() with { ClaimedAmount = policy.CoverLimit + 0.01m };

        var errors = ClaimValidator.Validate(claim, policy, TestData.Today);

        var error = AssertSingleError(errors, ErrorCodes.AmountOutOfRange, "claimedAmount");
        Assert.Contains("£10,000.00", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    [Trait("Rule", "R2")]
    public void Validate_SmallestAmount_ReturnsNoErrors()
    {
        var claim = TestData.CreateNewClaim() with { ClaimedAmount = 0.01m };

        Assert.Empty(ClaimValidator.Validate(claim, TestData.CreatePolicy(), TestData.Today));
    }

    [Theory]
    [Trait("Rule", "R2")]
    [InlineData("0")]
    [InlineData("0.00")]
    [InlineData("-10.00")]
    public void Validate_ZeroOrNegativeAmount_ReturnsAmountOutOfRange(string amount)
    {
        var claim = TestData.CreateNewClaim() with { ClaimedAmount = decimal.Parse(amount, CultureInfo.InvariantCulture) };

        var errors = ClaimValidator.Validate(claim, TestData.CreatePolicy(), TestData.Today);

        AssertSingleError(errors, ErrorCodes.AmountOutOfRange, "claimedAmount");
    }

    [Fact]
    [Trait("Rule", "R2")]
    public void Validate_AmountWithThreeDecimalPlaces_ReturnsAmountOutOfRange()
    {
        var claim = TestData.CreateNewClaim() with { ClaimedAmount = 100.005m };

        var errors = ClaimValidator.Validate(claim, TestData.CreatePolicy(), TestData.Today);

        AssertSingleError(errors, ErrorCodes.AmountOutOfRange, "claimedAmount");
    }

    // R3 - dates and required details

    [Fact]
    [Trait("Rule", "R3")]
    public void Validate_IncidentToday_ReturnsNoErrors()
    {
        var claim = TestData.CreateNewClaim() with { IncidentDate = TestData.Today };

        Assert.Empty(ClaimValidator.Validate(claim, TestData.CreatePolicy(), TestData.Today));
    }

    [Fact]
    [Trait("Rule", "R3")]
    public void Validate_IncidentTomorrow_ReturnsInvalidDates()
    {
        var claim = TestData.CreateNewClaim() with { IncidentDate = TestData.Today.AddDays(1) };

        var errors = ClaimValidator.Validate(claim, TestData.CreatePolicy(), TestData.Today);

        AssertSingleError(errors, ErrorCodes.InvalidDates, "incidentDate");
    }

    [Fact]
    [Trait("Rule", "R3")]
    public void Validate_Description2000Characters_ReturnsNoErrors()
    {
        var claim = TestData.CreateNewClaim() with { Description = new string('a', ClaimValidator.MaxDescriptionLength) };

        Assert.Empty(ClaimValidator.Validate(claim, TestData.CreatePolicy(), TestData.Today));
    }

    [Fact]
    [Trait("Rule", "R3")]
    public void Validate_Description2001Characters_ReturnsDescriptionRequired()
    {
        var claim = TestData.CreateNewClaim() with { Description = new string('a', ClaimValidator.MaxDescriptionLength + 1) };

        var errors = ClaimValidator.Validate(claim, TestData.CreatePolicy(), TestData.Today);

        AssertSingleError(errors, ErrorCodes.DescriptionRequired, "description");
    }

    [Theory]
    [Trait("Rule", "R3")]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_BlankDescription_ReturnsDescriptionRequired(string description)
    {
        var claim = TestData.CreateNewClaim() with { Description = description };

        var errors = ClaimValidator.Validate(claim, TestData.CreatePolicy(), TestData.Today);

        AssertSingleError(errors, ErrorCodes.DescriptionRequired, "description");
    }

    [Theory]
    [Trait("Rule", "R3")]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_BlankClaimantName_ReturnsClaimantDetailsRequired(string claimantName)
    {
        var claim = TestData.CreateNewClaim() with { ClaimantName = claimantName };

        var errors = ClaimValidator.Validate(claim, TestData.CreatePolicy(), TestData.Today);

        AssertSingleError(errors, ErrorCodes.ClaimantDetailsRequired, "claimantName");
    }

    [Theory]
    [Trait("Rule", "R3")]
    [InlineData("customer901.example.com")]
    [InlineData("")]
    public void Validate_EmailWithoutAtSign_ReturnsClaimantDetailsRequired(string claimantEmail)
    {
        var claim = TestData.CreateNewClaim() with { ClaimantEmail = claimantEmail };

        var errors = ClaimValidator.Validate(claim, TestData.CreatePolicy(), TestData.Today);

        AssertSingleError(errors, ErrorCodes.ClaimantDetailsRequired, "claimantEmail");
    }

    // R9 - personal data

    [Fact]
    [Trait("Rule", "R9")]
    public void Validate_InvalidClaim_MessagesNeverContainClaimantDetails()
    {
        var claim = TestData.CreateNewClaim() with
        {
            ClaimantName = "Synthetic Customer 901",
            ClaimantEmail = "customer901-at-example.com",
            ClaimedAmount = -1.00m,
            IncidentDate = TestData.Today.AddDays(1),
            Description = "",
        };

        var errors = ClaimValidator.Validate(claim, TestData.CreatePolicy(), TestData.Today);

        Assert.NotEmpty(errors);
        Assert.All(errors, error =>
        {
            Assert.DoesNotContain(claim.ClaimantName, error.Message, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(claim.ClaimantEmail, error.Message, StringComparison.OrdinalIgnoreCase);
        });
    }

    // A lapsed policy that ended 30 days ago, after a year of cover.
    private static Policy EndedPolicy() => TestData.CreatePolicy() with
    {
        StartDate = TestData.Today.AddDays(-395),
        EndDate = TestData.Today.AddDays(-30),
        Status = PolicyStatus.Lapsed,
    };

    private static ValidationError AssertSingleError(IReadOnlyList<ValidationError> errors, string code, string field)
    {
        var error = Assert.Single(errors);
        Assert.Equal(code, error.Code);
        Assert.Equal(field, error.Field);
        return error;
    }
}
