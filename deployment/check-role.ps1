$env:Path += ";C:\Program Files\Amazon\AWSCLIV2"
aws iam get-role --role-name cloudops-lambda-role --query 'Role.Arn' --output text
