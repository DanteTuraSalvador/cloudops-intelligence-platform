# Create EC2 Instance for AWS Credit Task
$ErrorActionPreference = "Continue"

$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"

$REGION = "ap-southeast-2"
$INSTANCE_TYPE = "t3.micro"
$KEY_NAME = "cloudops-key"
$SG_NAME = "cloudops-ec2-sg"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Creating EC2 Instance" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Get the latest Amazon Linux 2023 AMI
Write-Host "Finding latest Amazon Linux 2023 AMI..." -ForegroundColor Yellow
$AMI_ID = aws ec2 describe-images `
    --owners amazon `
    --filters "Name=name,Values=al2023-ami-2023*-x86_64" "Name=state,Values=available" `
    --query "sort_by(Images, &CreationDate)[-1].ImageId" `
    --output text `
    --region $REGION

Write-Host "  AMI ID: $AMI_ID" -ForegroundColor Green

# Create key pair (if not exists)
Write-Host "Creating key pair..." -ForegroundColor Yellow
$keyExists = aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION 2>&1
if ($LASTEXITCODE -ne 0) {
    aws ec2 create-key-pair `
        --key-name $KEY_NAME `
        --query 'KeyMaterial' `
        --output text `
        --region $REGION | Out-File -FilePath "$env:USERPROFILE\$KEY_NAME.pem" -Encoding ASCII
    Write-Host "  Key pair created and saved to $env:USERPROFILE\$KEY_NAME.pem" -ForegroundColor Green
} else {
    Write-Host "  Key pair already exists" -ForegroundColor Gray
}

# Get default VPC
Write-Host "Getting default VPC..." -ForegroundColor Yellow
$VPC_ID = aws ec2 describe-vpcs `
    --filters "Name=isDefault,Values=true" `
    --query "Vpcs[0].VpcId" `
    --output text `
    --region $REGION
Write-Host "  VPC ID: $VPC_ID" -ForegroundColor Green

# Create security group (if not exists)
Write-Host "Creating security group..." -ForegroundColor Yellow
$sgExists = aws ec2 describe-security-groups --group-names $SG_NAME --region $REGION 2>&1
if ($LASTEXITCODE -ne 0) {
    $SG_ID = aws ec2 create-security-group `
        --group-name $SG_NAME `
        --description "CloudOps Platform EC2 Security Group" `
        --vpc-id $VPC_ID `
        --query 'GroupId' `
        --output text `
        --region $REGION

    # Add SSH rule
    aws ec2 authorize-security-group-ingress `
        --group-id $SG_ID `
        --protocol tcp `
        --port 22 `
        --cidr 0.0.0.0/0 `
        --region $REGION | Out-Null

    # Add HTTP rule
    aws ec2 authorize-security-group-ingress `
        --group-id $SG_ID `
        --protocol tcp `
        --port 80 `
        --cidr 0.0.0.0/0 `
        --region $REGION | Out-Null

    Write-Host "  Security Group ID: $SG_ID" -ForegroundColor Green
} else {
    $SG_ID = aws ec2 describe-security-groups `
        --group-names $SG_NAME `
        --query "SecurityGroups[0].GroupId" `
        --output text `
        --region $REGION
    Write-Host "  Security group already exists: $SG_ID" -ForegroundColor Gray
}

# Launch EC2 instance
Write-Host "Launching EC2 instance..." -ForegroundColor Yellow
$INSTANCE_ID = aws ec2 run-instances `
    --image-id $AMI_ID `
    --instance-type $INSTANCE_TYPE `
    --key-name $KEY_NAME `
    --security-group-ids $SG_ID `
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=CloudOps-Platform},{Key=Project,Value=CloudOps}]" `
    --query 'Instances[0].InstanceId' `
    --output text `
    --region $REGION

Write-Host "  Instance ID: $INSTANCE_ID" -ForegroundColor Green

# Wait for instance to be running
Write-Host "Waiting for instance to be running..." -ForegroundColor Yellow
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Get public IP
$PUBLIC_IP = aws ec2 describe-instances `
    --instance-ids $INSTANCE_ID `
    --query "Reservations[0].Instances[0].PublicIpAddress" `
    --output text `
    --region $REGION

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "EC2 Instance Created!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Instance ID: $INSTANCE_ID" -ForegroundColor Yellow
Write-Host "Public IP: $PUBLIC_IP" -ForegroundColor Yellow
Write-Host "Instance Type: $INSTANCE_TYPE (Free Tier)" -ForegroundColor Gray
Write-Host ""
Write-Host "To connect via SSH:" -ForegroundColor Cyan
Write-Host "  ssh -i $env:USERPROFILE\$KEY_NAME.pem ec2-user@$PUBLIC_IP" -ForegroundColor White
Write-Host ""
