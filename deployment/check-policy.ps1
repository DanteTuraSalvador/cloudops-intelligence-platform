$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
aws iam get-role-policy --role-name cloudops-lambda-role --policy-name cloudops-service-policy --output json
