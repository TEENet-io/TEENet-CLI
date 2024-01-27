import { Code, Node, Task } from "../libs/types";
import { Wallet, isAddress } from 'ethers';
import { isNumbericString } from "../libs/common";
import { Logger } from "./Logger";

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

export function printAddresses(addrs: string[]): string {
	let output = "";
	for (let idx: number = 0; idx < addrs.length; idx++) {
		output += `[${idx}]:\t${addrs[idx]}\n`;
	}
	output = output.trim();
	return output;
}

export function abort(logger: Logger, msg: string) {
	logger.log(msg);
	process.exit(1);
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