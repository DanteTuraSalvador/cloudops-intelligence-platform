$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$REGION = "ap-southeast-2"
$ROLE_NAME = "cloudops-lambda-role"

Write-Host "Updating IAM policy for Lambda role..." -ForegroundColor Cyan

$policy = '{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "DynamoDBFullAccess",
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:BatchWriteItem",
                "dynamodb:BatchGetItem"
            ],
            "Resource": [
                "arn:aws:dynamodb:ap-southeast-2:695210052357:table/cloudops-*",
                "arn:aws:dynamodb:ap-southeast-2:695210052357:table/cloudops-*/index/*"
            ]
        },
        {
            "Sid": "CloudWatchMetricsAccess",
            "Effect": "Allow",
            "Action": [
                "cloudwatch:GetMetricData",
                "cloudwatch:ListMetrics",
                "cloudwatch:GetMetricStatistics"
            ],
            "Resource": "*"
        },
        {
            "Sid": "CostExplorerAccess",
            "Effect": "Allow",
            "Action": [
                "ce:GetCostAndUsage",
                "ce:GetCostForecast"
            ],
            "Resource": "*"
        },
        {
            "Sid": "SNSAccess",
            "Effect": "Allow",
            "Action": [
                "sns:Publish"
            ],
            "Resource": "arn:aws:sns:ap-southeast-2:695210052357:cloudops-*"
        }
    ]
}'

# Save policy to temp file
$policyFile = "$env:TEMP\cloudops-policy.json"
$policy | Out-File -FilePath $policyFile -Encoding UTF8 -Force

# Update inline policy
aws iam put-role-policy `
    --role-name $ROLE_NAME `
    --policy-name "cloudops-service-policy" `
    --policy-document "file://$policyFile" `
    --region $REGION

Write-Host "Policy updated successfully!" -ForegroundColor Green
