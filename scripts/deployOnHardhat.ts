import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

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
	const [backend, ...otherAccounts] = await ethers.getSigners();

	// Deploy contract CodeInfo
	const CodeInfo = await ethers.getContractFactory("CodeInfo");
	const codeInfo = await CodeInfo.deploy(backend);
	const codeInfoAddr = await codeInfo.getAddress();

	// Deploy contract NodeInfo
	const NodeInfo = await ethers.getContractFactory("NodeInfo");
	const nodeInfo = await NodeInfo.deploy(backend);
	const nodeInfoAddr = await nodeInfo.getAddress();

	// Deploy contract TaskMgr
	const TaskMgr = await ethers.getContractFactory("TaskMgr");
	const taskMgr = await TaskMgr.deploy(backend, nodeInfoAddr);
	const taskMgrAddr = await taskMgr.getAddress();

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