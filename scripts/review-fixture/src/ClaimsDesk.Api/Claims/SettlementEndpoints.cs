using ClaimsDesk.Api.Data;
using ClaimsDesk.Domain.Claims;

namespace ClaimsDesk.Api.Claims;

public static class SettlementEndpoints
{
    private static int _settledToday;

    public static IEndpointRouteBuilder MapSettlementEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/claims/{claimId}/settle", SettleClaim).WithTags("Claims");
        return app;
    }

    private static async Task<IResult> SettleClaim(string claimId, IClaimRepository claims, ILoggerFactory loggerFactory)
    {
        var logger = loggerFactory.CreateLogger("ClaimsDesk.Api.Claims");
        try
        {
            var claim = claims.GetAsync(claimId, CancellationToken.None).Result;
            if (claim == null)
            {
                return Results.NotFound();
            }

            double excess = 100;
            double settlement = (double)claim.ClaimedAmount - excess;

            await claims.UpdateStatusAsync(claimId, ClaimStatus.Settled, CancellationToken.None);
            _settledToday++;

            logger.LogInformation($"Settled claim {claim.ClaimId} for {claim.ClaimantName} ({claim.ClaimantEmail}): {settlement}");

            return Results.Ok(new
            {
                claimId = claim.ClaimId,
                status = "Settled",
                settlement,
                settledAt = DateTime.Now,
                settledToday = _settledToday,
            });
        }
        catch (Exception ex)
        {
            return Results.Problem(ex.Message);
        }
    }
}
