# Create API Gateway HTTP API
$ErrorActionPreference = "Continue"

# Add AWS CLI to PATH
$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"

$REGION = "ap-southeast-2"
$ACCOUNT_ID = "695210052357"
$API_NAME = "cloudops-api"
$LAMBDA_NAME = "cloudops-api-gateway"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Creating API Gateway HTTP API" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Create HTTP API
Write-Host "Creating HTTP API..." -ForegroundColor Yellow
$apiResult = aws apigatewayv2 create-api `
    --name $API_NAME `
    --protocol-type HTTP `
    --cors-configuration "AllowOrigins=*,AllowMethods=GET,POST,PUT,DELETE,OPTIONS,AllowHeaders=*" `
    --region $REGION `
    --output json | ConvertFrom-Json

$API_ID = $apiResult.ApiId
Write-Host "  API ID: $API_ID" -ForegroundColor Green

# Create Lambda integration
Write-Host "Creating Lambda integration..." -ForegroundColor Yellow
$integrationResult = aws apigatewayv2 create-integration `
    --api-id $API_ID `
    --integration-type AWS_PROXY `
    --integration-uri "arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_NAME}" `
    --payload-format-version "2.0" `
    --region $REGION `
    --output json | ConvertFrom-Json

$INTEGRATION_ID = $integrationResult.IntegrationId
Write-Host "  Integration ID: $INTEGRATION_ID" -ForegroundColor Green

# Create default route (catch-all)
Write-Host "Creating routes..." -ForegroundColor Yellow
aws apigatewayv2 create-route `
    --api-id $API_ID `
    --route-key '$default' `
    --target "integrations/$INTEGRATION_ID" `
    --region $REGION | Out-Null
Write-Host "  Created catch-all route" -ForegroundColor Green

# Create stage with auto-deploy
Write-Host "Creating stage with auto-deploy..." -ForegroundColor Yellow
aws apigatewayv2 create-stage `
    --api-id $API_ID `
    --stage-name '$default' `
    --auto-deploy `
    --region $REGION | Out-Null
Write-Host "  Stage created" -ForegroundColor Green

# Add Lambda permission for API Gateway to invoke
Write-Host "Adding Lambda permission..." -ForegroundColor Yellow
aws lambda add-permission `
    --function-name $LAMBDA_NAME `
    --statement-id "apigateway-invoke" `
    --action "lambda:InvokeFunction" `
    --principal "apigateway.amazonaws.com" `
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*" `
    --region $REGION 2>&1 | Out-Null
Write-Host "  Permission added" -ForegroundColor Green

# Get the API endpoint
$apiInfo = aws apigatewayv2 get-api --api-id $API_ID --region $REGION --output json | ConvertFrom-Json
$API_ENDPOINT = $apiInfo.ApiEndpoint

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "API Gateway Created!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API Endpoint: $API_ENDPOINT" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test URLs:" -ForegroundColor Cyan
Write-Host "  Health: $API_ENDPOINT/health" -ForegroundColor Gray
Write-Host "  Metrics: $API_ENDPOINT/api/v1/metrics" -ForegroundColor Gray
Write-Host "  Costs: $API_ENDPOINT/api/v1/costs" -ForegroundColor Gray
Write-Host ""

# Save endpoint to file
$API_ENDPOINT | Out-File -FilePath "$env:USERPROFILE\cloudops-api-endpoint.txt" -Encoding UTF8
Write-Host "Endpoint saved to: $env:USERPROFILE\cloudops-api-endpoint.txt" -ForegroundColor Gray
