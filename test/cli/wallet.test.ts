import { expect } from 'chai';
import { wallets, test } from './common';
import { printAddresses } from '../../src/cli/common';

describe('CLI Wallet', function () {
	describe('list', function () {
		it('should list all wallets', function () {
			const actual = test('wallet list');
			const expected = printAddresses(Object.keys(wallets)) + '\n';
			expect(actual).to.deep.equal(expected);
		});
	});
});