$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
$REGION = "ap-southeast-2"

Write-Host "Checking DynamoDB Tables..." -ForegroundColor Cyan
Write-Host ""

# List tables
Write-Host "Tables:" -ForegroundColor Yellow
aws dynamodb list-tables --region $REGION --query "TableNames[?contains(@,'cloudops')]" --output table

Write-Host ""
Write-Host "Table Details:" -ForegroundColor Yellow

$tables = @("cloudops-metrics", "cloudops-costs", "cloudops-alerts")

foreach ($table in $tables) {
    Write-Host ""
    Write-Host "=== $table ===" -ForegroundColor Cyan

    # Get table info
    $info = aws dynamodb describe-table --table-name $table --region $REGION --output json 2>&1 | ConvertFrom-Json

    if ($info.Table) {
        Write-Host "  Status: $($info.Table.TableStatus)" -ForegroundColor Green
        Write-Host "  Items: $($info.Table.ItemCount)"
        Write-Host "  Size: $($info.Table.TableSizeBytes) bytes"
    } else {
        Write-Host "  Table not found" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Sample Data from cloudops-metrics:" -ForegroundColor Yellow
aws dynamodb scan --table-name cloudops-metrics --region $REGION --limit 3 --output json | ConvertFrom-Json | Select-Object -ExpandProperty Items | ForEach-Object {
    Write-Host "  - $($_.metricType.S): $($_.value.N) $($_.unit.S)"
}
