$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$REGION = "ap-southeast-2"
$PROJECT_ROOT = "C:\Users\Dante Salvador\Downloads\CloudOps Intelligence Platform"

Write-Host "Updating cloudops-data-collector Lambda function..." -ForegroundColor Cyan

aws lambda update-function-code `
    --function-name "cloudops-data-collector" `
    --zip-file "fileb://$PROJECT_ROOT\services\data-collector\function.zip" `
    --region $REGION | Out-Null

Write-Host "Updated!" -ForegroundColor Green
