#!/bin/bash

set -ex

ROOT='thor'
GIT_URL='git@github.com:vechain/thor.git'
CONTAINER='occlum'
IMAGE='occlum/occlum:latest-ubuntu20.04'
BINARY='bin-occlum-go-compiled'

# Download the source code
if [ ! -d $ROOT ]; then
	echo "Downloading source code..."
  	git clone $GIT_URL
fi

if [ ! -d '/dev/sgx' ]; then
	mkdir -p /dev/sgx
fi
ln -sf ../sgx_enclave /dev/sgx/enclave
ln -sf ../sgx_provision /dev/sgx/provision

echo "Starting occlum instance..."
if [ "$(docker ps -q -f name=$CONTAINER)" ]; then
	docker stop $CONTAINER
fi
docker run -it -d --rm --privileged --name $CONTAINER -v /dev/sgx:/dev/sgx -v "./${ROOT}:/root/${ROOT}" $IMAGE

docker exec -it --privileged -w "/root/${ROOT}" -e GO111MODULE=on occlum occlum-go build -v -o ./bin ./cmd/thor

if [ "$(docker ps -q -f name=$CONTAINER)" ]; then
	docker stop $CONTAINER
fi
cp "./${ROOT}/bin" "./${BINARY}"