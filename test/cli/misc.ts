import { expect } from 'chai';
import { test } from './common';
import { randBytes } from '../../src/libs/common';
import { WalletErr } from '../../src/cli/common';

describe('CLI Misc', function () {
	it('should detect invalid wallet index', function () {
		expect(test('code addOrUpdate 10 code0.json')).to.include(WalletErr.InvalidIndex(10).message);
	});
	it('should detect invalid wallet address', function () {
		const addr = randBytes(21);
		const actual = test(`code addOrUpdate ${addr} code0.json`);
		const expected = WalletErr.InvalidAddress(addr).message;
		expect(actual).to.include(expected);
	});
	it('should not find wallet', function () {
		const addr = randBytes(20);
		const actual = test(`code addOrUpdate ${addr} code0.json`);
		const expected = WalletErr.NotFound(addr).message;
		expect(actual).to.include(expected);
	});
});