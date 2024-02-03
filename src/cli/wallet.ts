import { Command } from 'commander';
import { Wallet } from 'ethers';
import { printAddresses } from './common';
import { LoggerFactory } from './logger';

const logger = LoggerFactory.getInstance();

export function addWalletCmd(program: Command, wallets: Record<string, Wallet>): Command {
	const walletCmd = program
		.command('wallet')
		.description('Wallet related commands');

	walletCmd
		.command('list')
		.description('List all available wallets')
		.action(() => {
			const addrs = Object.keys(wallets);
			logger.log(printAddresses(addrs));
		});

	return walletCmd;
}