#!/bin/bash

set -e

GETH_DIR='go-ethereum'
PRYSM_DIR='prysm'
GETH_BIN='geth'
PRYSM_BIN='beacon-chain'
GETH_URL='https://github.com/ethereum/go-ethereum.git'
PRYSM_URL='https://github.com/prysmaticlabs/prysm.git'
CONTAINER='occlum'
IMAGE='occlum/occlum:latest-ubuntu20.04'
MNT_DIR='/root/app'

if [ ! -d '/dev/sgx' ]; then
	mkdir -p /dev/sgx
fi
ln -sf ../sgx_enclave /dev/sgx/enclave
ln -sf ../sgx_provision /dev/sgx/provision

if [ ! -d 'bin' ]; then
	mkdir bin
fi

if [ ! -d $GETH_DIR ]; then
	echo "Downloading go-ethereum source code..."
  	git clone $GETH_URL > /dev/null 2>&1
	echo "Done"
fi

if [ ! -d $PRYSM_DIR ]; then
	echo "Downloading psysm source code..."
  	git clone $PRYSM_URL > /dev/null 2>&1
	echo "Done"
fi

echo 'Starting occlum container ...'
if [ ! -z $(docker ps -q -f name=$CONTAINER) ]
then
	docker stop $CONTAINER && \
	docker run -d -it --rm --privileged --name occlum -v /dev/sgx:/dev/sgx -v .:$MNT_DIR -w $MNT_DIR $IMAGE 
else
	docker run -d -it --rm --privileged --name occlum -v /dev/sgx:/dev/sgx -v .:$MNT_DIR -w $MNT_DIR $IMAGE
fi
docker exec -i occlum /bin/sh << EOF
	set -e
	if [ ! -d $GETH_DIR ]; then
		echo "Cannot find go-ethereum source code"
		exit 1
	fi
	if [ ! -d $PRYSM_DIR ]; then
		echo "Cannot find prysm source code"
		exit 1
	fi

	echo "Building go-ethereum using occlum-go ..." 
	cd $MNT_DIR/$GETH_DIR && \
	occlum-go run build/ci.go install ./cmd/geth > /dev/null && \
	cp ./build/bin/$GETH_BIN ../bin/$GETH_BIN && \
	echo "Done"

	echo "Building prysm using occlum-go ..." 
	cd $MNT_DIR/$PRYSM_DIR && \
	occlum-go build -o ../bin/$PRYSM_BIN ./cmd/beacon-chain > /dev/null && \
	echo "Done"
EOF