#!/bin/bash
# LocalStack initialization script
# This script runs when LocalStack container starts

set -e

echo "=========================================="
echo "Initializing CloudOps AWS Resources..."
echo "=========================================="

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
until curl -s http://localhost:4566/_localstack/health | grep -q '"dynamodb": "running"'; do
  sleep 1
done
echo "LocalStack is ready!"

# ==========================================================================
# DynamoDB Tables
# ==========================================================================

echo "Creating DynamoDB tables..."

# Metrics Table
awslocal dynamodb create-table \
  --table-name cloudops-metrics-dev \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
    AttributeName=metricType,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --global-secondary-indexes \
    '[{
      "IndexName": "MetricTypeIndex",
      "KeySchema": [
        {"AttributeName": "metricType", "KeyType": "HASH"},
        {"AttributeName": "sk", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }]' \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "Table cloudops-metrics-dev already exists"

# Cost Table
awslocal dynamodb create-table \
  --table-name cloudops-costs-dev \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "Table cloudops-costs-dev already exists"

# Alerts Table
awslocal dynamodb create-table \
  --table-name cloudops-alerts-dev \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "Table cloudops-alerts-dev already exists"

# Recommendations Table
awslocal dynamodb create-table \
  --table-name cloudops-recommendations-dev \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "Table cloudops-recommendations-dev already exists"

echo "DynamoDB tables created successfully!"

# ==========================================================================
# S3 Buckets
# ==========================================================================

echo "Creating S3 buckets..."

awslocal s3 mb s3://cloudops-data-lake-dev 2>/dev/null || echo "Bucket cloudops-data-lake-dev already exists"
awslocal s3 mb s3://cloudops-frontend-dev 2>/dev/null || echo "Bucket cloudops-frontend-dev already exists"

echo "S3 buckets created successfully!"

# ==========================================================================
# SNS Topics
# ==========================================================================

echo "Creating SNS topics..."

awslocal sns create-topic --name cloudops-alerts-dev 2>/dev/null || echo "Topic cloudops-alerts-dev already exists"
awslocal sns create-topic --name cloudops-notifications-dev 2>/dev/null || echo "Topic cloudops-notifications-dev already exists"

echo "SNS topics created successfully!"

# ==========================================================================
# SQS Queues
# ==========================================================================

echo "Creating SQS queues..."

awslocal sqs create-queue --queue-name cloudops-metrics-queue-dev 2>/dev/null || echo "Queue cloudops-metrics-queue-dev already exists"
awslocal sqs create-queue --queue-name cloudops-cost-queue-dev 2>/dev/null || echo "Queue cloudops-cost-queue-dev already exists"

echo "SQS queues created successfully!"

# ==========================================================================
# Secrets Manager
# ==========================================================================

echo "Creating secrets..."

awslocal secretsmanager create-secret \
  --name cloudops/dev/api-keys \
  --secret-string '{"api_key":"dev-api-key-12345"}' \
  2>/dev/null || echo "Secret cloudops/dev/api-keys already exists"

echo "Secrets created successfully!"

echo "=========================================="
echo "CloudOps AWS Resources Initialized!"
echo "=========================================="

# List created resources
echo ""
echo "DynamoDB Tables:"
awslocal dynamodb list-tables

echo ""
echo "S3 Buckets:"
awslocal s3 ls

echo ""
echo "SNS Topics:"
awslocal sns list-topics

echo ""
echo "SQS Queues:"
awslocal sqs list-queues
