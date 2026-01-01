using CloudOps.AnomalyDetector.Models;

namespace CloudOps.AnomalyDetector.Services;

public interface IAnomalyDetectionService
{
    Task<AnomalyDetectionResult> DetectAnomaliesAsync(AnomalyDetectionRequest request);
    Task<List<Anomaly>> GetAnomaliesAsync(string accountId, string? status = null);
    Task<AnomalySummary> GetSummaryAsync(string accountId);
    Task<Anomaly> UpdateAnomalyStatusAsync(string accountId, string anomalyId, string status);
}
