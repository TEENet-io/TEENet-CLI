import { expect } from 'chai';
import { wallets } from './common';
import { printAddresses } from '../../src/cli/common';
import { execSync } from 'child_process';
import { join } from 'path';

export function test(cmd: string): string {
	try {
		return execSync(`npx ts-node ${join(__dirname, '../../src/cli/cli.ts')} ${cmd}`).toString();
	} catch (err: any) {
		return err.output[1].toString();
	}
}

describe('CLI Wallet', function () {
	describe('list', function () {
		it('should list all wallets', function () {
			const actual = test('wallet list');
			const expected = printAddresses(Object.keys(wallets)) + '\n';
			expect(actual).to.include(expected);
		});
	});
});