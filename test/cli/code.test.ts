import { expect } from 'chai';
import { test, codes, dataDir } from './common';
import { printCode } from '../../src/cli/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randBytes } from '../../src/libs/common';
import { CodeInfoErr } from '../../src/cli/code'

describe('CLI Code', function () {
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
			const actual = test(`code get ${codes[0].hash}`);
			const expected = printCode(codes[0]);
			expect(actual).to.include(expected);
			test('code remove 0 ' + codes[0].hash);
		});
	});
	describe('addOrUpdate', function () {
		it('should fail with non-backend wallet', function () {
			const actual = test('code addOrUpdate 1 code0.json');
			const expected = 'unknown custom error';
			expect(actual).to.include(expected);
		});
		it('should add code info', function () {
			const actual = test('code addOrUpdate 0 code0.json');
			const expected = printCode(codes[0]);
			expect(actual).to.include(expected);
			test('code remove 0 ' + codes[0].hash);
		});
		it('should update code info', function () {
			test('code addOrUpdate 0 code0.json');
			const code = JSON.parse(readFileSync(join(dataDir, 'code0.update.json'), 'utf-8'));
			const actual = test('code addOrUpdate 0 code0.update.json');
			const expected = printCode(code);
			expect(actual).to.include(expected);
			test('code remove 0 ' + code.hash);
		});
	});
	describe('remove', function () {
		it('should fail with invalid hash', function () {
			const hash = randBytes(30);
			const actual = test(`code remove 0 ${hash}`);
			const expected = CodeInfoErr.InvalidHash(hash).message;
			expect(actual).to.include(expected);
		});
		it('should not find code info', function () {
			const hash = randBytes(32);
			const actual = test(`code remove 0 ${hash}`);
			const expected = CodeInfoErr.NotFound(hash).message;
			expect(actual).to.include(expected);
		});
		it('should remove code info', function () {
			test('code addOrUpdate 0 code0.json');
			const actual = test(`code remove 0 ${codes[0].hash}`);
			const expected = codes[0].hash;
			expect(actual).to.include(expected);
		});
	});
});