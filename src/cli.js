#!/usr/bin/env node

import chalk from 'chalk'
import clear from 'clear'
import figlet from 'figlet'

import {Command} from 'commander'
import files from './lib/files'
import {version} from '../package.json'

const _exit = process.exit

// Re-assign process.exit because of commander
// TODO: Switch to a different command framework
process.exit = exit

// clear();

// TODO: Optional output format
console.log(
    chalk.yellow(
        figlet.textSync('Api Generator', {horizontalLayout: 'universal smushing'})
    )
);

if (!files.directoryEmpty()) {
    console.log(chalk.red('The directory is not empty!'));
    process.exit();
}

if (files.directoryExists('.git')) {
    console.log(chalk.red('Already a Git repository!'));
    process.exit();
}
//

function around (obj, method, fn) {
    const old = obj[method];

    obj[method] = function () {
        const args = new Array(arguments.length);
        for (let i = 0; i < args.length; i++) args[i] = arguments[i]
        return fn.call(this, old, args)
    }
}

/**
 * Install a before function; AOP.
 */

function before (obj, method, fn) {
    const old = obj[method];

    obj[method] = function () {
        fn.call(this)
        old.apply(this, arguments)
    }
}

/**
 * Graceful exit for async STDIO
 */

function exit (code) {
    // flush output for Node.js Windows pipe bug
    // https://github.com/joyent/node/issues/6247 is just one bug example
    // https://github.com/visionmedia/mocha/issues/333 has a good discussion

    let draining;

    function done () {
        if (!(draining--)) _exit(code)
    }

    draining = 0;
    const streams = [process.stdout, process.stderr];

    exit.exited = true

    streams.forEach(function (stream) {
        // submit empty write request and wait for completion
        draining += 1
        stream.write('', done)
    })

    done()
}

export async function cli(args) {
    const program = new Command()

    around(program, 'optionMissingArgument', function (fn, args) {
        program.outputHelp()
        fn.apply(this, args)
        return { args: [], unknown: [] }
    })

    before(program, 'outputHelp', function () {
        // track if help was shown for unknown option
        this._helpShown = true
    })

    before(program, 'unknownOption', function () {
        // allow unknown options if help was shown, to prevent trailing error
        this._allowUnknownOption = this._helpShown

        // show help if not yet shown
        if (!this._helpShown) {
            program.outputHelp()
        }
    })

    program
        .name('api-gen')
        .version(version)
        .description('Express project generator on steroid')
        .usage('[options] [dir]')
        .option('    --git', 'Create git repository and add .gitignore')
        .option('-f, --force', 'Ignore if directory is empty (Overwrite content)')
        .parse(args);
}