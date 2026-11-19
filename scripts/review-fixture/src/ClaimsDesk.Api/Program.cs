using System.Text.Json.Serialization;
using ClaimsDesk.Api.Claims;
using ClaimsDesk.Api.Data;
using ClaimsDesk.Api.Policies;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddHealthChecks();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IPolicyRepository>(services =>
    new InMemoryPolicyRepository(SeedData.Policies(Today(services))));
builder.Services.AddSingleton<IClaimRepository>(services =>
    new InMemoryClaimRepository(SeedData.Claims(Today(services))));

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapHealthChecks("/health");
app.MapPolicyEndpoints();
app.MapClaimEndpoints();
app.MapSettlementEndpoints();

app.Run();

// The seed data is relative to today, taken from the injected clock so tests can fix the date.
static DateOnly Today(IServiceProvider services) =>
    DateOnly.FromDateTime(services.GetRequiredService<TimeProvider>().GetUtcNow().UtcDateTime);

public partial class Program { }
