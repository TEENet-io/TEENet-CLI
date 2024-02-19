import { Command } from "commander";
import { Node, Params } from "../libs/types";
import { NodeManager } from "../libs/node";
import { getWallet, isNodePk, printNode, Config, ABIs, loadDataFromFile } from "./common";
import { Wallet, Provider } from "ethers";
import { LoggerFactory } from "./logger";

const logger = LoggerFactory.getInstance();

export class NodeInfoErr {
	public static readonly NotFound = (pk: string) => new Error(`Node info not found\npk=${pk}`);
	public static readonly InvalidPk = (pk: string) => new Error(`Invalid public key\npk=${pk}`);
}

/**
 * Usage:	teenet 	node 	get <pk>								// get node info
 * 							add <addrOrIdx> <relative_file>			// add node info
 * 							remove <addrOrIdx> <pk>					// remove node info
 * 							register <file>							// send node info to backend for registration
 */
export function addNodeCmd(
	program: Command,
	cfg: Config,
	provider: Provider,
	abi: ABIs,
	wallets: Record<string, Wallet>
): Command {
	const nodeCmd = program
		.command('node')
		.description('Commands that handle TEE node info');

	nodeCmd
		.command('get <pk>')
		.description('Get TEE node info by its public key')
		.action(async (pk) => {
			try {
				await get({
					provider,
					addr: cfg.deployed.NodeInfo,
					abi: abi.NodeInfo
				}, pk);
			} catch (err: any) {
				logger.err(err.message || 'Unknown error');
			}
		});

	nodeCmd
		.command('add <addrOrIdx> <file>')
		.description('Add/update node info')
		.action(async (addrOrIdx, file) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				logger.err(walletOrErr.message);
				return;
			}

			const nodeOrErr = loadDataFromFile(file);
			if (nodeOrErr instanceof Error) {
				logger.err(nodeOrErr.message);
				return;
			}

			if (!isNodePk(nodeOrErr.pk)) {
				logger.err(NodeInfoErr.InvalidPk(nodeOrErr.pk).message);
				return;
			}

			try {
				await add({
					provider,
					addr: cfg.deployed.NodeInfo,
					abi: abi.NodeInfo
				}, walletOrErr, nodeOrErr);
			} catch (err: any) {
				logger.err(err.message || 'Unknown error');
			}
		});

	nodeCmd
		.command('remove <addrOrIdx> <pk>')
		.description('Remove node info by public key')
		.action(async (addrOrIdx, pk) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				logger.err(walletOrErr.message);
				return;
			}

			try {
				await remove({
					provider,
					addr: cfg.deployed.NodeInfo,
					abi: abi.NodeInfo
				}, walletOrErr, pk);
			} catch (err: any) {
				logger.err(err.message || 'Unknown error');
			}
		});

	return nodeCmd;
}

async function get(params: Params, pk: string) {
	if (!isNodePk(pk)) {
		throw NodeInfoErr.InvalidPk(pk);
	}

	const nodeManager = new NodeManager(params);
	const ret = await nodeManager.getNodeInfo(pk);
	if (ret instanceof Error) {
		throw new Error(ret.message);
	}
	if (ret === null) {
		throw NodeInfoErr.NotFound(pk);
	}
	logger.log(printNode(ret));
}

async function add(params: Params, wallet: Wallet, node: Node) {
	const nodeManager = new NodeManager(params);
	const ret = await nodeManager.add(wallet, node);
	if (ret instanceof Error) {
		throw new Error(ret.message);
	}
	logger.log('Added node info');
	logger.log(printNode(node));
}

async function remove(params: Params, wallet: Wallet, pk: string) {
	if (!isNodePk(pk)) {
		throw NodeInfoErr.InvalidPk(pk);
	}

	const nodeManager = new NodeManager(params);

	// Testing the existence of the node pk is necessary since
	// execute remove on contract with a non-existing node pk
	// would not generate error.
	if (!(await nodeManager.nodeExists(pk))) {
		throw NodeInfoErr.NotFound(pk);
	}

	const ret = await nodeManager.remove(wallet, pk);
	if (ret instanceof Error) {
		throw new Error(ret.message);
	}
	logger.log(`Removed node info\npk=${pk}`);
}