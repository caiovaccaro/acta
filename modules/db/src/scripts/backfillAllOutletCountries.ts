/**
 * Backfill countryCode for all outlets based on their RSS feed domains.
 *
 * Strategy:
 * - For outlets that already have a countryCode, leave as-is.
 * - For outlets without a countryCode:
 *   - Look at the first RSS feed URL and infer country from the hostname/TLD.
 *   - Apply a small set of domain overrides for known outlets.
 *   - Fallback heuristics for common ccTLDs (.uk, .de, .fr, .qa, etc.).
 *
 * Usage (from repo root):
 *   npx tsx modules/db/src/scripts/backfillAllOutletCountries.ts
 */

import { prisma } from '../index';

function inferCountryFromHost(host: string): string | null {
  const h = host.toLowerCase();

  // Domain-level overrides for known outlets (add more here as needed)
  const domainOverrides: Record<string, string> = {
    'theguardian.com': 'GB',
    'www.theguardian.com': 'GB',
    'aljazeera.com': 'QA',
    'www.aljazeera.com': 'QA',
    'aljazeera.net': 'QA',
    'bbc.co.uk': 'GB',
    'www.bbc.co.uk': 'GB',
    'bbc.com': 'GB',
    'www.bbc.com': 'GB',
    'politico.com': 'US',
    'www.politico.com': 'US',
    'foxnews.com': 'US',
    'www.foxnews.com': 'US',
    'nationalreview.com': 'US',
    'www.nationalreview.com': 'US',
    'dw.com': 'DE',
    'www.dw.com': 'DE',
    'thedispatch.com': 'US',
    'www.thedispatch.com': 'US',
  };

  if (domainOverrides[h]) return domainOverrides[h];

  // ccTLD-based heuristics
  if (h.endsWith('.co.uk') || h.endsWith('.uk')) return 'GB';
  if (h.endsWith('.de')) return 'DE';
  if (h.endsWith('.fr')) return 'FR';
  if (h.endsWith('.qa')) return 'QA';
  if (h.endsWith('.ca')) return 'CA';
  if (h.endsWith('.au')) return 'AU';
  if (h.endsWith('.nz')) return 'NZ';
  if (h.endsWith('.in')) return 'IN';
  if (h.endsWith('.cn')) return 'CN';

  // Many outlets we ingest are US-based and .com; use US as a pragmatic default.
  if (h.endsWith('.com')) return 'US';

  return null;
}

function inferCountryFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return inferCountryFromHost(u.hostname);
  } catch {
    return null;
  }
}

async function run() {
  const outlets = await prisma.outlet.findMany();

  let updated = 0;
  let skipped = 0;

  for (const outlet of outlets) {
    if (outlet.countryCode) {
      continue;
    }

    const feeds = Array.isArray(outlet.rssFeeds)
      ? (outlet.rssFeeds as unknown as string[])
      : [];
    const firstFeed = feeds[0];
    if (!firstFeed) {
      skipped++;
      // eslint-disable-next-line no-console
      console.log(`Skipping ${outlet.name}: no RSS feeds to infer from`);
      continue;
    }

    const inferred = inferCountryFromUrl(firstFeed);
    if (!inferred) {
      skipped++;
      // eslint-disable-next-line no-console
      console.log(`Skipping ${outlet.name}: could not infer country from ${firstFeed}`);
      continue;
    }

    await prisma.outlet.update({
      where: { id: outlet.id },
      data: { countryCode: inferred },
    });
    updated++;
    // eslint-disable-next-line no-console
    console.log(`Updated ${outlet.name} -> ${inferred}`);
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Updated ${updated} outlets, skipped ${skipped}.`);
}

run()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

