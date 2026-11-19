using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ClaimsDesk.Api.Claims;
using ClaimsDesk.Api.Data;
using ClaimsDesk.Domain.Claims;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace ClaimsDesk.Api.Tests;

public class ClaimTriageApiTests
{
    [Theory]
    [Trait("Rule", "R5")]
    [Trait("Rule", "R6")]
    [Trait("Rule", "R7")]
    [InlineData("0001", TriageOutcome.FastTrack, TriageReasonCodes.FastTrackEligible)]
    [InlineData("0003", TriageOutcome.StandardReview, TriageReasonCodes.AboveFastTrackLimit, TriageReasonCodes.LateNotification)]
    [InlineData("0006", TriageOutcome.Referred, TriageReasonCodes.NewPolicy)]
    [InlineData("0009", TriageOutcome.StandardReview, TriageReasonCodes.PriorClaims)]
    [InlineData("0010", TriageOutcome.StandardReview, TriageReasonCodes.PriorClaims)]
    [InlineData("0011", TriageOutcome.Referred, TriageReasonCodes.HighValueForCover)]
    [InlineData("0012", TriageOutcome.Referred, TriageReasonCodes.VeryLateNotification)]
    public async Task GetClaim_SeededDetail_ReturnsExpectedTriageAndExactMessages(
        string suffix, TriageOutcome outcome, params string[] codes)
    {
        await using var factory = new ClaimsDeskApiFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/claims/CLM-2026-{suffix}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var claim = await response.Content.ReadFromJsonAsync<ClaimResponse>(TestJson.Options);
        Assert.NotNull(claim);
        Assert.Equal(outcome, claim.Triage.Outcome);
        AssertCodes(claim.Triage, codes);
        Assert.All(claim.Triage.Reasons, reason => Assert.Equal(ExpectedMessage(reason.Code), reason.Message));
    }

