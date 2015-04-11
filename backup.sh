#!/bin/bash

# backup the openshift data dir

SERVER=$1

rsync -av --exclude 'ghostscript-*' $SERVER:$(ssh $SERVER 'printf $OPENSHIFT_DATA_DIR') ./data

