# Create IAM Role for Lambda Functions
$ErrorActionPreference = "Stop"

# Add AWS CLI to PATH
$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"

$REGION = "ap-southeast-2"
$ROLE_NAME = "cloudops-lambda-role"
$PROJECT_ROOT = "C:\Users\Dante Salvador\Downloads\CloudOps Intelligence Platform"

Write-Host "Creating IAM Role for Lambda..." -ForegroundColor Cyan

# Create the role
try {
    $result = aws iam create-role `
        --role-name $ROLE_NAME `
        --assume-role-policy-document "file://$PROJECT_ROOT/deployment/iam-policies/lambda-trust-policy.json" `
        --region $REGION `
        --output json 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Role created successfully!" -ForegroundColor Green
    } else {
        Write-Host "Role may already exist, continuing..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Role creation error (may already exist): $_" -ForegroundColor Yellow
}

# Wait for role to propagate
Write-Host "Waiting for role to propagate..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# Attach basic Lambda execution policy
Write-Host "Attaching AWSLambdaBasicExecutionRole policy..." -ForegroundColor Cyan
aws iam attach-role-policy `
    --role-name $ROLE_NAME `
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" `
    --region $REGION 2>&1

# Create custom policy for DynamoDB access
Write-Host "Creating custom DynamoDB policy..." -ForegroundColor Cyan

$customPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DynamoDBAccess",
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem"
            ],
            "Resource": [
                "arn:aws:dynamodb:ap-southeast-2:695210052357:table/cloudops-*"
            ]
        },
        {
            "Sid": "CloudWatchMetricsAccess",
            "Effect": "Allow",
            "Action": [
                "cloudwatch:GetMetricData",
                "cloudwatch:ListMetrics"
            ],
            "Resource": "*"
        },
        {
            "Sid": "CostExplorerAccess",
            "Effect": "Allow",
            "Action": [
                "ce:GetCostAndUsage"
            ],
            "Resource": "*"
        }
    ]
}
"@

# Save policy to temp file
$policyFile = "$env:TEMP\cloudops-policy.json"
$customPolicy | Out-File -FilePath $policyFile -Encoding UTF8 -Force

# Create or update inline policy
aws iam put-role-policy `
    --role-name $ROLE_NAME `
    --policy-name "cloudops-service-policy" `
    --policy-document "file://$policyFile" `
    --region $REGION 2>&1

Write-Host ""
Write-Host "IAM Role setup complete!" -ForegroundColor Green

# Get role ARN
$roleInfo = aws iam get-role --role-name $ROLE_NAME --region $REGION --output json | ConvertFrom-Json
Write-Host "Role ARN: $($roleInfo.Role.Arn)" -ForegroundColor Cyan
