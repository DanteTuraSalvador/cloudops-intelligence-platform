$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$REGION = "ap-southeast-2"
$PROJECT_ROOT = "C:\Users\Dante Salvador\Downloads\CloudOps Intelligence Platform"

Write-Host "Updating cloudops-api-gateway Lambda function..." -ForegroundColor Cyan

aws lambda update-function-code `
    --function-name "cloudops-api-gateway" `
    --zip-file "fileb://$PROJECT_ROOT\services\api-gateway\function.zip" `
    --region $REGION | Out-Null

Write-Host "Updated! Waiting for function to be ready..." -ForegroundColor Green

Start-Sleep -Seconds 5

Write-Host "Testing health endpoint..." -ForegroundColor Cyan
