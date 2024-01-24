import { ethers } from "ethers";
import { writeFileSync } from "fs";
import { join } from "path";
import { artifacts } from "hardhat";
import { Config, files } from "../../src/cli/types";

async function main() {
	const provider = new ethers.JsonRpcProvider("http://localhost:8545");
	const backend = await provider.getSigner(0);

	const deployContract = async function (contractName: string, signer: ethers.Signer, args: any[]) {
		const artifact = await artifacts.readArtifact(contractName);
		const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
		const base = await factory.deploy(...args);
		await base.waitForDeployment();
		const contractAddress = await base.getAddress();
		return contractAddress;
	}

	const codeInfoAddr = await deployContract("CodeInfo", backend, [backend.address]);
	const nodeInfoAddr = await deployContract("NodeInfo", backend, [backend.address]);
	const taskMgrAddr = await deployContract("TaskMgr", backend, [backend.address, nodeInfoAddr, codeInfoAddr]);

	// Output contract address and account
	const config: Config = {
		ver: "0.0.1",
		url: "http://localhost:8545",
		deployed: {
			NodeInfo: nodeInfoAddr,
			TaskMgr: taskMgrAddr,
			CodeInfo: codeInfoAddr,
		},
		path: "../../test/cli/",
	};
	writeFileSync(join(__dirname, '../../src/cli/', files.config), JSON.stringify(config, null, 2));

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
	writeFileSync(join(__dirname, files.pk), JSON.stringify(pks, null, 2));

	const contractNames = [ 'CodeInfo', 'NodeInfo', 'TaskMgr' ];
	const abi: Record<string, any[]> = {};
	for (const contractName of contractNames) {
		const artifact = await artifacts.readArtifact(contractName);
		abi[contractName] = artifact.abi;
	};
	writeFileSync(join(__dirname, files.abi), JSON.stringify(abi, null, 2));
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});