using CloudOps.AnomalyDetector.Models;
using Microsoft.Extensions.Logging;

namespace CloudOps.AnomalyDetector.Services;

public class AnomalyDetectionService : IAnomalyDetectionService
{
    private readonly ILogger<AnomalyDetectionService> _logger;
    private readonly IConfiguration _configuration;

    public AnomalyDetectionService(
        ILogger<AnomalyDetectionService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public Task<AnomalyDetectionResult> DetectAnomaliesAsync(AnomalyDetectionRequest request)
    {
        _logger.LogInformation(
            "Detecting anomalies for {AccountId}/{MetricType} with {DataPoints} data points",
            request.AccountId, request.MetricType, request.DataPoints.Count);

        var minDataPoints = _configuration.GetValue<int>("AnomalyDetection:MinDataPoints", 10);

        if (request.DataPoints.Count < minDataPoints)
        {
            _logger.LogWarning("Insufficient data points ({Count}) for anomaly detection", request.DataPoints.Count);
            return Task.FromResult(new AnomalyDetectionResult
            {
                AccountId = request.AccountId,
                MetricType = request.MetricType,
                AnomalyDetected = false,
                Anomalies = new List<Anomaly>(),
                Statistics = new AnomalyStatistics
                {
                    Mean = 0,
                    StandardDeviation = 0,
                    UpperThreshold = 0,
                    LowerThreshold = 0,
                    DataPointsAnalyzed = request.DataPoints.Count
                },
                AnalyzedAt = DateTime.UtcNow
            });
        }

        // Calculate statistics
        var values = request.DataPoints.Select(dp => dp.Value).ToList();
        var mean = values.Average();
        var stdDev = CalculateStandardDeviation(values);
        var upperThreshold = mean + (stdDev * request.ThresholdMultiplier);
        var lowerThreshold = mean - (stdDev * request.ThresholdMultiplier);

        // Detect anomalies using Z-score method
        var anomalies = new List<Anomaly>();

        foreach (var dataPoint in request.DataPoints)
        {
            if (dataPoint.Value > upperThreshold || dataPoint.Value < lowerThreshold)
            {
                var deviation = Math.Abs(dataPoint.Value - mean) / stdDev;
                var severity = DetermineSeverity(deviation);

                anomalies.Add(new Anomaly
                {
                    Id = $"anomaly-{Guid.NewGuid():N}",
                    AccountId = request.AccountId,
                    MetricType = request.MetricType,
                    DetectedAt = dataPoint.Timestamp,
                    Severity = severity,
                    Description = GenerateDescription(request.MetricType, dataPoint.Value, mean, deviation),
                    CurrentValue = dataPoint.Value,
                    ExpectedValue = mean,
                    Deviation = deviation,
                    Status = "open"
                });
            }
        }

        _logger.LogInformation("Detected {Count} anomalies for {AccountId}/{MetricType}",
            anomalies.Count, request.AccountId, request.MetricType);

        return Task.FromResult(new AnomalyDetectionResult
        {
            AccountId = request.AccountId,
            MetricType = request.MetricType,
            AnomalyDetected = anomalies.Count > 0,
            Anomalies = anomalies,
            Statistics = new AnomalyStatistics
            {
                Mean = mean,
                StandardDeviation = stdDev,
                UpperThreshold = upperThreshold,
                LowerThreshold = lowerThreshold,
                DataPointsAnalyzed = request.DataPoints.Count
            },
            AnalyzedAt = DateTime.UtcNow
        });
    }

    public Task<List<Anomaly>> GetAnomaliesAsync(string accountId, string? status = null)
    {
        _logger.LogInformation("Getting anomalies for {AccountId}, status filter: {Status}",
            accountId, status ?? "all");

        // TODO: Implement DynamoDB query
        // Return mock data for now
        var anomalies = new List<Anomaly>
        {
            new Anomaly
            {
                Id = "anomaly-001",
                AccountId = accountId,
                MetricType = "CPUUtilization",
                DetectedAt = DateTime.UtcNow.AddHours(-2),
                Severity = "high",
                Description = "CPU utilization spike detected - 95.5% (expected: 45.2%)",
                CurrentValue = 95.5,
                ExpectedValue = 45.2,
                Deviation = 3.2,
                Status = "open"
            },
            new Anomaly
            {
                Id = "anomaly-002",
                AccountId = accountId,
                MetricType = "NetworkIn",
                DetectedAt = DateTime.UtcNow.AddHours(-5),
                Severity = "medium",
                Description = "Unusual network traffic detected",
                CurrentValue = 1500000000,
                ExpectedValue = 500000000,
                Deviation = 2.8,
                Status = "acknowledged"
            }
        };

        if (!string.IsNullOrEmpty(status))
        {
            anomalies = anomalies.Where(a => a.Status == status).ToList();
        }

        return Task.FromResult(anomalies);
    }

    public Task<AnomalySummary> GetSummaryAsync(string accountId)
    {
        _logger.LogInformation("Getting anomaly summary for {AccountId}", accountId);

        // TODO: Implement actual aggregation
        return Task.FromResult(new AnomalySummary
        {
            AccountId = accountId,
            TotalAnomalies = 15,
            OpenAnomalies = 5,
            CriticalCount = 1,
            HighCount = 2,
            MediumCount = 5,
            LowCount = 7,
            GeneratedAt = DateTime.UtcNow
        });
    }

    public Task<Anomaly> UpdateAnomalyStatusAsync(string accountId, string anomalyId, string status)
    {
        _logger.LogInformation("Updating anomaly {AnomalyId} status to {Status}", anomalyId, status);

        // TODO: Implement DynamoDB update
        return Task.FromResult(new Anomaly
        {
            Id = anomalyId,
            AccountId = accountId,
            MetricType = "CPUUtilization",
            DetectedAt = DateTime.UtcNow.AddHours(-2),
            Severity = "high",
            Description = "Status updated",
            CurrentValue = 95.5,
            ExpectedValue = 45.2,
            Deviation = 3.2,
            Status = status,
            ResolvedAt = status == "resolved" ? DateTime.UtcNow : null
        });
    }

    private static double CalculateStandardDeviation(List<double> values)
    {
        if (values.Count == 0) return 0;
        var avg = values.Average();
        var sumSquares = values.Sum(v => Math.Pow(v - avg, 2));
        return Math.Sqrt(sumSquares / values.Count);
    }

    private static string DetermineSeverity(double deviation)
    {
        return deviation switch
        {
            >= 4.0 => "critical",
            >= 3.0 => "high",
            >= 2.5 => "medium",
            _ => "low"
        };
    }

    private static string GenerateDescription(string metricType, double currentValue, double expectedValue, double deviation)
    {
        var direction = currentValue > expectedValue ? "above" : "below";
        return $"{metricType} is {deviation:F1} standard deviations {direction} normal. " +
               $"Current: {currentValue:F1}, Expected: {expectedValue:F1}";
    }
}
