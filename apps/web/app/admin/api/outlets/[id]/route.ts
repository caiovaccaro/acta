import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const outlet = await prisma.outlet.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            articles: true,
            crawlRequests: true,
          },
        },
      },
    });

    if (!outlet) {
      return NextResponse.json(
        { error: 'Outlet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(outlet);
  } catch (error) {
    console.error('Error fetching outlet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outlet' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, ideology, credibilityScore, rssFeeds, countryCode } = body;

    const outlet = await prisma.outlet.update({
      where: { id: params.id },
      data: {
        name,
        ideology: ideology || 'Center',
        credibilityScore: credibilityScore ?? 0.5,
        rssFeeds: rssFeeds || [],
        countryCode: countryCode ?? null,
      },
    });

    return NextResponse.json(outlet);
  } catch (error) {
    console.error('Error updating outlet:', error);
    return NextResponse.json(
      { error: 'Failed to update outlet' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.outlet.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting outlet:', error);
    return NextResponse.json(
      { error: 'Failed to delete outlet' },
      { status: 500 }
    );
  }
}



