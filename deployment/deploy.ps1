# CloudOps Intelligence Platform - AWS Deployment Script (PowerShell)
# Run this script to deploy your platform to AWS

$ErrorActionPreference = "Continue"

# Add AWS CLI to PATH if not already there
$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"

Write-Host "========================================" -ForegroundColor Green
Write-Host "CloudOps Intelligence Platform" -ForegroundColor Green
Write-Host "AWS Deployment Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Configuration
$AWS_REGION = "ap-southeast-2"
$PROJECT_NAME = "cloudops"

# Get AWS Account ID
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$BUCKET_NAME = "cloudops-dashboard-demo-$ACCOUNT_ID"

Write-Host "AWS Account: $ACCOUNT_ID" -ForegroundColor Yellow
Write-Host "Region: $AWS_REGION" -ForegroundColor Yellow
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (!(Get-Command aws -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: AWS CLI not found" -ForegroundColor Red
    exit 1
}

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found" -ForegroundColor Red
    exit 1
}

if (!(Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: pnpm not found" -ForegroundColor Red
    exit 1
}

Write-Host "✓ All prerequisites met" -ForegroundColor Green
Write-Host ""

# Step 1: Create IAM Role
Write-Host "Step 1: Creating IAM Role for Lambda..." -ForegroundColor Yellow

$ROLE_NAME = "$PROJECT_NAME-lambda-role"

try {
    aws iam get-role --role-name $ROLE_NAME 2>$null
    Write-Host "  Role already exists" -ForegroundColor Yellow
} catch {
    aws iam create-role `
        --role-name $ROLE_NAME `
        --assume-role-policy-document file://deployment/iam-policies/lambda-trust-policy.json `
        --description "Role for CloudOps Lambda functions"

    Write-Host "  ✓ IAM Role created" -ForegroundColor Green
    Start-Sleep -Seconds 10
}

# Attach policies
Write-Host "  Attaching policies..." -ForegroundColor Yellow

aws iam attach-role-policy `
    --role-name $ROLE_NAME `
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>$null

$POLICY_NAME = "$PROJECT_NAME-lambda-policy"
$POLICY_ARN = "arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

try {
    aws iam get-policy --policy-arn $POLICY_ARN 2>$null
    Write-Host "  Policy already exists" -ForegroundColor Yellow
} catch {
    aws iam create-policy `
        --policy-name $POLICY_NAME `
        --policy-document file://deployment/iam-policies/cloudops-lambda-policy.json

    Write-Host "  ✓ Custom policy created" -ForegroundColor Green
}

aws iam attach-role-policy `
    --role-name $ROLE_NAME `
    --policy-arn $POLICY_ARN 2>$null

$ROLE_ARN = "arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

Write-Host "✓ IAM Role ready: $ROLE_ARN" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting for IAM role to propagate..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 2: Deploy Lambda Functions
Write-Host "Step 2: Building and deploying Lambda functions..." -ForegroundColor Yellow

function Deploy-Lambda {
    param(
        [string]$ServiceName,
        [string]$Handler,
        [int]$Timeout = 30,
        [int]$Memory = 512
    )

    Write-Host "  Deploying $ServiceName..." -ForegroundColor Yellow

    Push-Location "services/$ServiceName"

    # Install and build
    pnpm install --prod
    pnpm build

    # Create deployment package
    if (Test-Path "function.zip") {
        Remove-Item "function.zip"
    }
    Compress-Archive -Path dist, node_modules, package.json -DestinationPath function.zip -Force

    $FUNCTION_NAME = "$PROJECT_NAME-$ServiceName"

    # Check if function exists
    try {
        aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION 2>$null

        # Update existing
        aws lambda update-function-code `
            --function-name $FUNCTION_NAME `
            --zip-file fileb://function.zip `
            --region $AWS_REGION | Out-Null

        Write-Host "    ✓ Updated $FUNCTION_NAME" -ForegroundColor Green
    } catch {
        # Create new
        aws lambda create-function `
            --function-name $FUNCTION_NAME `
            --runtime nodejs22.x `
            --handler $Handler `
            --zip-file fileb://function.zip `
            --role $ROLE_ARN `
            --timeout $Timeout `
            --memory-size $Memory `
            --region $AWS_REGION `
            --environment "Variables={AWS_REGION=$AWS_REGION,METRICS_TABLE=cloudops-metrics,COSTS_TABLE=cloudops-costs}" | Out-Null

        Write-Host "    ✓ Created $FUNCTION_NAME" -ForegroundColor Green
    }

    # Set log retention
    aws logs put-retention-policy `
        --log-group-name "/aws/lambda/$FUNCTION_NAME" `
        --retention-in-days 7 `
        --region $AWS_REGION 2>$null

    Pop-Location
}

# Deploy functions
Deploy-Lambda -ServiceName "api-gateway" -Handler "dist/server.handler" -Timeout 30 -Memory 512
Deploy-Lambda -ServiceName "data-collector" -Handler "dist/handlers/collect-metrics.handler" -Timeout 60 -Memory 512
Deploy-Lambda -ServiceName "alert-service" -Handler "dist/handlers/send-alert.handler" -Timeout 30 -Memory 256

Write-Host "✓ All Lambda functions deployed" -ForegroundColor Green
Write-Host ""

# Step 3: Create API Gateway
Write-Host "Step 3: Setting up API Gateway..." -ForegroundColor Yellow

$API_NAME = "$PROJECT_NAME-api"

$API_ID = (aws apigatewayv2 get-apis --region $AWS_REGION --query "Items[?Name=='$API_NAME'].ApiId" --output text)

if ([string]::IsNullOrEmpty($API_ID)) {
    $API_ID = (aws apigatewayv2 create-api `
        --name $API_NAME `
        --protocol-type HTTP `
        --cors-configuration AllowOrigins='*',AllowMethods='GET,POST,OPTIONS',AllowHeaders='*' `
        --region $AWS_REGION `
        --query 'ApiId' `
        --output text)

    Write-Host "  ✓ API Gateway created" -ForegroundColor Green
} else {
    Write-Host "  API Gateway already exists" -ForegroundColor Yellow
}

# Create integration
$LAMBDA_ARN = "arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:${PROJECT_NAME}-api-gateway"

$INTEGRATION_ID = (aws apigatewayv2 create-integration `
    --api-id $API_ID `
    --integration-type AWS_PROXY `
    --integration-uri $LAMBDA_ARN `
    --payload-format-version 2.0 `
    --region $AWS_REGION `
    --query 'IntegrationId' `
    --output text 2>$null)

if ([string]::IsNullOrEmpty($INTEGRATION_ID)) {
    $INTEGRATION_ID = (aws apigatewayv2 get-integrations --api-id $API_ID --region $AWS_REGION --query 'Items[0].IntegrationId' --output text)
}

# Create routes
$routes = @("GET /api/metrics", "GET /api/costs", "GET /api/health")
foreach ($route in $routes) {
    aws apigatewayv2 create-route `
        --api-id $API_ID `
        --route-key $route `
        --target "integrations/$INTEGRATION_ID" `
        --region $AWS_REGION 2>$null
}

# Create stage
aws apigatewayv2 create-stage `
    --api-id $API_ID `
    --stage-name '$default' `
    --auto-deploy `
    --region $AWS_REGION 2>$null

# Grant permission
aws lambda add-permission `
    --function-name "$PROJECT_NAME-api-gateway" `
    --statement-id apigateway-invoke `
    --action lambda:InvokeFunction `
    --principal apigatewayv2.amazonaws.com `
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${ACCOUNT_ID}:${API_ID}/*/*" `
    --region $AWS_REGION 2>$null

$API_ENDPOINT = "https://$API_ID.execute-api.$AWS_REGION.amazonaws.com"

Write-Host "✓ API Gateway ready: $API_ENDPOINT" -ForegroundColor Green
Write-Host ""

# Step 4: EventBridge Schedules
Write-Host "Step 4: Setting up EventBridge schedules..." -ForegroundColor Yellow

$RULE_NAME = "$PROJECT_NAME-collect-metrics"
$LAMBDA_ARN = "arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:${PROJECT_NAME}-data-collector"

aws events put-rule `
    --name $RULE_NAME `
    --schedule-expression "rate(5 minutes)" `
    --state ENABLED `
    --region $AWS_REGION 2>$null

aws events put-targets `
    --rule $RULE_NAME `
    --targets "Id=1,Arn=$LAMBDA_ARN" `
    --region $AWS_REGION 2>$null

aws lambda add-permission `
    --function-name "$PROJECT_NAME-data-collector" `
    --statement-id eventbridge-invoke-metrics `
    --action lambda:InvokeFunction `
    --principal events.amazonaws.com `
    --source-arn "arn:aws:events:${AWS_REGION}:${ACCOUNT_ID}:rule/${RULE_NAME}" `
    --region $AWS_REGION 2>$null

Write-Host "  ✓ Metrics collection scheduled (every 5 minutes)" -ForegroundColor Green

$RULE_NAME = "$PROJECT_NAME-collect-costs"

aws events put-rule `
    --name $RULE_NAME `
    --schedule-expression "cron(0 0 * * ? *)" `
    --state ENABLED `
    --region $AWS_REGION 2>$null

aws events put-targets `
    --rule $RULE_NAME `
    --targets "Id=1,Arn=$LAMBDA_ARN" `
    --region $AWS_REGION 2>$null

aws lambda add-permission `
    --function-name "$PROJECT_NAME-data-collector" `
    --statement-id eventbridge-invoke-costs `
    --action lambda:InvokeFunction `
    --principal events.amazonaws.com `
    --source-arn "arn:aws:events:${AWS_REGION}:${ACCOUNT_ID}:rule/${RULE_NAME}" `
    --region $AWS_REGION 2>$null

Write-Host "  ✓ Cost collection scheduled (daily)" -ForegroundColor Green
Write-Host "✓ EventBridge schedules configured" -ForegroundColor Green
Write-Host ""

# Step 5: Test
Write-Host "Step 5: Testing deployment..." -ForegroundColor Yellow

Write-Host "  Testing API Gateway..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_ENDPOINT/api/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ API Gateway is responding" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ API Gateway test failed: $_" -ForegroundColor Red
}

