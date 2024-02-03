import { Command } from 'commander';
import { join } from 'path';
import * as fs from 'fs';
import { Config, files, ABIs, dir } from './common';
import { JsonRpcProvider, Wallet } from 'ethers';
import { addWalletCmd } from './wallet';
import { addCodeCmd } from './code';
import { addNodeCmd } from './node';
import { isContract } from '../libs/common';

import { LoggerFactory } from './logger';
import { addTaskCmd } from './task';

const logger = LoggerFactory.getInstance();
logger.on('log', (msg) => {
	console.log(msg);
});
logger.on('err', (msg) => {
	console.log(msg);
});

function abort(msg: string) {
	logger.log(msg || 'Unknown error');
	process.exit(1);
}

// Load config file
const loadConfig = () => {
	const fConfig = join(dir, files.config);
	try {
		return JSON.parse(fs.readFileSync(fConfig, 'utf-8'));
	} catch (err: any) {
		abort(err.message);
	}
}
const cfg: Config = loadConfig();

// Init provider
const getProvider = (): JsonRpcProvider => {
	const provider = new JsonRpcProvider(cfg.url);
	provider.getBlockNumber().catch((err) => {
		abort('Invalid rpc url');
	});
	return provider;
}
const provider = getProvider();

// Check if contract addresses are valid
const keys = Object.keys(cfg.deployed) as Array<keyof typeof cfg.deployed>;
keys.forEach((key) => {
	isContract(provider, cfg.deployed[key]).then((is) => {
		if (!is) {
			abort(`${key} contract address is not a contract: ${cfg.deployed[key]}`);
		}
	})
});

// Load contract ABIs
const loadAbi = () => {
	const fAbi = join(dir, files.abi);
	try {
		return JSON.parse(fs.readFileSync(fAbi, 'utf-8'));
	} catch (err: any) {
		abort(err.message);
	}
}
const abi: ABIs = loadAbi();

// Load wallets
const loadWallets = () => {
	const fPk = join(dir, files.pk);
	let pks: string[] = [];
	try {
		pks = JSON.parse(fs.readFileSync(fPk, 'utf-8'));
	} catch (err: any) {
		abort(err.message);
	}
	const wallets: Record<string, Wallet> = {};
	for (const pk of pks) {
		const wallet = new Wallet(pk, provider);
		wallets[wallet.address] = wallet;
	}
	return wallets;
}
const wallets = loadWallets();

/**
 * usage: 	teenet	task 	update								// download all task info from blockchain 
 *	 					 	list 								// list active or all task info
 * 						 	get <id>							// get details of a task
 * 							add <addrOrIdx> <file>				// add a task
 * 							join <addOrIdx> <id> <pk>			// join a task
 * 							balance <addrOrIdx>					// get withdraw balance 
 * 							withdraw <addrOrIdx>				// withdraw balance
 * 
 * 			teenet 	node 	get <node_id>						// get node info
 * 							add <addrOrIdx> <file>				// add node info
 * 							remove <addrOrIdx> <pk>				// remove node info
 * 							register <file>						// send node info to backend for registration	
 * 
 * 			teenet	code 	get <hash>								// get code info
 * 							addOrUpdate <addrOrIdx> <file>			// add code info
 * 							remove <addrOrIdx> <hash>				// remove code info
 * 							send <code>								// send code to backend for verification                   
 * 
 * 			teenet	wallet 	list						// list all wallets					
 * 
 * 			teenet 	hardhat	increase <num_of_days>		// increase timestamp of the latest block by days
 * 			
 * 			teenet 	block	--latest, --number <num>	// get block info	
 */
export function genProgram(): Command[] {
	const programs: Command[] = [];

	const program = new Command();
	programs.push(program);
	programs.push(addWalletCmd(program, wallets));
	programs.push(addCodeCmd(program, cfg, provider, abi, wallets));
	programs.push(addNodeCmd(program, cfg, provider, abi, wallets));
	programs.push(addTaskCmd(program, cfg, provider, abi, wallets));

	return programs;
}