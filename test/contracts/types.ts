interface Task {
	id: string;
	owner: string;
	rewardPerNode: number;
	start: number;
	numDays: number;
	maxNodeNum: number;
}

interface Node {
	pk: string;
	owner: string;
	teeType: string;
	teeVer: string;
	attestation: string;
}

interface Code {
	hash: string;
	url: string;
}

export { Task, Node, Code }