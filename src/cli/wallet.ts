import { Command } from 'commander';
import { Wallet } from 'ethers';

export function addWalletCmd(program: Command, wallets: Record<string, Wallet>) {
	const walletCmd = program
		.command('wallet')
		.description('Wallet related commands');

	walletCmd
		.command('list')
		.description('List all available wallets')
		.action(() => {
			const addrs = Object.keys(wallets);
			for (let idx: number = 0; idx < addrs.length; idx++) {
				console.log(`[${idx}]:\t${addrs[idx]}`);
			}
		});
}