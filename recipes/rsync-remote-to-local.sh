#!/bin/sh

HOST=ec2-34-228-210-90.compute-1.amazonaws.com
USER=ubuntu
LOCAL_PATH=/tmp/deploy-from-net/master-ecr
REMOTE_PATH=/home/ubuntu/projects/repo/bitgo_integration/master-ecr
rsync -rave ssh --delete $USER@$HOST:$REMOTE_PATH $LOCAL_PATH