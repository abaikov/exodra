#!/usr/bin/env node
// The executable. Kept apart from cli.ts so importing the CLI's functions — in a
// test, or to drive it from another script — never RUNS it. Sniffing argv to
// guess "was I executed directly?" gets this wrong the moment a test file has
// "cli" in its name.
import { run } from './cli';

run(process.argv.slice(2), process.cwd()).then((code) => {
    process.exitCode = code;
});
