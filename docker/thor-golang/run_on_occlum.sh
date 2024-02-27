#!/bin/sh
set -e

BLUE='\033[1;34m'
NC='\033[0m'

BIN='bin-occlum-go-compiled'
ROOT='thor'
CONTAINER='occlum'
IMAGE='occlum/occlum:latest-ubuntu20.04'

# # Download source code
# if [ ! -d $ROOT ]; then
# 	echo "Downloading source code..."
#   	git clone $GIT_URL > /dev/null 2>&1
# fi

# Create soft links for sgx driver
if [ ! -d '/dev/sgx' ]; then
	mkdir -p /dev/sgx
fi
ln -sf ../sgx_enclave /dev/sgx/enclave
ln -sf ../sgx_provision /dev/sgx/provision

# Run an occlum container
if [ ! -z $(docker ps -q -f name=$CONTAINER) ]
then
	docker stop $CONTAINER && \
	docker run -d -it --rm --privileged --name occlum -v /dev/sgx:/dev/sgx -v ".:/root/${ROOT}" -w /root/$ROOT $IMAGE 
else
	docker run -d -it --rm --privileged --name occlum -v /dev/sgx:/dev/sgx -v ".:/root/${ROOT}" -w /root/$ROOT $IMAGE
fi
docker exec -i occlum /bin/sh <<EOF
	set -ex
	if [ ! -f ./$BIN ];then
		echo "Error: cannot find file ./$BIN"
		echo "Please see README and build it using Occlum Golang toolchain"
		exit 1
	fi
	# 1. Init Occlum Workspace
	rm -rf occlum_instance && mkdir occlum_instance
	cd occlum_instance
	occlum init
	cat Occlum.json | jq ' .resource_limits.user_space_max_size = "2560MB" | 
		.resource_limits.kernel_space_heap_max_size="320MB" |
		.resource_limits.kernel_space_stack_size="10MB" |
		.resource_limits.max_num_of_threads=64 |
		.process.default_stack_size = "40MB" |
		.process.default_heap_size = "320MB" ' | tee Occlum.json > /dev/null 2>&1
 	# 2. Copy program into Occlum Workspace and build
	rm -rf image && \
	copy_bom -f ../$ROOT.yaml --root image --include-dir /opt/occlum/etc/template && \
	occlum build
	# 3. Run
	echo -e "${BLUE}occlum run /bin/${BIN}${NC}"
	occlum run /bin/$BIN $@
EOF