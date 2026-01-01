$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$REGION = "ap-southeast-2"

Write-Host "Creating cloudops-alerts table..." -ForegroundColor Cyan

aws dynamodb create-table `
    --table-name cloudops-alerts `
    --attribute-definitions `
        "AttributeName=pk,AttributeType=S" `
        "AttributeName=sk,AttributeType=S" `
    --key-schema `
        "AttributeName=pk,KeyType=HASH" `
        "AttributeName=sk,KeyType=RANGE" `
    --billing-mode PAY_PER_REQUEST `
    --region $REGION

if ($LASTEXITCODE -eq 0) {
    Write-Host "Table created successfully!" -ForegroundColor Green
} else {
    Write-Host "Table may already exist or creation failed" -ForegroundColor Yellow
}
