#!/usr/bin/env node
import { runCli } from './cli.js'

const { code, stdout, stderr } = runCli(process.argv.slice(2))
process.stdout.write(stdout)
process.stderr.write(stderr)
process.exitCode = code
