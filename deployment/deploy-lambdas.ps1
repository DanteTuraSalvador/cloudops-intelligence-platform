# Deploy Lambda Functions to AWS
$ErrorActionPreference = "Stop"

# Add AWS CLI to PATH
$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"

# Configuration
$REGION = "ap-southeast-2"
$ROLE_ARN = "arn:aws:iam::695210052357:role/cloudops-lambda-role"
$PROJECT_ROOT = "C:\Users\Dante Salvador\Downloads\CloudOps Intelligence Platform"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Deploying Lambda Functions" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Function to create or update Lambda
function Deploy-LambdaFunction {
    param (
        [string]$FunctionName,
        [string]$Handler,
        [string]$ZipPath,
        [int]$Timeout = 30,
        [int]$Memory = 512,
        [hashtable]$EnvVars
    )

    Write-Host "Deploying $FunctionName..." -ForegroundColor Yellow

    # Check if function exists
    $exists = $false
    try {
        $null = aws lambda get-function --function-name $FunctionName --region $REGION 2>$null
        $exists = $true
        Write-Host "  Function exists, updating..." -ForegroundColor Gray
    } catch {
        Write-Host "  Function does not exist, creating..." -ForegroundColor Gray
    }

    # Build environment variables string
    $envString = "Variables={"
    $first = $true
    foreach ($key in $EnvVars.Keys) {
        if (-not $first) { $envString += "," }
        $envString += "$key=$($EnvVars[$key])"
        $first = $false
    }
    $envString += "}"

    if ($exists) {
        # Update function code
        aws lambda update-function-code `
            --function-name $FunctionName `
            --zip-file "fileb://$ZipPath" `
            --region $REGION | Out-Null

        # Wait for update to complete
        Start-Sleep -Seconds 2

        # Update configuration
        aws lambda update-function-configuration `
            --function-name $FunctionName `
            --timeout $Timeout `
            --memory-size $Memory `
            --environment $envString `
            --region $REGION | Out-Null
    } else {
        # Create new function
        aws lambda create-function `
            --function-name $FunctionName `
            --runtime nodejs22.x `
            --handler $Handler `
            --zip-file "fileb://$ZipPath" `
            --role $ROLE_ARN `
            --timeout $Timeout `
            --memory-size $Memory `
            --environment $envString `
            --region $REGION | Out-Null
    }

    Write-Host "  Deployed successfully!" -ForegroundColor Green
}

# Deploy API Gateway Lambda
Deploy-LambdaFunction `
    -FunctionName "cloudops-api-gateway" `
    -Handler "index.handler" `
    -ZipPath "$PROJECT_ROOT\services\api-gateway\function.zip" `
    -Timeout 30 `
    -Memory 512 `
    -EnvVars @{
        METRICS_TABLE = "cloudops-metrics"
        COSTS_TABLE = "cloudops-costs"
        NODE_ENV = "production"
    }

# Deploy Data Collector Lambda
Deploy-LambdaFunction `
    -FunctionName "cloudops-data-collector" `
    -Handler "index.handler" `
    -ZipPath "$PROJECT_ROOT\services\data-collector\function.zip" `
    -Timeout 60 `
    -Memory 512 `
    -EnvVars @{
        METRICS_TABLE = "cloudops-metrics"
        COSTS_TABLE = "cloudops-costs"
        USE_MOCK_DATA = "true"
    }

# Deploy Alert Service Lambda
Deploy-LambdaFunction `
    -FunctionName "cloudops-alert-service" `
    -Handler "index.handler" `
    -ZipPath "$PROJECT_ROOT\services\alert-service\function.zip" `
    -Timeout 30 `
    -Memory 256 `
    -EnvVars @{
        ALERTS_TABLE = "cloudops-alerts"
    }

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Lambda Functions Deployed!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# List deployed functions
Write-Host "Deployed Functions:" -ForegroundColor Yellow
aws lambda list-functions --region $REGION --query "Functions[?starts_with(FunctionName,'cloudops')].{Name:FunctionName,Runtime:Runtime,MemorySize:MemorySize}" --output table
