import { JsonRpcProvider, Signer, Wallet, ContractFactory } from "ethers";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { artifacts } from "hardhat";
import { Config, files, dir } from "../src/cli/common";
import { Code, Node, Task } from "../src/libs/types";
import { randBytes } from "../src/libs/common";
const JSONbig = require('json-bigint');

async function main() {
	const dataDir = join(dir, 'data');
	if (!existsSync(dataDir)) {
		mkdirSync(dataDir);
	}

	const host = "http://127.0.0.1:8545";

	const provider = new JsonRpcProvider(host);
	const backend = await provider.getSigner(0);

	const deployContract = async function (contractName: string, signer: Signer, args: any[]) {
		const artifact = await artifacts.readArtifact(contractName);
		const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
		const base = await factory.deploy(...args);
		await base.waitForDeployment();
		const contractAddress = await base.getAddress();
		return contractAddress;
	}

	console.log("Deploying contracts...");
	const codeInfoAddr = await deployContract("CodeInfo", backend, [backend.address]);
	const nodeInfoAddr = await deployContract("NodeInfo", backend, [backend.address]);
	const taskMgrAddr = await deployContract("TaskMgr", backend, [backend.address, nodeInfoAddr, codeInfoAddr]);

	// Output contract address and account
	console.log("Generating config, abi, pk, and sample data files...");
	const config: Config = {
		url: host,
		deployed: {
			NodeInfo: nodeInfoAddr,
			TaskMgr: taskMgrAddr,
			CodeInfo: codeInfoAddr,
		}
	};
	writeFileSync(join(dir, files.config), JSON.stringify(config, null, 2));

	const pks = [
		'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
		'0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
		'0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
		'0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
		'0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
		'0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
		'0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
		'0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
		'0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
		'0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6'
	];
	writeFileSync(join(dir, files.pk), JSON.stringify(pks, null, 2));

	const contractNames = ['CodeInfo', 'NodeInfo', 'TaskMgr'];
	const abi: Record<string, any[]> = {};
	for (const contractName of contractNames) {
		const artifact = await artifacts.readArtifact(contractName);
		abi[contractName] = artifact.abi;
	};
	writeFileSync(join(dir, files.abi), JSON.stringify(abi, null, 2));

	const genCode = (): Code => {
		const hash = randBytes(32);
		return {
			hash: hash,
			url: `https://${hash}.network`
		}
	}
	const code = genCode();
	writeFileSync(join(dir, 'data', 'code.sample.json'), JSON.stringify(code, null, 2));

	const genNode = (owner: string): Node => {
		return {
			pk: randBytes(32),
			owner: owner,
			teeType: randBytes(16),
			teeVer: randBytes(16),
			attestation: randBytes(256)
		}
	}
	const node = genNode((new Wallet(pks[0])).address);
	writeFileSync(join(dir, 'data', 'node.sample.json'), JSON.stringify(node, null, 2));

	const genTask = (owner: string, numDays: number, maxNodeNum: number, codeHash: string): Task => {
		return {
			id: randBytes(32),
			owner: owner,
			rewardPerNode: BigInt(Math.ceil(Math.random() * 100)),
			start: BigInt(0),
			numDays: BigInt(numDays),
			maxNodeNum: BigInt(maxNodeNum),
			codeHash: codeHash
		}
	}
	const task = genTask((new Wallet(pks[0])).address, 1, 1, code.hash);
	writeFileSync(join(dir, 'data', 'task.sample.json'), JSONbig.stringify(task, null, 2));
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});