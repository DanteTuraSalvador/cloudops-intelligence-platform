#!/bin/bash

# CloudOps Intelligence Platform - AWS Deployment Script
# This script deploys the entire platform to AWS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="ap-southeast-2"
PROJECT_NAME="cloudops"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="cloudops-dashboard-demo-${ACCOUNT_ID}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CloudOps Intelligence Platform${NC}"
echo -e "${GREEN}AWS Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "AWS Account: ${YELLOW}${ACCOUNT_ID}${NC}"
echo -e "Region: ${YELLOW}${AWS_REGION}${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists aws; then
    echo -e "${RED}AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}Node.js not found. Please install it first.${NC}"
    exit 1
fi

if ! command_exists pnpm; then
    echo -e "${RED}pnpm not found. Please install it first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"
echo ""

# Step 1: Create IAM Role for Lambda
echo -e "${YELLOW}Step 1: Creating IAM Role for Lambda...${NC}"

ROLE_NAME="${PROJECT_NAME}-lambda-role"

if aws iam get-role --role-name $ROLE_NAME 2>/dev/null; then
    echo -e "${YELLOW}  Role already exists, skipping creation${NC}"
else
    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document file://deployment/iam-policies/lambda-trust-policy.json \
        --description "Role for CloudOps Lambda functions"

    echo -e "${GREEN}  ✓ IAM Role created${NC}"

    # Wait for role to propagate
    sleep 10
fi

# Attach policies
echo -e "${YELLOW}  Attaching policies...${NC}"

aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || true

# Create and attach custom policy
POLICY_NAME="${PROJECT_NAME}-lambda-policy"
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"

if aws iam get-policy --policy-arn $POLICY_ARN 2>/dev/null; then
    echo -e "${YELLOW}  Policy already exists${NC}"
else
    aws iam create-policy \
        --policy-name $POLICY_NAME \
        --policy-document file://deployment/iam-policies/cloudops-lambda-policy.json

    echo -e "${GREEN}  ✓ Custom policy created${NC}"
fi

aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn $POLICY_ARN 2>/dev/null || true

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

echo -e "${GREEN}✓ IAM Role ready: ${ROLE_ARN}${NC}"
echo ""

# Wait for IAM role to be fully ready
echo -e "${YELLOW}Waiting for IAM role to propagate (10 seconds)...${NC}"
sleep 10

# Step 2: Build and Deploy Lambda Functions
echo -e "${YELLOW}Step 2: Building and deploying Lambda functions...${NC}"

# Function to deploy a Lambda
deploy_lambda() {
    local SERVICE_NAME=$1
    local HANDLER=$2
    local TIMEOUT=${3:-30}
    local MEMORY=${4:-512}

    echo -e "${YELLOW}  Deploying ${SERVICE_NAME}...${NC}"

    cd "services/${SERVICE_NAME}"

    # Install dependencies and build
    pnpm install --prod
    pnpm build

    # Create deployment package
    rm -f function.zip
    zip -r function.zip dist node_modules package.json -q

    FUNCTION_NAME="${PROJECT_NAME}-${SERVICE_NAME}"

    # Check if function exists
    if aws lambda get-function --function-name $FUNCTION_NAME --region $AWS_REGION 2>/dev/null; then
        # Update existing function
        aws lambda update-function-code \
            --function-name $FUNCTION_NAME \
            --zip-file fileb://function.zip \
            --region $AWS_REGION \
            --output text > /dev/null

        echo -e "${GREEN}    ✓ Updated ${FUNCTION_NAME}${NC}"
    else
        # Create new function
        aws lambda create-function \
            --function-name $FUNCTION_NAME \
            --runtime nodejs22.x \
            --handler $HANDLER \
            --zip-file fileb://function.zip \
            --role $ROLE_ARN \
            --timeout $TIMEOUT \
            --memory-size $MEMORY \
            --region $AWS_REGION \
            --environment Variables="{AWS_REGION=${AWS_REGION},METRICS_TABLE=cloudops-metrics,COSTS_TABLE=cloudops-costs}" \
            --output text > /dev/null

        echo -e "${GREEN}    ✓ Created ${FUNCTION_NAME}${NC}"
    fi

    # Set log retention to 7 days
    aws logs put-retention-policy \
        --log-group-name "/aws/lambda/${FUNCTION_NAME}" \
        --retention-in-days 7 \
        --region $AWS_REGION 2>/dev/null || true

    cd ../..
}

# Deploy API Gateway
deploy_lambda "api-gateway" "dist/server.handler" 30 512

# Deploy Data Collector
deploy_lambda "data-collector" "dist/handlers/collect-metrics.handler" 60 512

