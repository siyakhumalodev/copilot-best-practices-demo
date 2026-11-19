using ClaimsDesk.Domain.Claims;
using Microsoft.AspNetCore.Http.HttpResults;

namespace ClaimsDesk.Api.Infrastructure;

/// <summary>
/// RFC 9457 problem details with a machine-readable <c>code</c> extension, so clients never have to parse messages.
/// </summary>
public static class ProblemResults
{
    /// <summary>400 with <c>code</c> VALIDATION_FAILED and the broken rules in <c>errors</c> (<c>code</c>, <c>field</c>, <c>message</c>).</summary>
    public static ProblemHttpResult Validation(IReadOnlyList<ValidationError> errors) =>
        TypedResults.Problem(
            title: "Claim validation failed",
            statusCode: StatusCodes.Status400BadRequest,
            extensions: new Dictionary<string, object?>
            {
                ["code"] = ErrorCodes.ValidationFailed,
                ["errors"] = errors,
            });

    /// <summary>404 with a <c>code</c>, for example CLAIM_NOT_FOUND.</summary>
    public static ProblemHttpResult NotFound(string code, string detail) =>
        WithCode(StatusCodes.Status404NotFound, code, detail);

    /// <summary>409 with a <c>code</c>, for a request the claim's current state does not allow (R8).</summary>
    public static ProblemHttpResult Conflict(string code, string detail) =>
        WithCode(StatusCodes.Status409Conflict, code, detail);

    private static ProblemHttpResult WithCode(int statusCode, string code, string detail) =>
        TypedResults.Problem(
            detail: detail,
            statusCode: statusCode,
            extensions: new Dictionary<string, object?> { ["code"] = code });
}
