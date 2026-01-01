$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$REGION = "ap-southeast-2"

Write-Host "Fetching Lambda logs for cloudops-data-collector..." -ForegroundColor Cyan

$logGroup = "/aws/lambda/cloudops-data-collector"

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

    aws logs get-log-events `
        --log-group-name $logGroup `
        --log-stream-name $streamName `
        --limit 50 `
        --region $REGION `
        --output json | ConvertFrom-Json | Select-Object -ExpandProperty events | ForEach-Object {
        Write-Host $_.message
    }
}
