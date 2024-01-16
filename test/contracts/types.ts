interface Task {
	id: string;
	rewardPerNode: number;
	start: number;
	numDays: number;
	maxNodeNum: number;
	owner: string;
}

interface Node {
	pk: string;
	teeType: string;
	teeVer: string;
	attestation: string;
}

interface Code {
	hash: string;
	url: string;
}

export { Task, Node, Code }