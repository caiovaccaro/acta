#!/usr/bin/env npx tsx

import { runPipelineSlice } from '../../modules/db/src/pipeline/runSlice';

const result = await runPipelineSlice({
  argv: process.argv.slice(2),
});

process.stdout.write(`${JSON.stringify(result.summary)}\n`);
process.exitCode = result.exitCode;