    [Theory]
    [Trait("Rule", "R5")]
    [Trait("Rule", "R7")]
    [InlineData(null, "2500.00", TriageOutcome.FastTrack)]
    [InlineData(null, "2500.01", TriageOutcome.StandardReview)]
    [InlineData("3000.00", "3000.00", TriageOutcome.FastTrack)]
    [InlineData("3000.00", "3000.01", TriageOutcome.StandardReview)]
    public async Task SubmitClaim_ConfiguredOrAbsentLimit_GetAndPostUseSameEffectiveLimit(
        string? configuredLimit, string amount, TriageOutcome outcome)
    {
        await using var factory = CreateConfiguredFactory(configuredLimit);
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/claims", ValidRequest() with
        {
            ClaimedAmount = decimal.Parse(amount, System.Globalization.CultureInfo.InvariantCulture)
        },
            TestJson.Options);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("/api/claims/CLM-2026-0001", response.Headers.Location?.OriginalString);
        var created = await response.Content.ReadFromJsonAsync<ClaimResponse>(TestJson.Options);
        Assert.NotNull(created);
        Assert.Equal(ClaimStatus.Submitted, created.Status);
        Assert.Equal(ClaimsDeskApiFactory.Today, created.ReportedDate);
        Assert.Equal(outcome, created.Triage.Outcome);
        var reason = Assert.Single(created.Triage.Reasons);
        Assert.Equal(outcome == TriageOutcome.FastTrack ? TriageReasonCodes.FastTrackEligible
            : TriageReasonCodes.AboveFastTrackLimit, reason.Code);
        Assert.Equal(outcome == TriageOutcome.FastTrack ? "Meets all fast-track criteria"
            : $"Claimed amount is above the fast-track limit of {(configuredLimit is null ? "£2,500.00" : "£3,000.00")}",
            reason.Message);
        var getResponse = await client.GetAsync(response.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        Assert.Equal(await response.Content.ReadAsStringAsync(), await getResponse.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task SubmitClaim_InvalidTriageConfiguration_DoesNotPersistClaim()
    {
        await using var factory = CreateConfiguredFactory("abc");
        using var client = factory.CreateClient();
        var claims = factory.Services.GetRequiredService<IClaimRepository>();

        var response = await client.PostAsJsonAsync("/api/claims", ValidRequest(), TestJson.Options);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Empty(await claims.ListAsync(null, CancellationToken.None));
    }

    [Fact]
    [Trait("Rule", "R5")]
    public async Task SubmitClaim_OneExistingPrior_ExcludesNewClaimItselfOnBothResponsePaths()
    {
        await using var factory = new ClaimsDeskApiFactory();
        using var client = factory.CreateClient();
        // On this incident date, only seeded 0003 is prior; the new target must not become its own second prior.
        var request = ValidRequest() with { IncidentDate = ClaimsDeskApiFactory.Today.AddDays(-30) };

        var response = await client.PostAsJsonAsync("/api/claims", request, TestJson.Options);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<ClaimResponse>(TestJson.Options);
        Assert.NotNull(created);
        Assert.Equal(TriageOutcome.FastTrack, created.Triage.Outcome);
        AssertCodes(created.Triage, TriageReasonCodes.FastTrackEligible);
        var get = await client.GetFromJsonAsync<ClaimResponse>(response.Headers.Location, TestJson.Options);
        Assert.NotNull(get);
        Assert.Equal(created.Triage.Outcome, get.Triage.Outcome);
        AssertCodes(get.Triage, TriageReasonCodes.FastTrackEligible);
    }

    [Fact]
    [Trait("Rule", "R5")]
    [Trait("Rule", "R7")]
    public async Task GetClaim_ConfigurationReload_RecalculatesUsingNewLimitAndMessage()
    {
        await using var factory = CreateConfiguredFactory("1000.00", emptyHistory: false);
        using var client = factory.CreateClient();
        var before = await client.GetFromJsonAsync<ClaimResponse>("/api/claims/CLM-2026-0001", TestJson.Options);
        Assert.NotNull(before);
        Assert.Equal(TriageOutcome.StandardReview, before.Triage.Outcome);
        Assert.Equal("Claimed amount is above the fast-track limit of £1,000.00",
            Assert.Single(before.Triage.Reasons).Message);
        var configuration = factory.Services.GetRequiredService<IConfiguration>();
        configuration["Triage:FastTrackMaxAmount"] = "3000.00";
        Assert.IsAssignableFrom<IConfigurationRoot>(configuration).Reload();

        var after = await client.GetFromJsonAsync<ClaimResponse>("/api/claims/CLM-2026-0001", TestJson.Options);

        Assert.NotNull(after);
        Assert.Equal(TriageOutcome.FastTrack, after.Triage.Outcome);
        AssertCodes(after.Triage, TriageReasonCodes.FastTrackEligible);
    }

    [Theory]
    [Trait("Rule", "R5")]
    [InlineData(ClaimStatus.Settled)]
    [InlineData(ClaimStatus.Rejected)]
    [InlineData(ClaimStatus.Withdrawn)]
    public async Task GetClaim_ClosedTargetAndHistoryChange_RecalculatesWithoutChangingLifecycle(ClaimStatus status)
    {
        await using var factory = new ClaimsDeskApiFactory();
        using var client = factory.CreateClient();
        var repository = factory.Services.GetRequiredService<IClaimRepository>();
        await repository.UpdateStatusAsync("CLM-2026-0009", status, CancellationToken.None);
        var before = await client.GetFromJsonAsync<ClaimResponse>("/api/claims/CLM-2026-0009", TestJson.Options);
        Assert.NotNull(before);
        Assert.Equal(TriageOutcome.StandardReview, before.Triage.Outcome);
        AssertCodes(before.Triage, TriageReasonCodes.PriorClaims);
        await repository.UpdateStatusAsync("CLM-2026-0001", ClaimStatus.Withdrawn, CancellationToken.None);

        var after = await client.GetFromJsonAsync<ClaimResponse>("/api/claims/CLM-2026-0009", TestJson.Options);

        Assert.NotNull(after);
        Assert.Equal(status, after.Status);
        Assert.Equal(TriageOutcome.FastTrack, after.Triage.Outcome);
        AssertCodes(after.Triage, TriageReasonCodes.FastTrackEligible);
    }

    [Fact]
    [Trait("Rule", "R6")]
    [Trait("Rule", "R9")]
    public async Task GetClaim_AllReferralIndicators_ReturnsOnlyExactContractWithoutHistoryPersonalData()
    {
        await using var factory = new ClaimsDeskApiFactory();
        using var client = factory.CreateClient();
        var repository = factory.Services.GetRequiredService<IClaimRepository>();
        var request = new NewClaim("POL-100003", Peril.LostBaggage, ClaimsDeskApiFactory.Today.AddDays(-5),
            8500m, "Synthetic loss.", "Synthetic History Person", "history@example.com");
        for (var i = 0; i < 3; i++)
            await repository.AddAsync(request, ClaimsDeskApiFactory.Today, ClaimsDeskApiFactory.Now, CancellationToken.None);
        var target = await repository.AddAsync(request with
        {
            ClaimantName = "Synthetic Target Person", ClaimantEmail = "target@example.com"
        }, ClaimsDeskApiFactory.Today.AddDays(86), ClaimsDeskApiFactory.Now, CancellationToken.None);

        var response = await client.GetAsync($"/api/claims/{target.ClaimId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        Assert.Equal("Synthetic Target Person", root.GetProperty("claimantName").GetString());
        Assert.False(root.TryGetProperty("claimantEmail", out _));
        Assert.DoesNotContain("history@example.com", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("target@example.com", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Synthetic History Person", json, StringComparison.Ordinal);
        var triageJson = root.GetProperty("triage");
        Assert.Equal(new[] { "outcome", "reasons" }, triageJson.EnumerateObject().Select(p => p.Name).Order());
        Assert.Equal("Referred", triageJson.GetProperty("outcome").GetString());
        foreach (var reason in triageJson.GetProperty("reasons").EnumerateArray())
            Assert.Equal(new[] { "code", "message" }, reason.EnumerateObject().Select(p => p.Name).Order());
        Assert.DoesNotContain("Synthetic", triageJson.GetRawText(), StringComparison.Ordinal);
        var claim = JsonSerializer.Deserialize<ClaimResponse>(json, TestJson.Options);
        Assert.NotNull(claim);
        AssertCodes(claim.Triage, TriageReasonCodes.VeryLateNotification, TriageReasonCodes.NewPolicy,
            TriageReasonCodes.HighValueForCover, TriageReasonCodes.FrequentClaims);
        Assert.All(claim.Triage.Reasons, reason => Assert.Equal(ExpectedMessage(reason.Code), reason.Message));
    }

    [Fact]
    [Trait("Rule", "R9")]
    public async Task SubmitClaim_DetailAndList_PreservePersonalDataAndSummaryContracts()
    {
        await using var factory = CreateConfiguredFactory("3000.00");
        using var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/claims", ValidRequest(), TestJson.Options);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var detail = JsonDocument.Parse(json);
        Assert.Equal("Synthetic Customer 901", detail.RootElement.GetProperty("claimantName").GetString());
        Assert.False(detail.RootElement.TryGetProperty("claimantEmail", out _));
        Assert.DoesNotContain("customer901@example.com", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Synthetic", detail.RootElement.GetProperty("triage").GetRawText(), StringComparison.Ordinal);
        Assert.Equal("/api/claims/CLM-2026-0001", response.Headers.Location?.OriginalString);

        var listJson = await client.GetStringAsync("/api/claims");

        using var list = JsonDocument.Parse(listJson);
        var summary = Assert.Single(list.RootElement.EnumerateArray());
        Assert.Equal(new[] { "claimId", "claimedAmount", "incidentDate", "peril", "policyNumber", "reportedDate", "status" },
            summary.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.DoesNotContain("Synthetic Customer", listJson, StringComparison.Ordinal);
        Assert.DoesNotContain("@", listJson, StringComparison.Ordinal);
    }

    [Fact]
    [Trait("Rule", "R9")]
    public async Task SubmitClaim_HistoryAndErrorPaths_KeepPersonalDataOutOfLogsReasonsUrlsAndErrors()
    {
        var logs = new CapturedLogs();
        await using var factory = new ClaimsDeskApiFactory().WithWebHostBuilder(builder =>
            builder.ConfigureLogging(logging => logging.AddProvider(logs)));
        using var client = factory.CreateClient();
        var repository = factory.Services.GetRequiredService<IClaimRepository>();
        await repository.AddAsync(new NewClaim("POL-100001", Peril.AccidentalDamage,
            ClaimsDeskApiFactory.Today.AddDays(-4), 500m, "Synthetic history.",
            "Synthetic Private History", "private-history@example.com"),
            ClaimsDeskApiFactory.Today, ClaimsDeskApiFactory.Now, CancellationToken.None);
        var request = ValidRequest() with
        {
            ClaimantName = "Synthetic Private Target", ClaimantEmail = "private-target@example.com"
        };

        var created = await client.PostAsJsonAsync("/api/claims", request, TestJson.Options);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var post = await created.Content.ReadFromJsonAsync<ClaimResponse>(TestJson.Options);
        Assert.NotNull(post);
        Assert.Equal(request.ClaimantName, post.ClaimantName);
        Assert.Equal(TriageOutcome.Referred, post.Triage.Outcome);
        AssertCodes(post.Triage, TriageReasonCodes.FrequentClaims);
        var detail = await client.GetAsync(created.Headers.Location);
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);
        var get = await detail.Content.ReadFromJsonAsync<ClaimResponse>(TestJson.Options);
        Assert.NotNull(get);
        Assert.Equal(post.ClaimantName, get.ClaimantName);
        AssertCodes(get.Triage, TriageReasonCodes.FrequentClaims);
        var invalid = await client.PostAsJsonAsync("/api/claims", request with { ClaimedAmount = 999999m },
            TestJson.Options);
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        var problem = await invalid.Content.ReadFromJsonAsync<ProblemResponse>(TestJson.Options);
        Assert.NotNull(problem);
        Assert.Equal(ErrorCodes.ValidationFailed, problem.Code);
        var missing = await client.GetAsync("/api/claims/CLM-2026-9999");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

        var protectedOutput = string.Join("\n", logs.Entries.Select(entry => entry.Text)) +
            JsonSerializer.Serialize(new[] { post.Triage, get.Triage }, TestJson.Options) +
            created.Headers.Location + created.RequestMessage?.RequestUri + detail.RequestMessage?.RequestUri +
            await invalid.Content.ReadAsStringAsync() + await missing.Content.ReadAsStringAsync();
        foreach (var personalData in new[] {
            request.ClaimantName, request.ClaimantEmail,
            "Synthetic Private History", "private-history@example.com"
        })
            Assert.DoesNotContain(personalData, protectedOutput, StringComparison.OrdinalIgnoreCase);
        var submission = Assert.Single(logs.Entries, entry => entry.Category == "ClaimsDesk.Api.Claims");
        Assert.Equal($"Claim {post.ClaimId} submitted for policy POL-100001", submission.Text);
        foreach (var response in new[] { created, detail })
        {
            var json = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(json);
            Assert.False(document.RootElement.TryGetProperty("claimantEmail", out _));
            Assert.DoesNotContain("private-target@example.com", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("Synthetic Private History", json, StringComparison.Ordinal);
            Assert.DoesNotContain("private-history@example.com", json, StringComparison.OrdinalIgnoreCase);
        }
    }

    private sealed class CapturedLogs : ILoggerProvider
    {
        public ConcurrentQueue<(string Category, string Text)> Entries { get; } = new();
        public ILogger CreateLogger(string categoryName) => new CapturedLogger(categoryName, Entries);
        public void Dispose() { }

        private sealed class CapturedLogger(
            string category, ConcurrentQueue<(string Category, string Text)> entries) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
            public bool IsEnabled(LogLevel logLevel) => true;
            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
                Func<TState, Exception?, string> formatter) =>
                entries.Enqueue((category, formatter(state, exception) + (exception?.ToString() ?? string.Empty)));
        }
    }

    private static WebApplicationFactory<Program> CreateConfiguredFactory(string? limit, bool emptyHistory = true) =>
        new ClaimsDeskApiFactory().WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, configuration) =>
            {
                const string key = "Triage:FastTrackMaxAmount";
                if (limit is null)
                {
                    // A missing key is not an explicitly configured null in .NET 10 binding.
                    var values = configuration.Build().AsEnumerable().Where(pair => pair.Key != key).ToArray();
                    configuration.Sources.Clear();
                    configuration.AddInMemoryCollection(values);
                }
                else
                {
                    configuration.AddInMemoryCollection(new Dictionary<string, string?> { [key] = limit });
                }
            });
            if (emptyHistory)
                builder.ConfigureTestServices(services =>
                {
                    services.RemoveAll<IClaimRepository>();
                    services.AddSingleton<IClaimRepository>(new InMemoryClaimRepository([]));
                });
        });

    private static SubmitClaimRequest ValidRequest() => new(
        "pol-100001", Peril.AccidentalDamage, ClaimsDeskApiFactory.Today.AddDays(-3), 500m,
        "Synthetic laptop damage.", "Synthetic Customer 901", "customer901@example.com");

    private static void AssertCodes(TriageResponse triage, params string[] codes) =>
        Assert.Equal(codes.Order(StringComparer.Ordinal),
            triage.Reasons.Select(reason => reason.Code).Order(StringComparer.Ordinal));

    private static string ExpectedMessage(string code) => code switch
    {
        TriageReasonCodes.FastTrackEligible => "Meets all fast-track criteria",
        TriageReasonCodes.AboveFastTrackLimit => "Claimed amount is above the fast-track limit of £2,500.00",
        TriageReasonCodes.LateNotification => "Reported more than 30 days after the incident",
        TriageReasonCodes.PriorClaims => "2 or more prior claims in the last 12 months",
        TriageReasonCodes.VeryLateNotification => "Reported more than 90 days after the incident",
        TriageReasonCodes.NewPolicy => "Incident within the first 14 days of cover",
        TriageReasonCodes.HighValueForCover => "Claimed amount is more than 80% of the cover limit",
        TriageReasonCodes.FrequentClaims => "3 or more prior claims in the last 12 months",
        _ => throw new ArgumentOutOfRangeException(nameof(code))
    };
}
