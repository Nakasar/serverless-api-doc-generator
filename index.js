#!/usr/bin/env node

const program = require('commander');
const path = require('path');

const generator = require('./lib');

program
    .version('0.1.0')
    .option('-i --in [api-folder]', 'Path to project folder containing serverless.yml definition.')
    .option('-o --out [out-folder]', 'Path to desired out folder.')
    .option('-surl --server-url [server-url]', 'URL of API server.')
    .option('-s --server-name [server-name]', 'Name of API server.')
    .parse(process.argv);

if (!program.in) {
    throw new Error('--in [api-folder] in required.');
}

if (!program.out) {
    throw new Error('--out [out-folder] in required.');
}

const folder = path.join(process.cwd(), program.in);
const out = path.join(process.cwd(), program.out);

generator.generate({
    folder,
    out,
    serverName: program.serverName,
    serverURL: program.serverUrl,
});