export interface Task {
	id: string;
	owner: string;
	rewardPerNode: number;
	start: number;
	numDays: number;
	maxNodeNum: number;
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