Write-Host "✓ Deployment complete!" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Summary" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "API Gateway URL:" -ForegroundColor Yellow
Write-Host "  $API_ENDPOINT" -ForegroundColor White
Write-Host ""
Write-Host "Lambda Functions:" -ForegroundColor Yellow
Write-Host "  - $PROJECT_NAME-api-gateway" -ForegroundColor White
Write-Host "  - $PROJECT_NAME-data-collector" -ForegroundColor White
Write-Host "  - $PROJECT_NAME-alert-service" -ForegroundColor White
Write-Host ""
Write-Host "DynamoDB Tables:" -ForegroundColor Yellow
Write-Host "  - cloudops-metrics" -ForegroundColor White
Write-Host "  - cloudops-costs" -ForegroundColor White
Write-Host ""
Write-Host "EventBridge Schedules:" -ForegroundColor Yellow
Write-Host "  - Metrics collection: Every 5 minutes" -ForegroundColor White
Write-Host "  - Cost collection: Daily at midnight UTC" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Set up billing alerts: .\deployment\setup-billing-alerts.bat" -ForegroundColor White
Write-Host "  2. Update frontend .env.local with API URL: $API_ENDPOINT" -ForegroundColor White
Write-Host "  3. Test locally: cd frontend\dashboard && pnpm dev" -ForegroundColor White
Write-Host "  4. Check CloudWatch Logs for any errors" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Your CloudOps platform is now live!" -ForegroundColor Green
