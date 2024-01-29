import { Code, Node, Task } from "../libs/types";
import { Wallet, isAddress } from 'ethers';
import { isBytes32, isNumbericString } from "../libs/common";

export interface Config {
	ver: string;
	url: string;
	deployed: {
		TaskMgr: string;
		NodeInfo: string;
		CodeInfo: string;
	};
}

export const files = {
	config: './config.teenet.json',
	task: './task.teenet.json',
	node: './node.teenet.json',
	code: './code.teenet.json',
	abi: './abi.teenet.json',
	pk: './pk.teenet.json'
}

export type ABIs = {
	TaskMgr: any[];
	NodeInfo: any[];
	CodeInfo: any[];
}

export function printCode(code: Code): string {
	let output = "";
	output += `Hash: ${code.hash}\n`;
	output += `Url: ${code.url}`;
	return output;
}

export function printNode(node: Node) {
	let output = "";
	output += `Public key: ${node.pk}\n`;
	output += `Owned by: ${node.owner}\n`;
	output += `TEE type: ${node.teeType}\n`;
	output += `TEE version: ${node.teeVer}\n`;
	output += `Attestation: ${node.attestation}`;
	return output;
}

export function printTask(task: Task) {
	let output = "";
	output += `ID: ${task.id}\n`;
	output += `Owned by: ${task.owner}\n`;
	output += `Reward per node: ${task.rewardPerNode}\n`;
	output += `Start time: ${task.start}\n`;
	output += `Number of days: ${task.numDays}\n`;
	output += `Maximum number of TEE nodes: ${task.maxNodeNum}\n`;
	output += `Code hash: ${task.codeHash}`;
	return output;
}

export function expireAt(task: Task): string {
	const expireDate = new Date(Number(task.start) * 1000 + Number(task.numDays) * 24 * 60 * 60 * 1000);
	return expireDate.toDateString();
}

export function printAddresses(addrs: string[]): string {
	let output = "";
	for (let idx: number = 0; idx < addrs.length; idx++) {
		output += `[${idx}]:\t${addrs[idx]}\n`;
	}
	output = output.trim();
	return output;
}

export class WalletErr {
	public static readonly InvalidAddress = (addr: string) => new Error(`Invalid address\naddr=${addr}`);
	public static readonly InvalidIndex = (idx: number) => new Error(`Invalid index\nidx=${idx}`);
	public static readonly NotFound = (addr: string) => new Error(`Wallet not found\naddr=${addr}`);
}

export function getWallet(addrOrIdx: string, wallets: Record<string, Wallet>): Wallet | Error {
	let wallet: Wallet;
	if (isNumbericString(addrOrIdx)) {
		const idx = parseInt(addrOrIdx);
		const ws = Object.values(wallets);
		if (idx >= ws.length || idx < 0) {
			return WalletErr.InvalidIndex(idx);
		}
		wallet = Object.values(wallets)[idx];
	} else {
		if (!(isAddress(addrOrIdx))) {
			return WalletErr.InvalidAddress(addrOrIdx);
		}
		wallet = wallets[addrOrIdx];
		if (!wallet) {
			return WalletErr.NotFound(addrOrIdx);
		}
	}
	return wallet;
}

export function isCodeHash(hash: string): boolean {
	return isBytes32(hash);
}

export function isTaskId(id: string): boolean {
	return isBytes32(id);
}

export function isNodePk(pk: string): boolean {
	return isBytes32(pk);
}