import { Code, Node, Task } from "../libs/types";
import { Wallet, isAddress } from 'ethers';
import { isNumbericString } from "../libs/common";

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

export function abort(msg: string | null | undefined) {
	console.error(msg);
	process.exit(1);
}

export function getWallet(addrOrIdx: string, wallets: Record<string, Wallet>): Wallet | Error {
	let wallet: Wallet;
	if (isNumbericString(addrOrIdx)) {
		const idx = parseInt(addrOrIdx);
		const ws = Object.values(wallets);
		if (idx >= ws.length || idx < 0) {
			return new Error('Invalid wallet index');
		}
		wallet = Object.values(wallets)[idx];
	} else {
		if (!(isAddress(addrOrIdx))) {
			return new Error('Invalid wallet address');
		}
		wallet = wallets[addrOrIdx];
		if (!wallet) {
			return new Error('Wallet not found');
		}
	}
	return wallet;
}