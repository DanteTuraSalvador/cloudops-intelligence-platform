using CloudOps.CostAnalyzer.Models;

namespace CloudOps.CostAnalyzer.Services;

public interface ICostAnalysisService
{
    Task<CostAnalysisResult> AnalyzeCostsAsync(CostQueryRequest request);
    Task<List<CostData>> GetCostDataAsync(string accountId, string startDate, string endDate);
    Task<CostTrend> CalculateTrendAsync(string accountId, string period);
    Task<List<ServiceCostSummary>> GetTopServicesAsync(string accountId, string startDate, string endDate, int top = 5);
}
