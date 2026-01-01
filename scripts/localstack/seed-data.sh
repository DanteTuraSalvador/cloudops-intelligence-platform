#!/bin/bash
# Seed demo data for development and demos

set -e

echo "=========================================="
echo "Seeding CloudOps Demo Data..."
echo "=========================================="

ACCOUNT_ID="demo-account-001"
CURRENT_DATE=$(date +%Y-%m-%d)
CURRENT_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ==========================================================================
# Seed Metrics Data
# ==========================================================================

echo "Seeding metrics data..."

# CPU Utilization metrics
for i in {1..24}; do
  HOUR=$(printf "%02d" $((i-1)))
  TIMESTAMP="${CURRENT_DATE}T${HOUR}:00:00Z"
  VALUE=$((30 + RANDOM % 50))

  awslocal dynamodb put-item \
    --table-name cloudops-metrics-dev \
    --item '{
      "pk": {"S": "'${ACCOUNT_ID}'#CPUUtilization"},
      "sk": {"S": "'${TIMESTAMP}'"},
      "accountId": {"S": "'${ACCOUNT_ID}'"},
      "metricType": {"S": "CPUUtilization"},
      "value": {"N": "'${VALUE}'"},
      "unit": {"S": "Percent"},
      "createdAt": {"S": "'${CURRENT_TS}'"}
    }' 2>/dev/null
done

# Memory Utilization metrics
for i in {1..24}; do
  HOUR=$(printf "%02d" $((i-1)))
  TIMESTAMP="${CURRENT_DATE}T${HOUR}:00:00Z"
  VALUE=$((40 + RANDOM % 40))

  awslocal dynamodb put-item \
    --table-name cloudops-metrics-dev \
    --item '{
      "pk": {"S": "'${ACCOUNT_ID}'#MemoryUtilization"},
      "sk": {"S": "'${TIMESTAMP}'"},
      "accountId": {"S": "'${ACCOUNT_ID}'"},
      "metricType": {"S": "MemoryUtilization"},
      "value": {"N": "'${VALUE}'"},
      "unit": {"S": "Percent"},
      "createdAt": {"S": "'${CURRENT_TS}'"}
    }' 2>/dev/null
done

echo "Metrics data seeded!"

# ==========================================================================
# Seed Cost Data
# ==========================================================================

echo "Seeding cost data..."

# Cost data for the last 30 days
for i in {0..29}; do
  DATE=$(date -d "-${i} days" +%Y-%m-%d 2>/dev/null || date -v-${i}d +%Y-%m-%d)
  EC2_COST=$((50 + RANDOM % 30))
  RDS_COST=$((30 + RANDOM % 20))
  LAMBDA_COST=$((5 + RANDOM % 10))
  S3_COST=$((3 + RANDOM % 5))
  TOTAL_COST=$((EC2_COST + RDS_COST + LAMBDA_COST + S3_COST))

  awslocal dynamodb put-item \
    --table-name cloudops-costs-dev \
    --item '{
      "pk": {"S": "'${ACCOUNT_ID}'#cost"},
      "sk": {"S": "'${DATE}'"},
      "accountId": {"S": "'${ACCOUNT_ID}'"},
      "date": {"S": "'${DATE}'"},
      "totalCost": {"N": "'${TOTAL_COST}'"},
      "currency": {"S": "USD"},
      "breakdown": {"L": [
        {"M": {"service": {"S": "EC2"}, "cost": {"N": "'${EC2_COST}'"}}},
        {"M": {"service": {"S": "RDS"}, "cost": {"N": "'${RDS_COST}'"}}},
        {"M": {"service": {"S": "Lambda"}, "cost": {"N": "'${LAMBDA_COST}'"}}},
        {"M": {"service": {"S": "S3"}, "cost": {"N": "'${S3_COST}'"}}}
      ]},
      "createdAt": {"S": "'${CURRENT_TS}'"}
    }' 2>/dev/null
done

echo "Cost data seeded!"

# ==========================================================================
# Seed Alerts Data
# ==========================================================================

echo "Seeding alerts data..."

awslocal dynamodb put-item \
  --table-name cloudops-alerts-dev \
  --item '{
    "pk": {"S": "'${ACCOUNT_ID}'#alert"},
    "sk": {"S": "'${CURRENT_TS}'#alert-001"},
    "id": {"S": "alert-001"},
    "accountId": {"S": "'${ACCOUNT_ID}'"},
    "type": {"S": "threshold"},
    "title": {"S": "High CPU Utilization"},
    "message": {"S": "CPU utilization exceeded 80% threshold on i-1234567890abcdef0"},
    "severity": {"S": "warning"},
    "status": {"S": "active"},
    "createdAt": {"S": "'${CURRENT_TS}'"}
  }' 2>/dev/null

awslocal dynamodb put-item \
  --table-name cloudops-alerts-dev \
  --item '{
    "pk": {"S": "'${ACCOUNT_ID}'#alert"},
    "sk": {"S": "'${CURRENT_TS}'#alert-002"},
    "id": {"S": "alert-002"},
    "accountId": {"S": "'${ACCOUNT_ID}'"},
    "type": {"S": "budget"},
    "title": {"S": "Monthly Budget Warning"},
    "message": {"S": "Current spending is at 75% of monthly budget ($750/$1000)"},
    "severity": {"S": "info"},
    "status": {"S": "active"},
    "createdAt": {"S": "'${CURRENT_TS}'"}
  }' 2>/dev/null

echo "Alerts data seeded!"

# ==========================================================================
# Seed Recommendations Data
# ==========================================================================

echo "Seeding recommendations data..."

awslocal dynamodb put-item \
  --table-name cloudops-recommendations-dev \
  --item '{
    "pk": {"S": "'${ACCOUNT_ID}'#recommendation"},
    "sk": {"S": "'${CURRENT_TS}'#rec-001"},
    "id": {"S": "rec-001"},
    "accountId": {"S": "'${ACCOUNT_ID}'"},
    "type": {"S": "rightsize"},
    "resourceId": {"S": "i-1234567890abcdef0"},
    "resourceType": {"S": "EC2"},
    "title": {"S": "Rightsize EC2 Instance"},
    "description": {"S": "Instance i-1234567890abcdef0 is underutilized. Consider downsizing from m5.xlarge to m5.large."},
    "estimatedSavings": {"N": "45"},
    "currency": {"S": "USD"},
    "priority": {"S": "high"},
    "status": {"S": "pending"},
    "createdAt": {"S": "'${CURRENT_TS}'"}
  }' 2>/dev/null

awslocal dynamodb put-item \
  --table-name cloudops-recommendations-dev \
  --item '{
    "pk": {"S": "'${ACCOUNT_ID}'#recommendation"},
    "sk": {"S": "'${CURRENT_TS}'#rec-002"},
    "id": {"S": "rec-002"},
    "accountId": {"S": "'${ACCOUNT_ID}'"},
    "type": {"S": "unused_ebs"},
    "resourceId": {"S": "vol-0abc123def456789"},
    "resourceType": {"S": "EBS"},
    "title": {"S": "Delete Unused EBS Volume"},
    "description": {"S": "EBS volume vol-0abc123def456789 has been detached for over 30 days."},
    "estimatedSavings": {"N": "10"},
    "currency": {"S": "USD"},
    "priority": {"S": "medium"},
    "status": {"S": "pending"},
    "createdAt": {"S": "'${CURRENT_TS}'"}
  }' 2>/dev/null

echo "Recommendations data seeded!"

echo "=========================================="
echo "Demo Data Seeding Complete!"
echo "=========================================="