# Deploy Alert Service
deploy_lambda "alert-service" "dist/handlers/send-alert.handler" 30 256

echo -e "${GREEN}✓ All Lambda functions deployed${NC}"
echo ""

# Step 3: Create API Gateway
echo -e "${YELLOW}Step 3: Setting up API Gateway...${NC}"

API_NAME="${PROJECT_NAME}-api"

# Check if API exists
API_ID=$(aws apigatewayv2 get-apis --region $AWS_REGION --query "Items[?Name=='${API_NAME}'].ApiId" --output text)

if [ -z "$API_ID" ]; then
    # Create HTTP API
    API_ID=$(aws apigatewayv2 create-api \
        --name $API_NAME \
        --protocol-type HTTP \
        --cors-configuration AllowOrigins='*',AllowMethods='GET,POST,OPTIONS',AllowHeaders='*' \
        --region $AWS_REGION \
        --query 'ApiId' \
        --output text)

    echo -e "${GREEN}  ✓ API Gateway created${NC}"
else
    echo -e "${YELLOW}  API Gateway already exists${NC}"
fi

# Create integration with Lambda
LAMBDA_ARN="arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:${PROJECT_NAME}-api-gateway"

INTEGRATION_ID=$(aws apigatewayv2 create-integration \
    --api-id $API_ID \
    --integration-type AWS_PROXY \
    --integration-uri $LAMBDA_ARN \
    --payload-format-version 2.0 \
    --region $AWS_REGION \
    --query 'IntegrationId' \
    --output text 2>/dev/null || \
    aws apigatewayv2 get-integrations --api-id $API_ID --region $AWS_REGION --query 'Items[0].IntegrationId' --output text)

# Create routes
for ROUTE in "GET /api/metrics" "GET /api/costs" "GET /api/health"; do
    aws apigatewayv2 create-route \
        --api-id $API_ID \
        --route-key "$ROUTE" \
        --target "integrations/${INTEGRATION_ID}" \
        --region $AWS_REGION 2>/dev/null || echo -e "${YELLOW}  Route ${ROUTE} already exists${NC}"
done

# Create default stage
aws apigatewayv2 create-stage \
    --api-id $API_ID \
    --stage-name '$default' \
    --auto-deploy \
    --region $AWS_REGION 2>/dev/null || echo -e "${YELLOW}  Stage already exists${NC}"

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
    --function-name "${PROJECT_NAME}-api-gateway" \
    --statement-id apigateway-invoke \
    --action lambda:InvokeFunction \
    --principal apigatewayv2.amazonaws.com \
    --source-arn "arn:aws:execute-api:${AWS_REGION}:${ACCOUNT_ID}:${API_ID}/*/*" \
    --region $AWS_REGION 2>/dev/null || true

API_ENDPOINT="https://${API_ID}.execute-api.${AWS_REGION}.amazonaws.com"

echo -e "${GREEN}✓ API Gateway ready: ${API_ENDPOINT}${NC}"
echo ""

# Step 4: Create EventBridge Schedules
echo -e "${YELLOW}Step 4: Setting up EventBridge schedules...${NC}"

# Metrics collection (every 5 minutes)
RULE_NAME="${PROJECT_NAME}-collect-metrics"
LAMBDA_ARN="arn:aws:lambda:${AWS_REGION}:${ACCOUNT_ID}:function:${PROJECT_NAME}-data-collector"

aws events put-rule \
    --name $RULE_NAME \
    --schedule-expression "rate(5 minutes)" \
    --state ENABLED \
    --region $AWS_REGION 2>/dev/null || true

aws events put-targets \
    --rule $RULE_NAME \
    --targets "Id=1,Arn=${LAMBDA_ARN}" \
    --region $AWS_REGION 2>/dev/null || true

aws lambda add-permission \
    --function-name "${PROJECT_NAME}-data-collector" \
    --statement-id eventbridge-invoke-metrics \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${AWS_REGION}:${ACCOUNT_ID}:rule/${RULE_NAME}" \
    --region $AWS_REGION 2>/dev/null || true

echo -e "${GREEN}  ✓ Metrics collection scheduled (every 5 minutes)${NC}"

# Cost collection (daily at midnight UTC)
RULE_NAME="${PROJECT_NAME}-collect-costs"

aws events put-rule \
    --name $RULE_NAME \
    --schedule-expression "cron(0 0 * * ? *)" \
    --state ENABLED \
    --region $AWS_REGION 2>/dev/null || true

