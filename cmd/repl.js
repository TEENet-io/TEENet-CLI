#!/usr/bin/env node
const repl = require('repl');
require('ts-node/register');
const { genProgram } = require('../src/cli/cli.ts');

const programs = genProgram();
programs.forEach(program => program.exitOverride());

repl.start({
	prompt: '> teenet ', 
	eval: (cmd, context, filename, callback) => {
		const args = cmd.trim().split(' ');
		try {
			programs[0].parse(args, {from: 'user'});
			callback(null)
		} catch (err) {
			callback(null);
		}
	}
});