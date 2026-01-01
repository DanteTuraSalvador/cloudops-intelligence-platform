using CloudOps.CostAnalyzer.Models;
using Microsoft.Extensions.Logging;

namespace CloudOps.CostAnalyzer.Services;

public class ForecastService : IForecastService
{
    private readonly ILogger<ForecastService> _logger;

    public ForecastService(ILogger<ForecastService> logger)
    {
        _logger = logger;
    }

    public Task<CostForecast> GenerateForecastAsync(string accountId, List<CostData> historicalData)
    {
        _logger.LogInformation("Generating forecast for {AccountId} based on {DataPoints} data points",
            accountId, historicalData.Count);

        if (historicalData.Count == 0)
        {
            return Task.FromResult(new CostForecast
            {
                AccountId = accountId,
                ForecastDate = DateTime.UtcNow.AddMonths(1).ToString("yyyy-MM-dd"),
                PredictedCost = 0,
                LowerBound = 0,
                UpperBound = 0,
                ConfidenceLevel = 0,
                GeneratedAt = DateTime.UtcNow
            });
        }

        // Simple linear projection based on historical data
        var avgDailyCost = historicalData.Average(c => c.TotalCost);
        var stdDev = CalculateStandardDeviation(historicalData.Select(c => c.TotalCost));

        // Project 30 days forward
        var predictedMonthCost = avgDailyCost * 30;
        var margin = stdDev * 30 * 0.1m; // 10% margin based on std dev

        var forecast = new CostForecast
        {
            AccountId = accountId,
            ForecastDate = DateTime.UtcNow.AddMonths(1).ToString("yyyy-MM-dd"),
            PredictedCost = Math.Round(predictedMonthCost, 2),
            LowerBound = Math.Round(predictedMonthCost - margin, 2),
            UpperBound = Math.Round(predictedMonthCost + margin, 2),
            ConfidenceLevel = 0.85,
            GeneratedAt = DateTime.UtcNow
        };

        _logger.LogInformation("Forecast generated: {PredictedCost} USD (±{Margin})",
            forecast.PredictedCost, margin);

        return Task.FromResult(forecast);
    }

    public async Task<List<CostForecast>> GenerateMonthlyForecastAsync(string accountId, int months = 3)
    {
        _logger.LogInformation("Generating {Months} month forecast for {AccountId}", months, accountId);

        var forecasts = new List<CostForecast>();
        var baseDate = DateTime.UtcNow;

        // Generate forecasts for each month
        for (int i = 1; i <= months; i++)
        {
            var forecastDate = baseDate.AddMonths(i);
            var baseCost = 3000m; // Base monthly cost
            var growthFactor = 1.02m; // 2% monthly growth assumption

            var predictedCost = baseCost * (decimal)Math.Pow((double)growthFactor, i);
            var margin = predictedCost * 0.1m;

            forecasts.Add(new CostForecast
            {
                AccountId = accountId,
                ForecastDate = forecastDate.ToString("yyyy-MM-dd"),
                PredictedCost = Math.Round(predictedCost, 2),
                LowerBound = Math.Round(predictedCost - margin, 2),
                UpperBound = Math.Round(predictedCost + margin, 2),
                ConfidenceLevel = 0.85 - (0.05 * i), // Confidence decreases over time
                GeneratedAt = DateTime.UtcNow
            });
        }

        return await Task.FromResult(forecasts);
    }

    private static decimal CalculateStandardDeviation(IEnumerable<decimal> values)
    {
        var list = values.ToList();
        if (list.Count == 0) return 0;

        var avg = list.Average();
        var sumSquares = list.Sum(v => (v - avg) * (v - avg));
        return (decimal)Math.Sqrt((double)(sumSquares / list.Count));
    }
}
