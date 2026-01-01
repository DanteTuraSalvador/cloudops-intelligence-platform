$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$REGION = "ap-southeast-2"
$BUCKET_NAME = "cloudops-dashboard-695210052357"
$PROJECT_ROOT = "C:\Users\Dante Salvador\Downloads\CloudOps Intelligence Platform"

Write-Host "Applying bucket policy..." -ForegroundColor Cyan

aws s3api put-bucket-policy `
    --bucket $BUCKET_NAME `
    --policy "file://$PROJECT_ROOT/deployment/bucket-policy.json" `
    --region $REGION

if ($LASTEXITCODE -eq 0) {
    Write-Host "Bucket policy applied!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Website URL: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com" -ForegroundColor Yellow
} else {
    Write-Host "Failed to apply bucket policy" -ForegroundColor Red
}
