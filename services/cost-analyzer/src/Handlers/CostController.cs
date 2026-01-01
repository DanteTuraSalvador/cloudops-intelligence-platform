using CloudOps.CostAnalyzer.Models;
using CloudOps.CostAnalyzer.Services;
using Microsoft.AspNetCore.Mvc;

namespace CloudOps.CostAnalyzer.Handlers;

[ApiController]
[Route("api/[controller]")]
public class CostController : ControllerBase
{
    private readonly ICostAnalysisService _costService;
    private readonly IForecastService _forecastService;
    private readonly ILogger<CostController> _logger;

    public CostController(
        ICostAnalysisService costService,
        IForecastService forecastService,
        ILogger<CostController> logger)
    {
        _costService = costService;
        _forecastService = forecastService;
        _logger = logger;
    }

    /// <summary>
    /// Analyze costs for an account within a date range
    /// </summary>
    [HttpPost("analyze")]
    [ProducesResponseType(typeof(CostAnalysisResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CostAnalysisResult>> AnalyzeCosts([FromBody] CostQueryRequest request)
    {
        _logger.LogInformation("Cost analysis requested for account {AccountId}", request.AccountId);

        if (string.IsNullOrEmpty(request.AccountId) ||
            string.IsNullOrEmpty(request.StartDate) ||
            string.IsNullOrEmpty(request.EndDate))
        {
            return BadRequest("AccountId, StartDate, and EndDate are required");
        }

        var result = await _costService.AnalyzeCostsAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// Get cost data for an account
    /// </summary>
    [HttpGet("{accountId}")]
    [ProducesResponseType(typeof(List<CostData>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CostData>>> GetCosts(
        string accountId,
        [FromQuery] string startDate,
        [FromQuery] string endDate)
    {
        _logger.LogInformation("Getting costs for account {AccountId}", accountId);

        var costs = await _costService.GetCostDataAsync(accountId, startDate, endDate);
        return Ok(costs);
    }

    /// <summary>
    /// Get cost trend for an account
    /// </summary>
    [HttpGet("{accountId}/trend")]
    [ProducesResponseType(typeof(CostTrend), StatusCodes.Status200OK)]
    public async Task<ActionResult<CostTrend>> GetTrend(
        string accountId,
        [FromQuery] string period = "month")
    {
        _logger.LogInformation("Getting {Period} trend for account {AccountId}", period, accountId);

        var trend = await _costService.CalculateTrendAsync(accountId, period);
        return Ok(trend);
    }

    /// <summary>
    /// Get top spending services for an account
    /// </summary>
    [HttpGet("{accountId}/top-services")]
    [ProducesResponseType(typeof(List<ServiceCostSummary>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ServiceCostSummary>>> GetTopServices(
        string accountId,
        [FromQuery] string startDate,
        [FromQuery] string endDate,
        [FromQuery] int top = 5)
    {
        _logger.LogInformation("Getting top {Top} services for account {AccountId}", top, accountId);

        var services = await _costService.GetTopServicesAsync(accountId, startDate, endDate, top);
        return Ok(services);
    }

    /// <summary>
    /// Generate cost forecast for an account
    /// </summary>
    [HttpGet("{accountId}/forecast")]
    [ProducesResponseType(typeof(List<CostForecast>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<CostForecast>>> GetForecast(
        string accountId,
        [FromQuery] int months = 3)
    {
        _logger.LogInformation("Generating {Months} month forecast for account {AccountId}", months, accountId);

        var forecasts = await _forecastService.GenerateMonthlyForecastAsync(accountId, months);
        return Ok(forecasts);
    }
}
