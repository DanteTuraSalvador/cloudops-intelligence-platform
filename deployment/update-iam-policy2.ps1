$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$ROLE_NAME = "cloudops-lambda-role"
$PROJECT_ROOT = "C:\Users\Dante Salvador\Downloads\CloudOps Intelligence Platform"

Write-Host "Updating IAM policy for Lambda role..." -ForegroundColor Cyan

aws iam put-role-policy `
    --role-name $ROLE_NAME `
    --policy-name "cloudops-service-policy" `
    --policy-document "file://$PROJECT_ROOT/deployment/iam-policies/cloudops-service-policy.json"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Policy updated successfully!" -ForegroundColor Green
} else {
    Write-Host "Policy update failed!" -ForegroundColor Red
}
