$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$REGION = "ap-southeast-2"

Write-Host "Refreshing Lambda functions to pick up new IAM permissions..." -ForegroundColor Cyan

# Update function configuration to force refresh (add/remove a dummy env var)
$functions = @("cloudops-api-gateway", "cloudops-data-collector", "cloudops-alert-service")

foreach ($func in $functions) {
    Write-Host "Refreshing $func..." -ForegroundColor Yellow
    aws lambda update-function-configuration `
        --function-name $func `
        --description "CloudOps Platform - refreshed $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" `
        --region $REGION | Out-Null
}

Write-Host "Done! Waiting for updates to propagate..." -ForegroundColor Green
Start-Sleep -Seconds 5
