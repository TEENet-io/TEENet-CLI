import { expect } from 'chai';
import { loadFile, dataDir } from './common';
import { printNode } from '../../src/cli/common';
import { randBytes } from '../../src/libs/common';
import { NodeInfoErr } from '../../src/cli/node';
import { Node } from '../../src/libs/types';
import { execSync } from 'child_process';
import { join } from 'path';
import { writeFileSync } from 'fs';

export function test(cmd: string): string {
	try {
		return execSync(`npx ts-node ${join(__dirname, '../../src/cli/cli.ts')} ${cmd}`).toString();
	} catch (err: any) {
		return err.output[1].toString();
	}
}

describe('CLI Node', function () {
	describe('add', function () {
		it('should fail with non-existing file', function () {
			const actual = test(`node add 0 non-existing-node.json`);
			const expected = 'non-existing-node.json';
			expect(actual).to.include(expected);
		});
		it('should fail with invalid public key in file', function () {
			const pk = randBytes(30);
			const node = loadFile('node.w9.json') as Node;
			node.pk = pk;
			const file = 'node.invalid.json';
			writeFileSync(join(dataDir, file), JSON.stringify(node));
			const actual = test(`node add 0 ${file}`);
			const expected = NodeInfoErr.InvalidPk(pk).message;
			expect(actual).to.include(expected);
		});
		it('should add node info', function () {
			const node = loadFile('node.w9.json') as Node;
			const actual = test(`node add 0 node.w9.json`);
			const expected = printNode(node);
			expect(actual).to.include(expected);
			test(`node remove 0 ${node.pk}`);
		});
	});
	describe('get', function () {
		it('should fail with invalid public key', function () {
			const hash = randBytes(30);
			const actual = test(`node get ${hash}`);
			const expected = NodeInfoErr.InvalidPk(hash).message;
			expect(actual).to.include(expected);
		});
		it('should not find node info', function () {
			const hash = randBytes(32);
			const actual = test(`node get ${hash}`);
			const expected = NodeInfoErr.NotFound(hash).message;
			expect(actual).to.include(expected);
		});
		it('should get correct node info', function () {
			const node = loadFile('node.w9.json') as Node;
			test(`node add 0 node.w9.json`);
			const actual = test(`node get ${node.pk}`);
			const expected = printNode(node);
			expect(actual).to.include(expected);
			test(`node remove 0 ${node.pk}`);
		});
	});
	describe('remove', function () {
		it('should fail with invalid public key', function () {
			const hash = randBytes(30);
			const actual = test(`node remove 0 ${hash}`);
			const expected = NodeInfoErr.InvalidPk(hash).message;
			expect(actual).to.include(expected);
		});
		it('should not find node info', function () {
			const hash = randBytes(32);
			const actual = test(`node remove 0 ${hash}`);
			const expected = NodeInfoErr.NotFound(hash).message;
			expect(actual).to.include(expected);
		});
		it('should remove node info', function () {
			const node = loadFile('node.w9.json') as Node;
			test(`node add 0 node.w9.json`);
			const actual = test(`node remove 0 ${node.pk}`);
			const expected = node.pk;
			expect(actual).to.include(expected);
		});
	});
});