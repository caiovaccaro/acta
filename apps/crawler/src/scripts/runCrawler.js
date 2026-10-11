import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeCrawler } from '../jobs/crawlerRun.js';

config({ path: resolve(process.cwd(), '../../.env') });

export async function main(argv = process.argv.slice(2), env = process.env) {
    const result = await executeCrawler(argv, env);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result;
}

if (import.meta.url === `file://${fileURLToPath(import.meta.url)}`) {
    main().catch((error) => {
        process.stderr.write(`Crawler failed: ${error.message}\n`);
        process.exitCode = 1;
    });
}
