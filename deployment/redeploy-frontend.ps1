$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"

$REGION = "ap-southeast-2"
$BUCKET_NAME = "cloudops-dashboard-695210052357"
$PROJECT_ROOT = "C:\Users\Dante Salvador\Downloads\CloudOps Intelligence Platform"

Write-Host "Re-uploading frontend files to S3..." -ForegroundColor Cyan

# Sync files (delete old ones)
aws s3 sync "$PROJECT_ROOT\frontend\dashboard\out" "s3://$BUCKET_NAME" `
    --delete `
    --region $REGION

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
Write-Host ""
Write-Host "Website URL: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com" -ForegroundColor Yellow
