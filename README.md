# TEENet
TEENet is a Decentralized Physical Infrastructure Network (DePIN) formed by machines that are equipped with Trusted Execution Environment (TEE). It provides an effective and efficient solution to crowdsourcing TEE computing power for computations that require security, integrity and confidentiality. In the context of Web3, these computations could be cross-chain transaction validation, Layer2 transaction validation or staking validation, etc.  

## CLI Installation

Download source files
```bash
git clone git@github.com:zzGHzz/TEENet.git
```
Install packages and link CLI binary
```bash
cd TEENet && npm install && npm link
```
Compile smart contracts
```bash
npx hardhat compile
```
Open a new terminal, go to the `TEENet` folder and start the Hardhat network
```bash
npx hardhat node
```
Run script
```bash
npx ts-node ./script/deployOnHardhat.ts
```
to deploy smart contracts and generate files including: 
* `./cmd/config.teenet.json`
* `./cmd/abi.teenet.json`
* `./cmd/pks.teenet.json`
* `./cmd/data/code.sample.json`
* `./cmd/data/node.sample.json`
* `./cmd/data/task.sample.json`

### Try CLI
```bash
teenet wallet list
```
to list the first ten wallets provided by the Hardhat network
```bash
[0]:	0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
[1]:	0x70997970C51812dc3A010C7d01b50e0d17dc79C8
[2]:	0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
[3]:	0x90F79bf6EB2c4f870365E785982E1f101E93b906
[4]:	0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
[5]:	0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
[6]:	0x976EA74026E726554dB657fA54763abd0C3a0aa9
[7]:	0x14dC79964da2C08b23698B3D3cc7Ca32193d9955
[8]:	0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
[9]:	0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
```
```bash
teenet code addOrUpdate 0 code.sample.json
```
to add a new code info record.
```bash
teenet node add 0 node.sample.json
```
to add a new node info record.
```bash
teenet task add 0 task.sample.json
```
to add a new task.
```bash
teenet task join 0 0xfffa542f2913ced66b030c0f0dc3a2ecc6836f1e5638a2ffb307ab5459276efa 0xb6f2e00708d863973cc57130a8eabb7a71cf6be657ac7be63744a8a4445ad90b
```
to join a new task.
```bash
teenet task update && teenet task list 
```
to get the task list.
```bash
teenet task get 0xfffa542f2913ced66b030c0f0dc3a2ecc6836f1e5638a2ffb307ab5459276efa
```
to get the task detail info.

### Try REPL
Go to `TEENet` folder and run
```bash
node ./cmd/repl.js
```