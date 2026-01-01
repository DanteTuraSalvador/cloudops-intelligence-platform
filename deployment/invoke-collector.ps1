$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$REGION = "ap-southeast-2"

Write-Host "Invoking data collector to populate sample data..." -ForegroundColor Cyan

$result = aws lambda invoke `
    --function-name cloudops-data-collector `
    --payload '{}' `
    --region $REGION `
    --cli-binary-format raw-in-base64-out `
    response.json `
    --output json | ConvertFrom-Json

Write-Host "Invocation result:" -ForegroundColor Gray
Write-Host "Status: $($result.StatusCode)" -ForegroundColor Green

if (Test-Path response.json) {
    Get-Content response.json
    Remove-Item response.json
}
