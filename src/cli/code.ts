import { Command } from 'commander';
import { Provider, Signer, Wallet } from 'ethers';
import { CodeManager } from '../libs/code';
import { Code, Params } from '../libs/types';
import { printCode, abort, getWallet } from './common';
import { Config, ABIs } from './types';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 	Usage:	teenet	code 	get <hash>								// get code info
 * 							addOrUpdate <addrOrIdx> <relative_file>	// add code info
 * 							remove <addrOrIdx> <hash>				// remove code info
 * 							send <code>								// send code to backend for verification  
 */
export function addCodeCmd(program: Command, cfg: Config, provider: Provider, abi: ABIs, wallets: Record<string, Wallet>) {
	const codeCmd = program
		.command('code')
		.description('Commands that handle code info');

	codeCmd
		.command('get <hash>')
		.description('Get code info by hash')
		.action((hash) => {
			get({
				provider,
				addr: cfg.deployed.CodeInfo,
				abi: abi.CodeInfo
			}, hash).catch((err) => {
				abort(err.message || 'Unknown error');
			});
		});

	codeCmd
		.command('addOrUpdate <addrOrIdx> <relative_file>')
		.description('Add/update code info')
		.action((addrOrIdx, relative_file) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if(walletOrErr instanceof Error) {
				abort(walletOrErr.message);
			}

			const wallet = walletOrErr as Wallet;
			const file = join(__dirname, relative_file);
			const code: Code = JSON.parse(readFileSync(file, 'utf-8'));
			addOrUpdate({
				provider,
				addr: cfg.deployed.CodeInfo,
				abi: abi.CodeInfo
			}, wallet, code).catch((err) => {
				abort(err.message || 'Unknown error');
			});
		});

	codeCmd
		.command('remove <addrOrIdx> <hash>')
		.description('Remove code info by hash')
		.action((addrOrIdx, hash) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if(walletOrErr instanceof Error) {
				abort(walletOrErr.message);
			}

			const wallet = walletOrErr as Wallet;

			remove({
				provider,
				addr: cfg.deployed.CodeInfo,
				abi: abi.CodeInfo
			}, wallet, hash).catch((err) => {
				abort(err.message || 'Unknown error');
			});;
		});
}

async function get(params: Params, hash: string) {
	const codeManager = new CodeManager(params);
	const code = await codeManager.getCode(hash);
	if (code instanceof Error) {
		throw new Error(code.message);
	}
	if (code === null) {
		throw new Error(`Code hash=${hash} does not exist`);
	}
	console.log('Code info:');
	printCode(code);
}

async function addOrUpdate(params: Params, backend: Signer, code: Code) {
	const codeManager = new CodeManager(params);
	const err = await codeManager.addOrUpdate(backend, code);
	if (err instanceof Error) {
		throw new Error(err.message);
	}
	console.log('Added/updated code info:');
	printCode(code);
}

async function remove(params: Params, backend: Signer, hash: string) {
	const codeManager = new CodeManager(params);
	const err = await codeManager.remove(backend, hash);
	if (err instanceof Error) {
		throw new Error(err.message);
	}
	console.log(`Removed code info with hash=${hash}`);
}
