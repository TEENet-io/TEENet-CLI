import { Command } from 'commander';
import { Provider, Signer, Wallet } from 'ethers';
import { CodeManager } from '../libs/code';
import { Code, Params } from '../libs/types';
import { printCode, abort, getWallet } from './common';
import { Config, ABIs } from './types';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isBytes32 } from '../libs/common';
import { LoggerFactory } from './Logger';

const logger = LoggerFactory.getInstance();

export class CodeInfoErr {
	public static readonly NotFound = (hash: string) => new Error(`Code info not found\nhash=${hash}`);
	public static readonly InvalidHash = (hash: string) => new Error(`Invalid hash\nhash=${hash}`);
}

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
				abort(logger, err.message || 'Unknown error');
			});
		});

	codeCmd
		.command('addOrUpdate <addrOrIdx> <file>')
		.description('Add/update code info')
		.action((addrOrIdx, file) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				abort(logger, walletOrErr.message);
			}

			const wallet = walletOrErr as Wallet;
			const _file = join(__dirname, 'data', file);
			let code: Code;
			try {
				code = JSON.parse(readFileSync(_file, 'utf-8'));
			} catch (err: any) {
				abort(logger, err.message);
				return;
			}
			
			addOrUpdate({
				provider,
				addr: cfg.deployed.CodeInfo,
				abi: abi.CodeInfo
			}, wallet, code).catch((err) => {
				abort(logger, err.message || 'Unknown error');
			});
		});

	codeCmd
		.command('remove <addrOrIdx> <hash>')
		.description('Remove code info by hash')
		.action((addrOrIdx, hash) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				abort(logger, walletOrErr.message);
			}

			const wallet = walletOrErr as Wallet;

			remove({
				provider,
				addr: cfg.deployed.CodeInfo,
				abi: abi.CodeInfo
			}, wallet, hash).catch((err) => {
				abort(logger, err.message || 'Unknown error');
			});;
		});
}

async function get(params: Params, hash: string) {
	if (!isBytes32(hash)) {
		throw CodeInfoErr.InvalidHash(hash);
	}

	const codeManager = new CodeManager(params);
	if(!(await codeManager.codeExists(hash))) {
		throw CodeInfoErr.NotFound(hash);
	}

	const code = await codeManager.getCode(hash);
	if (code instanceof Error) {
		throw new Error(code.message);
	}
	if (code === null) {
		throw CodeInfoErr.NotFound(hash);
	}
	logger.log(printCode(code));
}

async function addOrUpdate(params: Params, backend: Signer, code: Code) {
	const codeManager = new CodeManager(params);
	const err = await codeManager.addOrUpdate(backend, code);
	if (err instanceof Error) {
		throw new Error(err.message);
	}
	logger.log('Added/updated code info');
	logger.log(printCode(code));
}

async function remove(params: Params, backend: Signer, hash: string) {
	if (!isBytes32(hash)) {
		throw CodeInfoErr.InvalidHash(hash);
	}

	const codeManager = new CodeManager(params);
	if(!(await codeManager.codeExists(hash))) {
		throw CodeInfoErr.NotFound(hash);
	}

	const err = await codeManager.remove(backend, hash);
	if (err instanceof Error) {
		throw new Error(err.message);
	}
	logger.log(`Removed code info\nhash=${hash}`);
}
