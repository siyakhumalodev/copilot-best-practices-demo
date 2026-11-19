using System.Globalization;

namespace ClaimsDesk.Domain.Tests;

public class MoneyTests
{
    [Theory]
    [Trait("Rule", "R2")]
    [InlineData("0")]
    [InlineData("1")]
    [InlineData("1.5")]
    [InlineData("1850.00")]
    [InlineData("1850.000")]
    public void HasAtMostTwoDecimalPlaces_WholePence_ReturnsTrue(string amount)
    {
        Assert.True(Money.HasAtMostTwoDecimalPlaces(Parse(amount)));
    }

    [Theory]
    [Trait("Rule", "R2")]
    [InlineData("0.001")]
    [InlineData("10.005")]
    [InlineData("-1.999")]
    public void HasAtMostTwoDecimalPlaces_FractionOfAPenny_ReturnsFalse(string amount)
    {
        Assert.False(Money.HasAtMostTwoDecimalPlaces(Parse(amount)));
    }

    [Theory]
    [InlineData("2.345", "2.35")]
    [InlineData("2.344", "2.34")]
    [InlineData("-2.345", "-2.35")]
    [InlineData("0.005", "0.01")]
    [InlineData("1350", "1350.00")]
    public void RoundGbp_Amount_RoundsToWholePenceWithMidpointAwayFromZero(string amount, string expected)
    {
        Assert.Equal(Parse(expected), Money.RoundGbp(Parse(amount)));
    }

    [Theory]
    [InlineData("250000", "£250,000.00")]
    [InlineData("1350.5", "£1,350.50")]
    [InlineData("0", "£0.00")]
    public void FormatGbp_Amount_ReturnsUkCurrencyText(string amount, string expected)
    {
        Assert.Equal(expected, Money.FormatGbp(Parse(amount)));
    }

    private static decimal Parse(string value) => decimal.Parse(value, CultureInfo.InvariantCulture);
}
