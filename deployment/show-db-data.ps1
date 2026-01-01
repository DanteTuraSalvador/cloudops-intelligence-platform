$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$REGION = "ap-southeast-2"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DynamoDB Tables - REAL AWS Database" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Show metrics data
Write-Host "cloudops-metrics table (sample):" -ForegroundColor Yellow
aws dynamodb scan --table-name cloudops-metrics --region $REGION --limit 5 --output json

Write-Host ""
Write-Host "cloudops-costs table (sample):" -ForegroundColor Yellow
aws dynamodb scan --table-name cloudops-costs --region $REGION --limit 3 --output json
