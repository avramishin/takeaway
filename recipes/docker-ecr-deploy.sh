#!/bin/bash
# Script to build exchange_data_service and push in to AWS ECR
aws ecr get-login --no-include-email --region us-east-1 | /bin/bash
docker build -f dockerfile-staging -t wallet_integration_service-staging .
docker tag wallet_integration_service-staging:latest 481321020530.dkr.ecr.us-east-1.amazonaws.com/wallet_integration_service-staging:latest
docker push 481321020530.dkr.ecr.us-east-1.amazonaws.com/wallet_integration_service-staging:latest