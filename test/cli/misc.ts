import { expect } from 'chai';
import { test } from './common';
import { randBytes } from '../../src/libs/common';

describe('CLI Misc', function () {
	it('should detect invalid wallet index', function () {
		const actual = test('code addOrUpdate 10 code0.json');
		const expected = 'Invalid wallet index';
		expect(actual).to.include(expected);
	});
	it('should detect invalid wallet address', function () {
		const addr = randBytes(21);
		const actual = test(`code addOrUpdate ${addr} code0.json`);
		const expected = 'Invalid wallet address';
		expect(actual).to.include(expected);
	});
	it('should not find wallet', function () {
		const addr = randBytes(20);
		const actual = test(`code addOrUpdate ${addr} code0.json`);
		const expected = 'Wallet not found';
		expect(actual).to.include(expected);
	});
});