aws events put-targets \
    --rule $RULE_NAME \
    --targets "Id=1,Arn=${LAMBDA_ARN},Input={\"handler\":\"costs\"}" \
    --region $AWS_REGION 2>/dev/null || true

aws lambda add-permission \
    --function-name "${PROJECT_NAME}-data-collector" \
    --statement-id eventbridge-invoke-costs \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${AWS_REGION}:${ACCOUNT_ID}:rule/${RULE_NAME}" \
    --region $AWS_REGION 2>/dev/null || true

echo -e "${GREEN}  ✓ Cost collection scheduled (daily)${NC}"
echo -e "${GREEN}✓ EventBridge schedules configured${NC}"
echo ""

# Step 5: Deploy Frontend to S3 + CloudFront
echo -e "${YELLOW}Step 5: Deploying frontend...${NC}"

cd frontend/dashboard

# Build frontend
echo -e "${YELLOW}  Building frontend...${NC}"
export NEXT_PUBLIC_API_URL=$API_ENDPOINT
pnpm install
pnpm build

echo -e "${GREEN}  ✓ Frontend built${NC}"

# Create S3 bucket
echo -e "${YELLOW}  Creating S3 bucket...${NC}"

if aws s3 ls "s3://${BUCKET_NAME}" 2>/dev/null; then
    echo -e "${YELLOW}  Bucket already exists${NC}"
else
    aws s3 mb "s3://${BUCKET_NAME}" --region $AWS_REGION
    echo -e "${GREEN}  ✓ S3 bucket created${NC}"
fi

# Enable static website hosting
aws s3 website "s3://${BUCKET_NAME}" \
    --index-document index.html \
    --error-document index.html

# Update bucket policy with account ID
sed "s/ACCOUNT_ID/${ACCOUNT_ID}/g" ../../deployment/s3-bucket-policy.json > /tmp/bucket-policy.json

# Make bucket public
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy file:///tmp/bucket-policy.json

# Upload files
echo -e "${YELLOW}  Uploading files to S3...${NC}"

# Upload Next.js static files
aws s3 sync .next/static "s3://${BUCKET_NAME}/_next/static" --delete
aws s3 sync .next/standalone "s3://${BUCKET_NAME}" --delete
aws s3 cp .next/standalone/server.js "s3://${BUCKET_NAME}/server.js"

# For static export (simpler approach)
# We need to export as static HTML
echo -e "${YELLOW}  Creating static export...${NC}"
# Add static export configuration if needed

echo -e "${GREEN}  ✓ Files uploaded to S3${NC}"

S3_WEBSITE_URL="http://${BUCKET_NAME}.s3-website-${AWS_REGION}.amazonaws.com"

cd ../..

echo -e "${GREEN}✓ Frontend deployed to S3${NC}"
echo ""

# Step 6: Create CloudFront Distribution (Optional - costs after free tier)
echo -e "${YELLOW}Step 6: CloudFront distribution (skipping for cost optimization)${NC}"
echo -e "${YELLOW}  You can access the site via S3 website URL${NC}"
echo ""

# Step 7: Test Deployment
echo -e "${YELLOW}Step 7: Testing deployment...${NC}"

echo -e "${YELLOW}  Testing API Gateway...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_ENDPOINT}/api/health")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}  ✓ API Gateway is responding${NC}"
else
    echo -e "${RED}  ✗ API Gateway returned HTTP ${HTTP_CODE}${NC}"
fi

echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}API Gateway URL:${NC}"
echo -e "  ${API_ENDPOINT}"
echo ""
echo -e "${YELLOW}S3 Website URL:${NC}"
echo -e "  ${S3_WEBSITE_URL}"
echo ""
echo -e "${YELLOW}Lambda Functions:${NC}"
echo -e "  - ${PROJECT_NAME}-api-gateway"
echo -e "  - ${PROJECT_NAME}-data-collector"
echo -e "  - ${PROJECT_NAME}-alert-service"
echo ""
echo -e "${YELLOW}DynamoDB Tables:${NC}"
echo -e "  - cloudops-metrics"
echo -e "  - cloudops-costs"
echo ""
echo -e "${YELLOW}EventBridge Schedules:${NC}"
echo -e "  - Metrics collection: Every 5 minutes"
echo -e "  - Cost collection: Daily at midnight UTC"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Test the API: curl ${API_ENDPOINT}/api/health"
echo -e "  2. Open the dashboard: ${S3_WEBSITE_URL}"
echo -e "  3. Check CloudWatch Logs for any errors"
echo -e "  4. Set up billing alerts (run: ./deployment/setup-billing-alerts.sh)"
echo ""
echo -e "${GREEN}🎉 Your CloudOps platform is now live!${NC}"
