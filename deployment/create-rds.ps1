# Create RDS PostgreSQL Instance for AWS Credit Task
$ErrorActionPreference = "Continue"

$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"

$REGION = "ap-southeast-2"
$DB_INSTANCE_ID = "cloudops-db"
$DB_INSTANCE_CLASS = "db.t3.micro"
$DB_ENGINE = "postgres"
$DB_NAME = "cloudops"
$DB_USERNAME = "cloudops_admin"
$DB_PASSWORD = "CloudOps2026!"  # In production, use Secrets Manager
$ALLOCATED_STORAGE = 20

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Creating RDS PostgreSQL Database" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Get default VPC
Write-Host "Getting default VPC..." -ForegroundColor Yellow
$VPC_ID = aws ec2 describe-vpcs `
    --filters "Name=isDefault,Values=true" `
    --query "Vpcs[0].VpcId" `
    --output text `
    --region $REGION
Write-Host "  VPC ID: $VPC_ID" -ForegroundColor Green

# Create security group for RDS
Write-Host "Creating RDS security group..." -ForegroundColor Yellow
$SG_NAME = "cloudops-rds-sg"
$sgExists = aws ec2 describe-security-groups --group-names $SG_NAME --region $REGION 2>&1

if ($LASTEXITCODE -ne 0) {
    $RDS_SG_ID = aws ec2 create-security-group `
        --group-name $SG_NAME `
        --description "CloudOps RDS Security Group" `
        --vpc-id $VPC_ID `
        --query 'GroupId' `
        --output text `
        --region $REGION

    # Allow PostgreSQL access from anywhere (for demo - restrict in production)
    aws ec2 authorize-security-group-ingress `
        --group-id $RDS_SG_ID `
        --protocol tcp `
        --port 5432 `
        --cidr 0.0.0.0/0 `
        --region $REGION | Out-Null

    Write-Host "  Security Group ID: $RDS_SG_ID" -ForegroundColor Green
} else {
    $RDS_SG_ID = aws ec2 describe-security-groups `
        --group-names $SG_NAME `
        --query "SecurityGroups[0].GroupId" `
        --output text `
        --region $REGION
    Write-Host "  Security group already exists: $RDS_SG_ID" -ForegroundColor Gray
}

# Check if RDS instance already exists
Write-Host "Checking for existing RDS instance..." -ForegroundColor Yellow
$dbExists = aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_ID --region $REGION 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  RDS instance already exists!" -ForegroundColor Yellow
    $DB_ENDPOINT = aws rds describe-db-instances `
        --db-instance-identifier $DB_INSTANCE_ID `
        --query "DBInstances[0].Endpoint.Address" `
        --output text `
        --region $REGION
} else {
    # Create RDS instance
    Write-Host "Creating RDS PostgreSQL instance..." -ForegroundColor Yellow
    Write-Host "  This may take 5-10 minutes..." -ForegroundColor Gray

    aws rds create-db-instance `
        --db-instance-identifier $DB_INSTANCE_ID `
        --db-instance-class $DB_INSTANCE_CLASS `
        --engine $DB_ENGINE `
        --engine-version "16.3" `
        --master-username $DB_USERNAME `
        --master-user-password $DB_PASSWORD `
        --allocated-storage $ALLOCATED_STORAGE `
        --db-name $DB_NAME `
        --vpc-security-group-ids $RDS_SG_ID `
        --no-multi-az `
        --publicly-accessible `
        --backup-retention-period 0 `
        --storage-type gp2 `
        --tags "Key=Name,Value=CloudOps-Database" "Key=Project,Value=CloudOps" `
        --region $REGION | Out-Null

    Write-Host "  RDS instance creation initiated!" -ForegroundColor Green

    # Wait for RDS to be available
    Write-Host "Waiting for RDS instance to be available..." -ForegroundColor Yellow
    Write-Host "  (This typically takes 5-10 minutes)" -ForegroundColor Gray

    aws rds wait db-instance-available --db-instance-identifier $DB_INSTANCE_ID --region $REGION

    # Get endpoint
    $DB_ENDPOINT = aws rds describe-db-instances `
        --db-instance-identifier $DB_INSTANCE_ID `
        --query "DBInstances[0].Endpoint.Address" `
        --output text `
        --region $REGION
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "RDS Database Created!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Instance ID: $DB_INSTANCE_ID" -ForegroundColor Yellow
Write-Host "Endpoint: $DB_ENDPOINT" -ForegroundColor Yellow
Write-Host "Port: 5432" -ForegroundColor Yellow
Write-Host "Database: $DB_NAME" -ForegroundColor Yellow
Write-Host "Username: $DB_USERNAME" -ForegroundColor Yellow
Write-Host "Instance Class: $DB_INSTANCE_CLASS (Free Tier)" -ForegroundColor Gray
Write-Host ""
Write-Host "Connection string:" -ForegroundColor Cyan
Write-Host "  postgresql://${DB_USERNAME}:****@${DB_ENDPOINT}:5432/${DB_NAME}" -ForegroundColor White
Write-Host ""
