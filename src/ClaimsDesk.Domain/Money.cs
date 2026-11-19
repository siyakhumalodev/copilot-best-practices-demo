using System.Globalization;

namespace ClaimsDesk.Domain;

/// <summary>Helpers for GBP amounts. Money is always <see cref="decimal"/>, never <see cref="double"/>.</summary>
public static class Money
{
    /// <summary>Returns <see langword="true"/> when the amount is a whole number of pence (at most two decimal places).</summary>
    public static bool HasAtMostTwoDecimalPlaces(decimal amount) => decimal.Round(amount, 2) == amount;

    /// <summary>Rounds an amount to whole pence; a half penny rounds away from zero.</summary>
    public static decimal RoundGbp(decimal amount) => decimal.Round(amount, 2, MidpointRounding.AwayFromZero);

    /// <summary>Formats an amount for people, for example <c>£250,000.00</c>.</summary>
    public static string FormatGbp(decimal amount) => amount.ToString("C2", CultureInfo.GetCultureInfo("en-GB"));
}
