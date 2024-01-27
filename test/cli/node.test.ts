import { expect } from 'chai';
import { test, loadNode } from './common';
import { printNode } from '../../src/cli/common';
import { randBytes } from '../../src/libs/common';
import { NodeInfoErr } from '../../src/cli/node';

describe('CLI Node', function () {
	describe('add', function () {
		it('should fail without backend wallet', function () {
			const actual = test('node add 1 node.wallet9.json');
			const expected = 'unknown custom error';
			expect(actual).to.include(expected);
		});
		it('should add node info', function () {
			const node = loadNode('node.wallet9.json');
			const actual = test(`node add 0 node.wallet9.json`);
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
			const node = loadNode('node.wallet9.json');
			test(`node add 0 node.wallet9.json`);
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
		it('should fail without backend wallet', function () {
			const node = loadNode('node.wallet9.json');
			test(`node add 0 node.wallet9.json`);
			const actual = test(`node remove 1 ${node.pk}`);
			const expected = 'unknown custom error';
			expect(actual).to.include(expected);
			test(`node remove 0 ${node.pk}`);	
		});
		it('should remove node info', function () {
			const node = loadNode('node.wallet9.json');
			test(`node add 0 node.wallet9.json`);
			const actual = test(`node remove 0 ${node.pk}`);
			const expected = node.pk;
			expect(actual).to.include(expected);
		});
	});
});