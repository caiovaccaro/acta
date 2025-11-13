/**
 * Outlet Repository
 * Handles Outlet model operations
 */

import { prisma, Ideology } from '../index.js';
import type { Outlet } from '@prisma/client';

/**
 * Finds an outlet by name (case-insensitive)
 * @param name - Outlet name
 * @returns Outlet or null if not found
 */
export async function findOutletByName(name: string): Promise<Outlet | null> {
  return prisma.outlet.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  });
}

/**
 * Creates a new outlet
 * @param name - Outlet name
 * @param ideology - Outlet ideology
 * @param credibilityScore - Credibility score (0-1)
 * @param rssFeeds - Array of RSS feed URLs
 * @returns Created outlet
 */
export async function createOutlet(
  name: string,
  ideology: Ideology,
  credibilityScore: number = 0.5,
  rssFeeds: string[] = []
): Promise<Outlet> {
  return prisma.outlet.create({
    data: {
      name,
      ideology,
      credibilityScore,
      rssFeeds,
    },
  });
}

/**
 * Finds or creates an outlet by name
 * If outlet doesn't exist, creates it with default values
 * @param name - Outlet name
 * @param ideology - Outlet ideology (used if creating new outlet)
 * @param credibilityScore - Credibility score (used if creating new outlet)
 * @param rssFeeds - RSS feeds (used if creating new outlet)
 * @returns Existing or newly created outlet
 */
export async function findOrCreateOutlet(
  name: string,
  ideology: Ideology = Ideology.Center,
  credibilityScore: number = 0.5,
  rssFeeds: string[] = []
): Promise<Outlet> {
  const existing = await findOutletByName(name);
  
  if (existing) {
    return existing;
  }
  
  return createOutlet(name, ideology, credibilityScore, rssFeeds);
}

/**
 * Updates an outlet's RSS feeds
 * @param outletId - Outlet ID
 * @param rssFeeds - Array of RSS feed URLs
 * @returns Updated outlet
 */
export async function updateOutletRssFeeds(
  outletId: string,
  rssFeeds: string[]
): Promise<Outlet> {
  return prisma.outlet.update({
    where: { id: outletId },
    data: { rssFeeds },
  });
}

