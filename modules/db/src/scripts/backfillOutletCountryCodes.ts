/**
 * Backfill outlet countryCode from a name → ISO 3166-1 alpha-2 map.
 *
 * Usage (from repo root):
 *   npx tsx modules/db/src/scripts/backfillOutletCountryCodes.ts
 * Or from modules/db:
 *   npm run db:backfill:outlet-countries
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { prisma, disconnectDatabase } from '../index';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../../.env') });

const nameToCountryCode: Record<string, string> = {
  'The Guardian': 'GB',
  'Al Jazeera English': 'QA',
  BBC: 'GB',
  Politico: 'US',
  'Fox News': 'US',
  'National Review': 'US',
  'Deutsche Welle': 'DE',
  'The Dispatch': 'US',
};

async function run() {
  for (const [name, code] of Object.entries(nameToCountryCode)) {
    const res = await prisma.outlet.updateMany({
      where: { name },
      data: { countryCode: code },
    });
    console.log(`Updated ${res.count} outlet(s) for ${name} -> ${code}`);
  }
}

run()
  .then(() => console.log('Done.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => disconnectDatabase());
