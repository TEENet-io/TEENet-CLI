import { Command } from "commander";
import { Node, Params } from "../libs/types";
import { NodeManager } from "../libs/node";
import { Config, ABIs } from "./types";
import { abort, getWallet, printNode, isBytes32 } from "./common";
import { Wallet, Provider } from "ethers";
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Usage:	teenet 	node 	get <pk>								// get node info
 * 							addOrUpdate <addrOrIdx> <relative_file>	// add node info
 * 							remove <addrOrIdx> <pk>					// remove node info
 * 							register <file>							// send node info to backend for registration
 */
export function addNodeCmd(
	program: Command,
	cfg: Config,
	provider: Provider,
	abi: ABIs,
	wallets: Record<string, Wallet>
) {
	const nodeCmd = program
		.command('node')
		.description('Commands that handle TEE node info');

	nodeCmd
		.command('get <pk>')
		.description('Get TEE node info by its public key')
		.action((pk) => {
			get({
				provider,
				addr: cfg.deployed.NodeInfo,
				abi: abi.NodeInfo
			}, pk).catch((err) => {
				abort(err.message || 'Unknown error');
			});
		});

	nodeCmd
		.command('addOrUpdate <addrOrIdx> <relative_file>')
		.description('Add/update node info')
		.action((addrOrIdx, relative_file) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				abort(walletOrErr.message);
			}

			const wallet = walletOrErr as Wallet;
			const file = join(__dirname, relative_file);
			const node: Node = JSON.parse(readFileSync(file, 'utf-8'));
			add({
				provider,
				addr: cfg.deployed.NodeInfo,
				abi: abi.NodeInfo
			}, wallet, node).catch((err) => {
				abort(err.message || 'Unknown error');
			});
		});

	nodeCmd
		.command('remove <addrOrIdx> <pk>')
		.description('Remove node info by pk')
		.action((addrOrIdx, pk) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				abort(walletOrErr.message);
			}

			const wallet = walletOrErr as Wallet;
			remove({
				provider,
				addr: cfg.deployed.NodeInfo,
				abi: abi.NodeInfo
			}, wallet, pk).catch((err) => {
				abort(err.message || 'Unknown error');
			});
		});
}

async function get(params: Params, pk: string) {
	if(!isBytes32(pk)) {
		throw new Error(`Invalid pk: ${pk}`);
	}

	const nodeManager = new NodeManager(params);
	const ret = await nodeManager.getNodeInfo(pk);
	if (ret instanceof Error) {
		throw new Error(ret.message);
	}
	if (ret === null) {
		throw new Error(`Node pk=${pk} does not exist`);
	}
	console.log('Node info:');
	printNode(ret);
}

async function add(params: Params, wallet: Wallet, node: Node) {
	const nodeManager = new NodeManager(params);
	const ret = await nodeManager.addOrUpdate(wallet, node);
	if (ret instanceof Error) {
		throw new Error(ret.message);
	}
	console.log('Added/updated node info:');
	printNode(node);
}

async function remove(params: Params, wallet: Wallet, pk: string) {
	if(!isBytes32(pk)) {
		throw new Error(`Invalid pk: ${pk}`);
	}

	const nodeManager = new NodeManager(params);
	const ret = await nodeManager.remove(wallet, pk);
	if (ret instanceof Error) {
		throw new Error(ret.message);
	}
	console.log(`Removed code info:\npk=${pk}`);
}