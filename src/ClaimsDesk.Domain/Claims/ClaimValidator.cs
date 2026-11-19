using System.Globalization;
using ClaimsDesk.Domain.Policies;

namespace ClaimsDesk.Domain.Claims;

/// <summary>Validates a new claim against the rulebook (R1-R3).</summary>
public static class ClaimValidator
{
    /// <summary>The longest description accepted, in characters (R3).</summary>
    public const int MaxDescriptionLength = 2000;

    /// <summary>
    /// Validates <paramref name="claim"/> against its policy on <paramref name="today"/>. An unknown policy
    /// (<see langword="null"/>) is reported as POLICY_NOT_FOUND and the checks that need the policy are skipped (R1).
    /// </summary>
    /// <returns>The broken rules, or an empty list when the claim is valid.</returns>
    public static IReadOnlyList<ValidationError> Validate(NewClaim claim, Policy? policy, DateOnly today)
    {
        var errors = new List<ValidationError>();

        // R1 - policy cover
        if (policy is null)
        {
            errors.Add(new ValidationError(
                ErrorCodes.PolicyNotFound, "policyNumber", "No policy was found with this policy number."));
        }
        else if (!policy.CoversIncidentOn(claim.IncidentDate))
        {
            errors.Add(new ValidationError(ErrorCodes.PolicyNotInForce, "incidentDate", NotInForceMessage(policy)));
        }

        // R2 - claimed amount
        if (ClaimedAmountProblem(claim.ClaimedAmount, policy) is { } amountProblem)
        {
            errors.Add(new ValidationError(ErrorCodes.AmountOutOfRange, "claimedAmount", amountProblem));
        }

        // R3 - dates and required details
        if (claim.IncidentDate > today)
        {
            errors.Add(new ValidationError(
                ErrorCodes.InvalidDates, "incidentDate", "The incident date cannot be in the future."));
        }

        if (string.IsNullOrWhiteSpace(claim.Description))
        {
            errors.Add(new ValidationError(
                ErrorCodes.DescriptionRequired, "description", "A description of what happened is required."));
        }
        else if (claim.Description.Length > MaxDescriptionLength)
        {
            errors.Add(new ValidationError(
                ErrorCodes.DescriptionRequired,
                "description",
                $"The description must be {MaxDescriptionLength} characters or fewer."));
        }

        if (string.IsNullOrWhiteSpace(claim.ClaimantName))
        {
            errors.Add(new ValidationError(
                ErrorCodes.ClaimantDetailsRequired, "claimantName", "The claimant's name is required."));
        }

        if (!claim.ClaimantEmail.Contains('@'))
        {
            errors.Add(new ValidationError(
                ErrorCodes.ClaimantDetailsRequired, "claimantEmail", "A valid email address for the claimant is required."));
        }

        return errors;
    }

    private static string NotInForceMessage(Policy policy) =>
        policy.Status == PolicyStatus.Cancelled
            ? "The policy is cancelled, so it does not cover this incident."
            : $"The incident date is outside the policy's cover period ({FormatDate(policy.StartDate)} to {FormatDate(policy.EndDate)}).";

    private static string? ClaimedAmountProblem(decimal amount, Policy? policy)
    {
        if (amount <= 0m)
        {
            return "The claimed amount must be more than £0.00.";
        }

        if (!Money.HasAtMostTwoDecimalPlaces(amount))
        {
            return "The claimed amount must be in pounds and pence, with no more than two decimal places.";
        }

        if (policy is not null && amount > policy.CoverLimit)
        {
            return $"The claimed amount must not be more than the policy's cover limit of {Money.FormatGbp(policy.CoverLimit)}.";
        }

        return null;
    }

    private static string FormatDate(DateOnly date) =>
        date.ToString("d MMM yyyy", CultureInfo.GetCultureInfo("en-GB"));
}
