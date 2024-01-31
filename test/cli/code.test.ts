import { expect } from 'chai';
import { loadFile, writeFile } from './common';
import { printCode } from '../../src/cli/common';
import { join } from 'path';
import { randBytes } from '../../src/libs/common';
import { CodeInfoErr } from '../../src/cli/code'
import { execSync } from 'child_process';

export function test(cmd: string): string {
	try {
		return execSync(`npx ts-node ${join(__dirname, '../../src/cli/cli.ts')} ${cmd}`).toString();
	} catch (err: any) {
		return err.output[1].toString();
	}
}

describe('CLI Code', function () {
	let code: any;
	before(function () {
		execSync(`npx ts-node ${join(__dirname, './deployOnHardhat.ts')}`);
		execSync(`npx ts-node ${join(__dirname, './prepareData.ts')}`);
		code = loadFile('code0.json')
	});
	describe('get', function () {
		it('should fail with invalid hash', function () {
			const hash = randBytes(30);
			const actual = test(`code get ${hash}`);
			const expected = CodeInfoErr.InvalidHash(hash).message;
			expect(actual).to.include(expected);
		});
		it('should not find code info', function () {
			const hash = randBytes(32);
			const actual = test(`code get ${hash}`);
			const expected = CodeInfoErr.NotFound(hash).message;
			expect(actual).to.include(expected);
		});
		it('should get correct code info', function () {
			test('code addOrUpdate 0 code0.json');
			const actual = test(`code get ${code.hash}`);
			const expected = printCode(code);
			expect(actual).to.include(expected);
			test('code remove 0 ' + code.hash);
		});
	});
	describe('addOrUpdate', function () {
		it('should fail with non-existing file', function () {
			const actual = test('code addOrUpdate 0 non-existing-code.json');
			const expected = 'non-existing-code.json';
			expect(actual).to.include(expected);
		});
		it('should fail with invalid hash in file', function () {
			const hash = randBytes(30);
			const c = {...code};
			c.hash = hash;
			const file = 'code.invalid.json';
			writeFile(file, c);
			const actual = test(`code addOrUpdate 0 ${file}`);
			const expected = CodeInfoErr.InvalidHash(hash).message;
			expect(actual).to.include(expected);
		});
		it('should add code info', function () {
			const actual = test('code addOrUpdate 0 code0.json');
			const expected = printCode(code);
			expect(actual).to.include(expected);
			test('code remove 0 ' + code.hash);
		});
		it('should update code info', function () {
			test('code addOrUpdate 0 code0.json');
			const c = loadFile('code0.update.json');
			const actual = test('code addOrUpdate 0 code0.update.json');
			const expected = printCode(c);
			expect(actual).to.include(expected);
			test('code remove 0 ' + c.hash);
		});
	});
	describe('remove', function () {
		it('should fail with invalid hash', function () {
			const hash = randBytes(30);
			const actual = test(`code remove 0 ${hash}`);
			const expected = CodeInfoErr.InvalidHash(hash).message;
			expect(actual).to.include(expected);
		});
		it('should fail with non-existing hash', function () {
			const hash = randBytes(32);
			const actual = test(`code remove 0 ${hash}`);
			const expected = CodeInfoErr.NotFound(hash).message;
			expect(actual).to.include(expected);
		});
		it('should remove code info', function () {
			test('code addOrUpdate 0 code0.json');
			const actual = test(`code remove 0 ${code.hash}`);
			const expected = code.hash;
			expect(actual).to.include(expected);
		});
	});
});