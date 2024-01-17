import { ethers } from "ethers";
import { writeFileSync } from "fs";
import { join } from "path";
import { artifacts } from "hardhat";

interface Config {
	contractAddr: {
		nodeInfo: string;
		taskMgr: string;
		codeInfo: string;
	};
	accounts: {
		backend: { addr: string, index: number };
		others: { addr: string, index: number }[];
	};
}

async function main() {
	const provider = new ethers.JsonRpcProvider("http://localhost:8545");
	const [backend, ...otherAccounts] = await provider.listAccounts();

	const deployContract = async function(contractName: string, signer: ethers.Signer, args: any[]) {
		const artifact = await artifacts.readArtifact(contractName);
		const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
		const base = await factory.deploy(...args);
		await base.waitForDeployment();
		const contractAddress = await base.getAddress();
		return contractAddress;
	}

	const codeInfoAddr = await deployContract("CodeInfo", backend, [backend.address]);
	const nodeInfoAddr = await deployContract("NodeInfo", backend, [backend.address]);
	const taskMgrAddr = await deployContract("TaskMgr", backend, [backend.address, nodeInfoAddr]);

	// Output contract address and account
	const config: Config = {
		contractAddr: {
			nodeInfo: nodeInfoAddr,
			taskMgr: taskMgrAddr,
			codeInfo: codeInfoAddr,
		},
		accounts: {
			backend: { addr: backend.address, index: 0 },
			others: otherAccounts.map((account, index) => {
				return { addr: account.address, index: index + 1 };
			}),
		},
	};

	const filename = join(__dirname, "deployOnHardhat.json");
	writeFileSync(filename, JSON.stringify(config, null, 2));
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});