#!/usr/bin/env node

require('ts-node/register');
const { genProgram } = require('../src/cli/cli.ts');
const programs = genProgram();
programs[0].parse(process.argv);