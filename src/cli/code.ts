import { files } from './types';
import { Signer } from 'ethers';
import { CodeManager } from '../libs/code';
import { Code, Params } from '../libs/types';
import { writeFileSync, readFileSync } from 'fs';
import { printCode } from './common';

export async function getCodeInfo(params: Params, hash: string) {
	const codeManager = new CodeManager(params);
	const code = await codeManager.getCode(hash);
	if (code instanceof Error) {
		throw new Error(code.message);
	}
	if (code === null) {
		throw new Error("Code does not exist");
	}
	printCode(code);
}

export async function addCode(params: Params, backend: Signer, code: Code) {
	const codeManager = new CodeManager(params);
	const err = await codeManager.addOrUpdate(backend, code);
	if (err instanceof Error) {
		throw new Error(err.message);
	}
	const codes: Record<string, Code> = JSON.parse(readFileSync(files.code).toString());
	codes[code.hash] = code;
	writeFileSync(files.code, JSON.stringify(codes, null, 2));
}