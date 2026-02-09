import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

interface VoteEntry {
  pageId: string;
  ranking: string; // e.g. "1er choix", "1st choice"
}

type Lang = 'fr' | 'en' | 'es';

interface RequestBody {
  votes: VoteEntry[];
  comment?: string;
  commentPropertyName: string;
  rankingPropertyName: string;
  clientPageId: string;
  resultRowId?: string;
  lang: Lang;
}

// Fixed column names for Client Votes DB (always French since it's a shared central DB)
// This matches the structure defined in create-vote/route.ts
const CLIENT_VOTES_COLS = {
  rankCols: ['1er choix', '2e choix', '3e choix'],
  comment: 'Commentaire',
  date: 'Date',
};

// Fixed column names for Designs DB (always French since create-vote/route.ts uses French)
const DESIGNS_DB_COLS = {
  ranking: 'Classement',
  rankOptions: ['1er choix', '2e choix', '3e choix'],
  comment: 'Commentaire',
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 });
    }

    const body: RequestBody = await request.json();
    const { votes, comment, commentPropertyName, rankingPropertyName, resultRowId, lang = 'fr' } = body;

    if (!votes || votes.length === 0) {
      return NextResponse.json({ error: 'votes are required' }, { status: 400 });
    }

    const notion = new Client({ auth: apiKey });

    // 1. Update each design row with its ranking, and collect titles
    // Map localized ranking values to French DB values
    const rankingToFrench: Record<string, string> = {
      // English
      '1st choice': '1er choix',
      '2nd choice': '2e choix',
      '3rd choice': '3e choix',
      // Spanish
      '1ª opción': '1er choix',
      '2ª opción': '2e choix',
      '3ª opción': '3e choix',
      // French (pass through)
      '1er choix': '1er choix',
      '2e choix': '2e choix',
      '3e choix': '3e choix',
    };

    const rankedDesigns: { rank: string; title: string }[] = [];

    for (const vote of votes) {
      // Convert localized ranking to French DB value
      const frenchRanking = rankingToFrench[vote.ranking] || vote.ranking;

      const properties: Record<string, unknown> = {
        // Always use French column name for ranking
        [DESIGNS_DB_COLS.ranking]: {
          type: 'select',
          select: { name: frenchRanking },
        },
      };

      // Add comment to first-choice row only (always use French column name)
      if (comment && vote.ranking.includes('1')) {
        properties[DESIGNS_DB_COLS.comment] = {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: comment } }],
        };
      }

      const updated = await notion.pages.update({
        page_id: vote.pageId,
        properties: properties as Parameters<Client['pages']['update']>[0]['properties'],
      });

      // Extract title from update response
      let title = '';
      if ('properties' in updated) {
        const titleProp = (updated.properties as Record<string, Record<string, unknown>>)?.['Design'];
        if (titleProp && 'title' in titleProp) {
          title = (titleProp.title as Array<{ plain_text: string }>).map(t => t.plain_text).join('');
        }
      }
      rankedDesigns.push({ rank: frenchRanking, title });
    }

    // 2. Update the Results DB row (if we have one)
    // Always use French column names since Client Votes DB is shared and uses French columns
    if (resultRowId) {
      // Sort designs by rank number
      rankedDesigns.sort((a, b) => {
        const numA = parseInt(a.rank.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.rank.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

      const resultProps: Record<string, unknown> = {
        [CLIENT_VOTES_COLS.date]: {
          type: 'date',
          date: { start: new Date().toISOString().split('T')[0] },
        },
      };

      // Fill each rank column with the design title (always use French column names)
      for (let i = 0; i < rankedDesigns.length && i < CLIENT_VOTES_COLS.rankCols.length; i++) {
        resultProps[CLIENT_VOTES_COLS.rankCols[i]] = {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: rankedDesigns[i].title } }],
        };
      }

      // Add comment (always use French column name)
      if (comment) {
        resultProps[CLIENT_VOTES_COLS.comment] = {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: comment } }],
        };
      }

      await notion.pages.update({
        page_id: resultRowId,
        properties: resultProps as Parameters<Client['pages']['update']>[0]['properties'],
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Notion submit-vote error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
