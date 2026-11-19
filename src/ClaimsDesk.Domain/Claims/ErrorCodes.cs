namespace ClaimsDesk.Domain.Claims;

/// <summary>Stable, machine-readable error codes for problem details (<c>code</c>) and validation errors.</summary>
public static class ErrorCodes
{
    public const string PolicyNotFound = "POLICY_NOT_FOUND";
    public const string PolicyNotInForce = "POLICY_NOT_IN_FORCE";
    public const string InvalidDates = "INVALID_DATES";
    public const string AmountOutOfRange = "AMOUNT_OUT_OF_RANGE";
    public const string FieldRequired = "FIELD_REQUIRED";
    public const string DescriptionRequired = "DESCRIPTION_REQUIRED";
    public const string ClaimantDetailsRequired = "CLAIMANT_DETAILS_REQUIRED";
    public const string ClaimNotFound = "CLAIM_NOT_FOUND";
    public const string ValidationFailed = "VALIDATION_FAILED";
}
