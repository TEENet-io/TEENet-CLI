import { expect } from 'chai';
import { test, codes, dataDir } from './common';
import { printCode } from '../../src/cli/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randBytes } from '../../src/libs/common';

describe('CLI Code', function () {
	describe('get', function () {
		it('should not find code info', function () {
			const actual = test(`code get ${randBytes(32)}`);
			const expected = 'Code info does not exist';
			expect(actual).to.include(expected);
		});
		it('should get correct code info', function () {
			const actual = test(`code get ${codes[0].hash}`);
			const expected = printCode(codes[0]);
			expect(actual).to.include(expected);
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
		});
		it('should update code info', function () {
			test('code addOrUpdate 0 code0.json');
			const code = JSON.parse(readFileSync(join(dataDir, 'code0.update.json'), 'utf-8'));
			const actual = test('code addOrUpdate 0 code0.update.json');
			const expected = printCode(code);
			expect(actual).to.include(expected);
		});
	});
	describe('remove', function () {
		it('should remove code info', function () {
			test('code addOrUpdate 0 code0.json');
			const actual = test(`code remove 0 ${codes[0].hash}`);
			const expected = 'Removed code info';
			expect(actual).to.include(expected);
		});
	});
});