import { Code, Node } from '../../src/libs/types';
import { writeFileSync, readFileSync } from 'fs';
import { randomBytes, hexlify, Wallet } from 'ethers';
import { files } from '../../src/cli/types';
import { join } from 'path';

const genBytes = (len: number) => {
	return hexlify(randomBytes(len));
}

const genCode = (): Code => {
	const hash = genBytes(32);
	return {
		hash: hash,
		url: `https://${hash}.network`
	}
}

const genNode = (owner: string): Node => {
	return {
		pk: genBytes(32),
		owner: owner,
		teeType: genBytes(16),
		teeVer: genBytes(16),
		attestation: genBytes(256)
	}
}

const pks = JSON.parse(readFileSync(join(__dirname, files.pk), 'utf-8'));
const wallets: Wallet[] = pks.map((pk: string) => {
	return new Wallet(pk);
})

async function main() {
	// Generate code files
	const nCode = 3;
	for (let i = 0; i < nCode; i++) {
		writeFileSync(join(__dirname, `./data/code${i}.json`), JSON.stringify(genCode(), null, 2));
	}

	// Generate node files
	const nNode = 5;
	const len = wallets.length;
	for (let i = 0; i < nNode; i++) {
		writeFileSync(join(__dirname, `./data/node${i}.json`), JSON.stringify(genNode(wallets[len - i - 1].address), null, 2));
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});