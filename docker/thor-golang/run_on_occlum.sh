#!/bin/bash
set -e

BLUE='\033[1;34m'
NC='\033[0m'

BIN="./bin-occlum-go-compiled"
PROG="thor"

if [ ! -f $BIN ];then
    echo "Error: cannot find file ${BIN}"
    echo "Please see README and build it using Occlum Golang toolchain"
    exit 1
fi

# 1. Init Occlum Workspace
rm -rf occlum_instance && mkdir occlum_instance
cd occlum_instance
occlum init
new_json="$(jq '.resource_limits.user_space_size = "1MB" |
	.resource_limits.user_space_max_size = "2560MB" |
	.resource_limits.kernel_space_heap_size="1MB" |
	.resource_limits.kernel_space_heap_max_size="320MB" |
	.resource_limits.kernel_space_stack_size="10MB" |
	.resource_limits.max_num_of_threads=64 |
	.process.default_stack_size = "40MB" |
	.process.default_heap_size = "320MB" ' Occlum.json)" && \
echo "${new_json}" > Occlum.json

# 2. Copy program into Occlum Workspace and build
rm -rf image && \
copy_bom -f "../${PROG}.yaml" --root image --include-dir /opt/occlum/etc/template && \
occlum build

# 3. Run the web server sample
echo -e "${BLUE}occlum run /bin/${BIN}${NC}"
occlum run "/bin/${BIN} solo"