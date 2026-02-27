import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

type TimeRange =
  | 'this_week'
  | 'last_2_weeks'
  | 'current_month'
  | 'last_month'
  | 'last_3_months'
  | 'all';

function getTimeRangeBounds(timeRange: TimeRange): { gte?: Date; lt?: Date } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (timeRange === 'all') {
    return {};
  }

  if (timeRange === 'this_week') {
    const day = startOfToday.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const weekStart = new Date(startOfToday);
    weekStart.setDate(startOfToday.getDate() - mondayOffset);
    return { gte: weekStart };
  }

  if (timeRange === 'last_2_weeks') {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - 14);
    return { gte: start };
  }

  if (timeRange === 'current_month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { gte: monthStart };
  }

  if (timeRange === 'last_month') {
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { gte: lastMonthStart, lt: currentMonthStart };
  }

  const lastThreeMonthsStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  return { gte: lastThreeMonthsStart };
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
    .trim();
}

function tokenOverlapScore(a: string, b: string): number {
  const aTokens = new Set(normalizeText(a).split(/\s+/).filter(Boolean));
  const bTokens = new Set(normalizeText(b).split(/\s+/).filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  const aTokenList = Array.from(aTokens);
  const bTokenList = Array.from(bTokens);
  const intersection = aTokenList.filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokenList, ...bTokenList]).size;
  return intersection / union;
}

function commonPrefixLength(a: string, b: string): number {
  const limit = Math.min(4, a.length, b.length);
  let count = 0;
  for (let i = 0; i < limit; i++) {
    if (a[i] === b[i]) count++;
    else break;
  }
  return count;
}

function jaroWinkler(aRaw: string, bRaw: string): number {
  const a = normalizeText(aRaw);
  const b = normalizeText(bRaw);
  if (a === b) return 1;
  if (!a || !b) return 0;

  const maxDistance = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const matchesA = new Array(a.length).fill(false);
  const matchesB = new Array(b.length).fill(false);

  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - maxDistance);
    const end = Math.min(i + maxDistance + 1, b.length);
    for (let j = start; j < end; j++) {
      if (matchesB[j]) continue;
      if (a[i] !== b[j]) continue;
      matchesA[i] = true;
      matchesB[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!matchesA[i]) continue;
    while (!matchesB[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const m = matches;
  const jaro =
    (m / a.length + m / b.length + (m - transpositions / 2) / m) / 3;
  const prefixLength = Math.min(4, commonPrefixLength(a, b));
  return jaro + prefixLength * 0.1 * (1 - jaro);
}

function fuzzyScore(query: string, text: string): number {
  const normalizedQuery = normalizeText(query);
  const normalizedText = normalizeText(text);
  if (!normalizedQuery || !normalizedText) return 0;
  if (normalizedText.includes(normalizedQuery)) return 1;

  const tokenScore = tokenOverlapScore(normalizedQuery, normalizedText);
  const fuzzy = jaroWinkler(normalizedQuery, normalizedText);
  return tokenScore * 0.5 + fuzzy * 0.5;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');
    const searchQuery = (searchParams.get('search') || '').trim();
    const activeFilter = searchParams.get('activeFilter') || 'all';
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const timeRange = (searchParams.get('timeRange') || 'all') as TimeRange;

    const createdAtRange = getTimeRangeBounds(timeRange);

    const where = {
      ...(topicId ? { topicId } : {}),
      ...(activeFilter === 'active'
        ? { isActive: true }
        : activeFilter === 'inactive'
          ? { isActive: false }
          : {}),
      ...(createdAtRange.gte || createdAtRange.lt
        ? { createdAt: createdAtRange }
        : {}),
    };

    const include = {
      topic: true,
      verdicts: {
        orderBy: { month: 'desc' as const },
        take: 1,
        select: {
          verdictLabel: true,
          confidence: true,
          month: true,
        },
      },
      _count: {
        select: {
          articleStances: true,
          verdicts: true,
        },
      },
    };

    const orderBy = [
      { isFeatured: 'desc' as const },
      { featuredOrder: 'asc' as const },
      { createdAt: 'desc' as const },
    ];

    if (!searchQuery) {
      const [questions, total] = await Promise.all([
        prisma.question.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy,
          include,
        }),
        prisma.question.count({ where }),
      ]);

      return NextResponse.json({
        questions,
        total,
        limit,
        offset,
        timeRange,
        activeFilter,
        search: searchQuery,
      });
    }

    const allFilteredQuestions = await prisma.question.findMany({
      where,
      orderBy,
      include,
    });

    const fuzzyMatches = allFilteredQuestions
      .map((question) => ({
        question,
        score: fuzzyScore(searchQuery, question.questionText || ''),
      }))
      .filter(({ question, score }) => {
        const normalizedQuery = normalizeText(searchQuery);
        const normalizedQuestion = normalizeText(question.questionText || '');
        return normalizedQuestion.includes(normalizedQuery) || score >= 0.58;
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (
          new Date(b.question.createdAt).getTime() -
          new Date(a.question.createdAt).getTime()
        );
      });

    const total = fuzzyMatches.length;
    const questions = fuzzyMatches
      .slice(offset, offset + limit)
      .map(({ question }) => question);

    return NextResponse.json({
      questions,
      total,
      limit,
      offset,
      timeRange,
      activeFilter,
      search: searchQuery,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topicId, questionText, contextBlurb, validationStatus, isActive } = body;

    const question = await prisma.question.create({
      data: {
        topicId,
        questionText,
        contextBlurb: contextBlurb || null,
        validationStatus: validationStatus || 'pending',
        isActive: isActive ?? false,
        source: 'seeded',
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
