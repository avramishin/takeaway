#!/bin/bash

ssh-add /home/vadim/Dropbox/ssh-keys/vavramishin-shift-dev.pem

HOST=ec2-34-228-210-90.compute-1.amazonaws.com
USER=ubuntu
REMOTE_PATH=/home/ubuntu/projects/wallets_center
LOCAL_PATH=/home/vadim/projects/wallets_center

rsync -v -e ssh $LOCAL_PATH/index.html $USER@$HOST:$REMOTE_PATH
rsync -rave ssh --delete $LOCAL_PATH/dist $USER@$HOST:$REMOTE_PATH/dist