import { join } from 'path';
import { readFileSync } from 'fs';
import { assert } from 'chai';
import { Wallet } from 'ethers';
import { execSync } from 'child_process';
import { Code } from '../../src/libs/types';

export function test(cmd: string): string {
	try {
		return execSync('npx ts-node src/cli/cli.ts ' + cmd).toString();
	} catch (err: any) {
		return err.output[1].toString();
	}
}

export const exeDir = join(__dirname, '../../src/cli');
export const cfgFile = join(exeDir, 'config.teenet.json');
export const pkFile = join(exeDir, 'wallet', 'pk.teenet.json');
export const dataDir = join(exeDir, 'data');

const loadWallets = () => {
	let pks: string[] = [];
	try {
		pks = JSON.parse(readFileSync(pkFile, 'utf-8'));
	} catch (err: any) {
		assert.fail(err.message);
	}
	const wallets: Record<string, Wallet> = {};
	for (const pk of pks) {
		const wallet = new Wallet(pk);
		wallets[wallet.address] = wallet;
	}
	return wallets;
}
export const wallets = loadWallets();

const loadCodes = () => {
	let codes: Code[] = [];
	try {
		for(let i = 0; i < 3; i++){
			codes.push(JSON.parse(readFileSync(join(dataDir, `code${i}.json`), 'utf-8')));
		}
	} catch (err: any) {
		assert.fail(err.message);
	}
	return codes;
}
export const codes = loadCodes();

export const loadNode = (file: string) => {
	try {
		return JSON.parse(readFileSync(join(dataDir, file), 'utf-8'));
	} catch (err: any) {
		assert.fail(err.message);
	}
}