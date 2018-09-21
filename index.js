#!/usr/bin/env node

const program = require('commander');
const path = require('path');

const generator = require('./lib');

program
    .version('0.1.0')
    .option('-i, --in [api-folder]', 'Path to project folder containing serverless.yml definition.')
    .option('-o --out [out-folder]', 'Path to desired out folder.')
    .parse(process.argv);

if (!program.in) {
    throw new Error('--in [api-folder] in required.');
}

if (!program.out) {
    throw new Error('--out [out-folder] in required.');
}

const folder = path.join(__dirname, program.in);
const out = path.join(__dirname, program.out);

generator.generate({
    folder,
    out,
});