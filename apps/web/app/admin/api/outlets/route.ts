import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const outlets = await prisma.outlet.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        ideology: true,
        credibilityScore: true,
        countryCode: true,
        _count: {
          select: {
            articles: true,
            crawlRequests: true,
          },
        },
      },
    });

    return NextResponse.json(outlets);
  } catch (error) {
    console.error('Error fetching outlets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outlets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, ideology, credibilityScore, rssFeeds } = body;

    const outlet = await prisma.outlet.create({
      data: {
        name,
        ideology: ideology || 'Center',
        credibilityScore: credibilityScore ?? 0.5,
        rssFeeds: rssFeeds || [],
      },
    });

    return NextResponse.json(outlet, { status: 201 });
  } catch (error) {
    console.error('Error creating outlet:', error);
    return NextResponse.json(
      { error: 'Failed to create outlet' },
      { status: 500 }
    );
  }
}
