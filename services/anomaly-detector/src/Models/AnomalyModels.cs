namespace CloudOps.AnomalyDetector.Models;

public record Anomaly
{
    public required string Id { get; init; }
    public required string AccountId { get; init; }
    public required string MetricType { get; init; }
    public required DateTime DetectedAt { get; init; }
    public required string Severity { get; init; } // low, medium, high, critical
    public required string Description { get; init; }
    public required double CurrentValue { get; init; }
    public required double ExpectedValue { get; init; }
    public required double Deviation { get; init; }
    public required string Status { get; init; } // open, acknowledged, resolved, ignored
    public DateTime? ResolvedAt { get; init; }
}

public record MetricDataPoint
{
    public required DateTime Timestamp { get; init; }
    public required double Value { get; init; }
}

public record AnomalyDetectionRequest
{
    public required string AccountId { get; init; }
    public required string MetricType { get; init; }
    public required List<MetricDataPoint> DataPoints { get; init; }
    public int WindowSize { get; init; } = 24;
    public double ThresholdMultiplier { get; init; } = 2.5;
}

public record AnomalyDetectionResult
{
    public required string AccountId { get; init; }
    public required string MetricType { get; init; }
    public required bool AnomalyDetected { get; init; }
    public List<Anomaly> Anomalies { get; init; } = new();
    public required AnomalyStatistics Statistics { get; init; }
    public required DateTime AnalyzedAt { get; init; }
}

public record AnomalyStatistics
{
    public required double Mean { get; init; }
    public required double StandardDeviation { get; init; }
    public required double UpperThreshold { get; init; }
    public required double LowerThreshold { get; init; }
    public required int DataPointsAnalyzed { get; init; }
}

public record AnomalySummary
{
    public required string AccountId { get; init; }
    public required int TotalAnomalies { get; init; }
    public required int OpenAnomalies { get; init; }
    public required int CriticalCount { get; init; }
    public required int HighCount { get; init; }
    public required int MediumCount { get; init; }
    public required int LowCount { get; init; }
    public required DateTime GeneratedAt { get; init; }
}
