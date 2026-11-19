namespace ClaimsDesk.Api.Claims;

public sealed class TriageOptions
{
    public const string SectionName = "Triage";

    public decimal FastTrackMaxAmount { get; set; } = 2500.00m;
}
