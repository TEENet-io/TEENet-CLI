import { artifacts } from "hardhat";
import { ethers } from "ethers";
import { assert } from "chai";
import { Artifact } from "hardhat/types";

export interface Params {
	provider: ethers.JsonRpcApiProvider;
	codeInfo: {
		address: string; 
		artifact: Artifact;
		owner: string;
	};
	nodeInfo: {
		address: string; 
		artifact: Artifact;
		owner: string;
	};
	taskMgr: {
		address: string; 
		artifact: Artifact;
		owner: string;
	};
}

before(async function () {
	// Get provider
	let provider: ethers.JsonRpcApiProvider;
	try {
		provider = new ethers.JsonRpcProvider("http://localhost:8545");
	} catch (err: any) {
		assert.fail(err.message);
	}

	// Get artifacts
	const codeInfoArtifact = await artifacts.readArtifact("CodeInfo");
	const nodeInfoArtifact = await artifacts.readArtifact("NodeInfo");
	const taskMgrArtifact = await artifacts.readArtifact("TaskMgr");

	// Deploy contracts
	const deployContract = async function(contractName: string, signer: ethers.Signer, args: any[]) {
		const artifact = await artifacts.readArtifact(contractName);
		const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
		const base = await factory.deploy(...args);
		await base.waitForDeployment();
		const contractAddress = await base.getAddress();
		return contractAddress;
	}
	const backend = await provider.getSigner(0);
	const codeInfoAddr = await deployContract("CodeInfo", backend, [backend.address]);
	const nodeInfoAddr = await deployContract("NodeInfo", backend, [backend.address]);
	const taskMgrAddr = await deployContract("TaskMgr", backend, [backend.address, nodeInfoAddr]);

	// Output params
	const params: Params = { 
		provider, 
		codeInfo: {address: codeInfoAddr, artifact: codeInfoArtifact, owner: backend.address}, 
		nodeInfo: {address: nodeInfoAddr, artifact: nodeInfoArtifact, owner: backend.address},
		taskMgr: {address: taskMgrAddr, artifact: taskMgrArtifact, owner: backend.address}
	};
	this.params = params;
});