namespace ClaimsDesk.Domain.Claims;

/// <summary>A rule that a submitted claim breaks.</summary>
/// <param name="Code">A stable code from <see cref="ErrorCodes"/>, for example <c>AMOUNT_OUT_OF_RANGE</c>.</param>
/// <param name="Field">The camelCase JSON field the error belongs to, for example <c>claimedAmount</c>.</param>
/// <param name="Message">A plain-English message. Never contains personal data (R9).</param>
public sealed record ValidationError(string Code, string Field, string Message);
