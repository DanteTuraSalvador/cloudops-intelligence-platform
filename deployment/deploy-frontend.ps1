# Deploy Frontend to S3
$ErrorActionPreference = "Continue"

$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"

$REGION = "ap-southeast-2"
$BUCKET_NAME = "cloudops-dashboard-695210052357"
$PROJECT_ROOT = "C:\Users\Dante Salvador\Downloads\CloudOps Intelligence Platform"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Deploying Frontend to S3" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Create S3 bucket
Write-Host "Creating S3 bucket: $BUCKET_NAME..." -ForegroundColor Yellow
aws s3 mb "s3://$BUCKET_NAME" --region $REGION 2>&1 | Out-Null

# Disable block public access
Write-Host "Configuring public access..." -ForegroundColor Yellow
aws s3api put-public-access-block `
    --bucket $BUCKET_NAME `
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" `
    --region $REGION

# Enable static website hosting
Write-Host "Enabling static website hosting..." -ForegroundColor Yellow
aws s3 website "s3://$BUCKET_NAME" `
    --index-document index.html `
    --error-document 404.html `
    --region $REGION

# Create bucket policy for public read access
$policy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
        }
    ]
}
"@

$policyFile = "$env:TEMP\bucket-policy.json"
$policy | Out-File -FilePath $policyFile -Encoding UTF8 -Force

Write-Host "Applying bucket policy..." -ForegroundColor Yellow
aws s3api put-bucket-policy `
    --bucket $BUCKET_NAME `
    --policy "file://$policyFile" `
    --region $REGION

# Upload files
Write-Host "Uploading frontend files..." -ForegroundColor Yellow
aws s3 sync "$PROJECT_ROOT\frontend\dashboard\out" "s3://$BUCKET_NAME" `
    --delete `
    --region $REGION

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Frontend Deployed!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Website URL: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com" -ForegroundColor Yellow
Write-Host ""
