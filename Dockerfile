# syntax=docker/dockerfile:1

FROM ubuntu:20.04 AS base
RUN <<EOF
apt-get update
apt-get install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
apt-get clean
EOF

WORKDIR /app

RUN <<EOF
node -v
npm -v
npm install hardhat
npm install @nomicfoundation/hardhat-toolbox@^4.0.0
EOF

COPY hardhat.config.ts /app/hardhat.config.ts
COPY tsconfig.json /app/tsconfig.json

FROM base AS hardhat-node

EXPOSE 8545
ENTRYPOINT [ "npx", "hardhat", "node" ] 

FROM base AS teenet-repl

RUN <<EOF
npm install @openzeppelin/contracts
npm install commander
npm install json-bigint
npm install typescript
npm install ts-node
npm install ethers
EOF

COPY cmd /app/cmd
COPY src /app/src
COPY script /app/script 

RUN npx hardhat compile

ENTRYPOINT [ "/bin/bash" ]