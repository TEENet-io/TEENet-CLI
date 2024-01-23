import { Code, Node, Task } from "../libs/types";

export function printCode(code: Code) {
	console.log(`Hash: ${code.hash}`);
	console.log(`Url: ${code.url}`);
}

export function printNode(node: Node) {
	console.log(`Public key: ${node.pk}`);
	console.log(`Owned by: ${node.owner}`);
	console.log(`TEE type: ${node.teeType}`);
	console.log(`TEE version: ${node.teeVer}`);
	console.log(`Attestation: ${node.attestation}`);
}

export function printTask(task: Task) {
	console.log(`ID: ${task.id}`);
	console.log(`Owned by: ${task.owner}`);
	console.log(`Reward per node: ${task.rewardPerNode}`);
	console.log(`Start time: ${task.start}`);
	console.log(`Number of days: ${task.numDays}`);
	console.log(`Maximum number of TEE nodes: ${task.maxNodeNum}`);
	console.log(`Code hash: ${task.codeHash}`);
}