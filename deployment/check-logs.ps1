$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$REGION = "ap-southeast-2"

Write-Host "Fetching Lambda logs for cloudops-api-gateway..." -ForegroundColor Cyan

# Get the log group
$logGroup = "/aws/lambda/cloudops-api-gateway"

# Get the latest log stream
$streams = aws logs describe-log-streams `
    --log-group-name $logGroup `
    --order-by LastEventTime `
    --descending `
    --limit 1 `
    --region $REGION `
    --output json | ConvertFrom-Json

if ($streams.logStreams.Count -gt 0) {
    $streamName = $streams.logStreams[0].logStreamName
    Write-Host "Latest log stream: $streamName" -ForegroundColor Gray

    # Get log events
    aws logs get-log-events `
        --log-group-name $logGroup `
        --log-stream-name $streamName `
        --limit 50 `
        --region $REGION `
        --output json | ConvertFrom-Json | Select-Object -ExpandProperty events | ForEach-Object {
        Write-Host $_.message
    }
} else {
    Write-Host "No log streams found yet" -ForegroundColor Yellow
}
