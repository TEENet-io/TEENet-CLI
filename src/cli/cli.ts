import { Command } from 'commander';
import { join } from 'path';
import * as fs from 'fs';
import { Config, files, ABIs } from './types';
import { JsonRpcProvider, Wallet } from 'ethers';
import { addWalletCmd } from './wallet';
import { addCodeCmd } from './code';
import { abort } from './common';
import { addNodeCmd } from './node';
import { isContract } from '../libs/common';

// Load config file
const loadConfig = () => {
	const fConfig = join(__dirname, files.config);
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
	const fAbi = join(__dirname, cfg.path, files.abi);
	try {
		return JSON.parse(fs.readFileSync(fAbi, 'utf-8'));
	} catch (err: any) {
		abort(err.message);
	}
}
const abi: ABIs = loadAbi();

// Load wallets
const loadWallets = () => {
	const fPk = join(__dirname, cfg.path, files.pk);
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
 *	 					 	list <active|expired|all>			// list active or all task info
 * 						 	get <task_id>						// get details of a task
 * 							add <addrOrIdx> <file>				// add a task
 * 							join <addOrIdx> <task_id> <tee_pk>	// join a task
 * 							balance <addrOrIdx>					// get withdraw balance 
 * 							withdraw <addrOrIdx>				// withdraw balance
 * 
 * 			teenet 	node 	get <node_id>							// get node info
 * 							addOrUpdate <addrOrIdx> <relative_file>	// add node info
 * 							remove <addrOrIdx> <pk>					// remove node info
 * 							register <file>							// send node info to backend for registration	
 * 
 * 			teenet	code 	get <hash>								// get code info
 * 							addOrUpdate <addrOrIdx> <relative_file>	// add code info
 * 							remove <addrOrIdx> <hash>				// remove code info
 * 							send <code>								// send code to backend for verification                   
 * 
 * 			teenet	wallet 	list						// list all wallets					
 * 
 * 			teenet 	hardhat	increase <num_of_days>		// increase timestamp of the latest block by days
 * 			
 * 			teenet 	block	--latest, --number <num>	// get block info	
 */
const program = new Command();

program.version(cfg.ver);

try {
	addWalletCmd(program, wallets);
	addCodeCmd(program, cfg, provider, abi, wallets);
	addNodeCmd(program, cfg, provider, abi, wallets);
} catch (err: any) {
	abort(err.message || 'Unknown error');
}

// const nodeCmd = program
// 	.command('node')
// 	.description('TEE node related commands');

// const taskCmd = program
// 	.command('task')
// 	.description('Task related commands');

// taskCmd
// 	.command('add')
// 	.description('Add a task')
// 	.argument('[file]', 'Json file that contains task data')
// 	.action(async (file) => { });

program.parse(process.argv);