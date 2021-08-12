#!/bin/sh
awslogs get trade_service-production --start='20m' --query=message --no-group --no-stream