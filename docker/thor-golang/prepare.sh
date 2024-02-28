#!/bin/sh

set -e

ROOT='thor'
GIT_URL='git@github.com:vechain/thor.git'
CONTAINER='occlum'
IMAGE='occlum/occlum:latest-ubuntu20.04'
BINARY='bin-occlum-go-compiled'

# Download the source code
if [ ! -d $ROOT ]; then
	echo "Downloading source code..."
  	git clone $GIT_URL > /dev/null 2>&1
fi

if [ ! -d '/dev/sgx' ]; then
	mkdir -p /dev/sgx
fi
ln -sf ../sgx_enclave /dev/sgx/enclave
ln -sf ../sgx_provision /dev/sgx/provision

echo 'Starting occlum container ...'
if [ ! -z $(docker ps -q -f name=$CONTAINER) ]
then
	docker stop $CONTAINER && \
	docker run -d -it --rm --privileged --name occlum -v /dev/sgx:/dev/sgx -v "./${ROOT}:/root/${ROOT}" -w /root/$ROOT $IMAGE 
else
	docker run -d -it --rm --privileged --name occlum -v /dev/sgx:/dev/sgx -v "./${ROOT}:/root/${ROOT}" -w /root/$ROOT $IMAGE
fi
echo 'Building source code using occlum-go ...'
docker exec -it -e GO111MODULE=on occlum occlum-go build -v -o ./bin ./cmd/thor

cp "./${ROOT}/bin" "./${BINARY}"