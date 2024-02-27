#!/bin/bash

set -e

CONTAINER='occlum'
IMAGE='occlum/occlum:latest-ubuntu20.04'

if [ ! -d '/dev/sgx' ]; then
	mkdir -p /dev/sgx
fi
ln -sf ../sgx_enclave /dev/sgx/enclave
ln -sf ../sgx_provision /dev/sgx/provision

echo 'Starting occlum container ...'
if [ ! -z $(docker ps -q -f name=$CONTAINER) ]
then
	docker stop $CONTAINER && \
	docker run -d -it --rm --privileged --name occlum -v /dev/sgx:/dev/sgx $@ $IMAGE 
else
	docker run -d -it --rm --privileged --name occlum -v /dev/sgx:/dev/sgx $@ $IMAGE
fi
echo 'Done'