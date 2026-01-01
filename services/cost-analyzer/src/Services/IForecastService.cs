using CloudOps.CostAnalyzer.Models;

namespace CloudOps.CostAnalyzer.Services;

public interface IForecastService
{
    Task<CostForecast> GenerateForecastAsync(string accountId, List<CostData> historicalData);
    Task<List<CostForecast>> GenerateMonthlyForecastAsync(string accountId, int months = 3);
}
