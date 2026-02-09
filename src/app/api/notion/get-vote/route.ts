import { NextRequest, NextResponse } from 'next/server';
import { getVoteData } from '@/lib/notion';

export async function GET(request: NextRequest) {
  const pageId = request.nextUrl.searchParams.get('pageId');
  if (!pageId) {
    return NextResponse.json({ error: 'pageId is required' }, { status: 400 });
  }

  const result = await getVoteData(pageId);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status || 500 });
  }

  return NextResponse.json(result.data);
}
