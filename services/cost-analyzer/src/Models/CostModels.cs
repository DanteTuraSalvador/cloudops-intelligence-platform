namespace CloudOps.CostAnalyzer.Models;

public record CostData
{
    public required string AccountId { get; init; }
    public required string Date { get; init; }
    public required decimal TotalCost { get; init; }
    public required string Currency { get; init; }
    public required List<CostBreakdown> Breakdown { get; init; }
    public required DateTime CreatedAt { get; init; }
}

public record CostBreakdown
{
    public required string Service { get; init; }
    public required decimal Cost { get; init; }
    public decimal Usage { get; init; }
    public string? Unit { get; init; }
}

public record CostTrend
{
    public required string AccountId { get; init; }
    public required string Period { get; init; }
    public required decimal CurrentCost { get; init; }
    public required decimal PreviousCost { get; init; }
    public required decimal ChangePercent { get; init; }
    public required string Trend { get; init; } // "up", "down", "stable"
}

public record CostForecast
{
    public required string AccountId { get; init; }
    public required string ForecastDate { get; init; }
    public required decimal PredictedCost { get; init; }
    public required decimal LowerBound { get; init; }
    public required decimal UpperBound { get; init; }
    public required double ConfidenceLevel { get; init; }
    public required DateTime GeneratedAt { get; init; }
}

public record CostAnalysisResult
{
    public required string AccountId { get; init; }
    public required string StartDate { get; init; }
    public required string EndDate { get; init; }
    public required decimal TotalCost { get; init; }
    public required decimal AverageDailyCost { get; init; }
    public required List<ServiceCostSummary> TopServices { get; init; }
    public required CostTrend Trend { get; init; }
    public CostForecast? Forecast { get; init; }
}

public record ServiceCostSummary
{
    public required string Service { get; init; }
    public required decimal TotalCost { get; init; }
    public required decimal PercentOfTotal { get; init; }
    public required decimal ChangeFromPrevious { get; init; }
}

public record CostQueryRequest
{
    public required string AccountId { get; init; }
    public required string StartDate { get; init; }
    public required string EndDate { get; init; }
    public bool IncludeForecast { get; init; } = false;
}
