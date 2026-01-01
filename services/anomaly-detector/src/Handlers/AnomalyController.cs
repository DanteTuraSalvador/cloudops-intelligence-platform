using CloudOps.AnomalyDetector.Models;
using CloudOps.AnomalyDetector.Services;
using Microsoft.AspNetCore.Mvc;

namespace CloudOps.AnomalyDetector.Handlers;

[ApiController]
[Route("api/[controller]")]
public class AnomalyController : ControllerBase
{
    private readonly IAnomalyDetectionService _anomalyService;
    private readonly ILogger<AnomalyController> _logger;

    public AnomalyController(
        IAnomalyDetectionService anomalyService,
        ILogger<AnomalyController> logger)
    {
        _anomalyService = anomalyService;
        _logger = logger;
    }

    /// <summary>
    /// Detect anomalies in metric data
    /// </summary>
    [HttpPost("detect")]
    [ProducesResponseType(typeof(AnomalyDetectionResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AnomalyDetectionResult>> DetectAnomalies(
        [FromBody] AnomalyDetectionRequest request)
    {
        _logger.LogInformation("Anomaly detection requested for {AccountId}/{MetricType}",
            request.AccountId, request.MetricType);

        if (string.IsNullOrEmpty(request.AccountId) ||
            string.IsNullOrEmpty(request.MetricType) ||
            request.DataPoints == null)
        {
            return BadRequest("AccountId, MetricType, and DataPoints are required");
        }

        var result = await _anomalyService.DetectAnomaliesAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// Get anomalies for an account
    /// </summary>
    [HttpGet("{accountId}")]
    [ProducesResponseType(typeof(List<Anomaly>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<Anomaly>>> GetAnomalies(
        string accountId,
        [FromQuery] string? status = null)
    {
        _logger.LogInformation("Getting anomalies for {AccountId}", accountId);

        var anomalies = await _anomalyService.GetAnomaliesAsync(accountId, status);
        return Ok(anomalies);
    }

    /// <summary>
    /// Get anomaly summary for an account
    /// </summary>
    [HttpGet("{accountId}/summary")]
    [ProducesResponseType(typeof(AnomalySummary), StatusCodes.Status200OK)]
    public async Task<ActionResult<AnomalySummary>> GetSummary(string accountId)
    {
        _logger.LogInformation("Getting anomaly summary for {AccountId}", accountId);

        var summary = await _anomalyService.GetSummaryAsync(accountId);
        return Ok(summary);
    }

    /// <summary>
    /// Update anomaly status
    /// </summary>
    [HttpPatch("{accountId}/{anomalyId}/status")]
    [ProducesResponseType(typeof(Anomaly), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<Anomaly>> UpdateStatus(
        string accountId,
        string anomalyId,
        [FromBody] UpdateStatusRequest request)
    {
        _logger.LogInformation("Updating anomaly {AnomalyId} status to {Status}",
            anomalyId, request.Status);

        var validStatuses = new[] { "open", "acknowledged", "resolved", "ignored" };
        if (!validStatuses.Contains(request.Status))
        {
            return BadRequest($"Invalid status. Must be one of: {string.Join(", ", validStatuses)}");
        }

        var anomaly = await _anomalyService.UpdateAnomalyStatusAsync(accountId, anomalyId, request.Status);
        return Ok(anomaly);
    }
}

public record UpdateStatusRequest
{
    public required string Status { get; init; }
}
