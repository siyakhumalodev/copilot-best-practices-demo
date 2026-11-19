using ClaimsDesk.Domain.Claims;

namespace ClaimsDesk.Domain.Tests;

public class ClaimTests
{
    [Theory]
    [Trait("Rule", "R8")]
    [InlineData(ClaimStatus.Submitted)]
    [InlineData(ClaimStatus.InReview)]
    [InlineData(ClaimStatus.Approved)]
    public void IsOpen_OpenStatus_ReturnsTrue(ClaimStatus status)
    {
        var claim = TestData.CreateClaim() with { Status = status };

        Assert.True(claim.IsOpen);
    }

    [Theory]
    [Trait("Rule", "R8")]
    [InlineData(ClaimStatus.Rejected)]
    [InlineData(ClaimStatus.Settled)]
    [InlineData(ClaimStatus.Withdrawn)]
    public void IsOpen_ClosedStatus_ReturnsFalse(ClaimStatus status)
    {
        var claim = TestData.CreateClaim() with { Status = status };

        Assert.False(claim.IsOpen);
    }
}
