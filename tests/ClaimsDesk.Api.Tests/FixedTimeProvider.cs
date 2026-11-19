namespace ClaimsDesk.Api.Tests;

/// <summary>A clock that always returns the same instant, so tests never depend on the real date.</summary>
public sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => utcNow;
}
