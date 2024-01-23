import { Provider } from 'ethers';

export interface Task {
	id: string;
	owner: string;
	rewardPerNode: bigint;
	start: bigint;
	numDays: bigint;
	maxNodeNum: bigint;
	codeHash: string;
}

export interface Node {
	pk: string;
	owner: string;
	teeType: string;
	teeVer: string;
	attestation: string;
}

export interface Code {
	hash: string;
	url: string;
}

export interface Params {
	provider: Provider;
	addr: string;
	abi: any[];
}