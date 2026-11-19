using ClaimsDesk.Domain.Claims;

namespace ClaimsDesk.Api.Tests;

/// <summary>The parts of an RFC 9457 problem details body that the tests assert on.</summary>
public sealed record ProblemResponse(
    int Status,
    string? Title,
    string? Detail,
    string? Code,
    IReadOnlyList<ValidationError>? Errors);
