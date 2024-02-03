import { Command } from 'commander';
import { Provider, Signer, Wallet } from 'ethers';
import { CodeManager } from '../libs/code';
import { Code, Params } from '../libs/types';
import { printCode, getWallet, isCodeHash, Config, ABIs, loadDataFromFile } from './common';
import { LoggerFactory } from './logger';

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
export function addCodeCmd(
	program: Command, 
	cfg: Config, 
	provider: Provider, 
	abi: ABIs, 
	wallets: Record<string, Wallet>
): Command {
	const codeCmd = program
		.command('code')
		.description('Commands that handle code info');

	codeCmd
		.command('get <hash>')
		.description('Get code info by hash')
		.action((hash) => {
			if(!isCodeHash(hash)) {
				logger.err(CodeInfoErr.InvalidHash(hash).message);
				return;
			}

			get({
				provider,
				addr: cfg.deployed.CodeInfo,
				abi: abi.CodeInfo
			}, hash).catch((err) => {
				logger.err(err.message);
			});
		});

	codeCmd
		.command('addOrUpdate <addrOrIdx> <file>')
		.description('Add/update code info')
		.action((addrOrIdx, file) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				logger.err(walletOrErr.message);
				return;
			}

			const codeOrErr = loadDataFromFile(file);
			if(codeOrErr instanceof Error) {
				logger.err(codeOrErr.message);
				return;
			}
			
			if(!isCodeHash(codeOrErr.hash)) {
				logger.err(CodeInfoErr.InvalidHash(codeOrErr.hash).message);
				return;
			}

			addOrUpdate({
				provider,
				addr: cfg.deployed.CodeInfo,
				abi: abi.CodeInfo
			}, walletOrErr, codeOrErr).catch((err) => {
				logger.err(err.message || 'Unknown error');
			});
		});

	codeCmd
		.command('remove <addrOrIdx> <hash>')
		.description('Remove code info by hash')
		.action((addrOrIdx, hash) => {
			const walletOrErr = getWallet(addrOrIdx, wallets);
			if (walletOrErr instanceof Error) {
				logger.err(walletOrErr.message);
				return;
			}

			remove({
				provider,
				addr: cfg.deployed.CodeInfo,
				abi: abi.CodeInfo
			}, walletOrErr, hash).catch((err) => {
				logger.err(err.message || 'Unknown error');
			});;
		});

	return codeCmd;
}

async function get(params: Params, hash: string) {
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
	if (!isCodeHash(hash)) {
		throw CodeInfoErr.InvalidHash(hash);
	}

	const codeManager = new CodeManager(params);

	// Testing the existence of the code hash is necessary since
	// execute remove on contract with a non-existing code hash
	// would not generate error.
	if(!(await codeManager.codeExists(hash))) {
		throw CodeInfoErr.NotFound(hash);
	}

	const err = await codeManager.remove(backend, hash);
	if (err instanceof Error) {
		throw new Error(err.message);
	}
	logger.log(`Removed code info\nhash=${hash}`);
}
