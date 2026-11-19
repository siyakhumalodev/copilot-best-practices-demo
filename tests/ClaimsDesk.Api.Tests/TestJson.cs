using System.Text.Json;
using System.Text.Json.Serialization;

namespace ClaimsDesk.Api.Tests;

/// <summary>JSON options that match the API: web defaults (camelCase) and enums as strings.</summary>
public static class TestJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };
}
