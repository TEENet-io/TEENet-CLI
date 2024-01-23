import { Command } from 'commander';
import { join } from 'path';
import * as fs from 'fs';
import { Config, files } from './types';
import { ethers } from 'ethers';

// Load config file
const loadConfig = (): Config => {
	const fConfig = join(process.cwd(), files.config);
	return JSON.parse(fs.readFileSync(fConfig, 'utf-8'));
}
const cfg = loadConfig();

// Create and test provider
const getProvider = (): ethers.JsonRpcProvider => {
	const provider = new ethers.JsonRpcProvider(cfg.url);
	provider.getBlockNumber().catch((err) => {
		throw new Error('Invalid rpc url');
	});
	return provider;
}

const provider = getProvider();
const abi = JSON.parse(fs.readFileSync(files.abi, 'utf-8'));

// const abort = (msg: string) => {
// 	console.error(msg || 'Error occured');
// 	process.exit(1);
// }

/**
 * usage: 	teenet	task 	update						// download all task info from blockchain 
 *	 					 	list <active|expired|all>	// list active or all task info
 * 						 	get <id>					// get details of a task
 * 							add <file>					// add a task
 * 							join <id> 					// join a task
 * 							balance <addr>				// get withdraw balance 
 * 							withdraw <addr>				// withdraw balance
 * 							-h, --help
 * 
 * 			teenet 	node 	get <node_id>				// get node info
 * 							getList <task_id>			// list ids of nodes that have joined a task
 * 							add <file>					// add node info
 * 							remove <node_id>			// remove node info
 * 							register <file>				// send node info to backend for registration
 * 							-h, --help		
 * 
 * 			teenet	code 	get <hash>					// get code info
 * 							add <file>					// add code info
 * 							remove <hash>				// remove code info
 * 							send <code>					// send code to backend for verification                   
 * 							-h, --help
 * 
 * 					-h, --help							
 */
const program = new Command();

program.version(cfg.ver);

const codeCmd = program
	.command('code')
	.description('Code related commands');

codeCmd
	.command('get <hash>')
	.description('Get code info by hash')
	.action((hash) => {
		
	});

const nodeCmd = program
	.command('node')
	.description('TEE node related commands');

const taskCmd = program
	.command('task')
	.description('Task related commands');

taskCmd
	.command('add')
	.description('Add a task')
	.argument('[file]', 'Json file that contains task data')
	.action(async (file) => {});

program.parse(process.argv);