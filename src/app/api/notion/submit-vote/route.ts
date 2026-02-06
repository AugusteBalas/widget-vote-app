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

const RESULT_LABELS: Record<Lang, {
  rankCols: string[];
  comment: string;
  date: string;
  voteLink: string;
}> = {
  fr: {
    rankCols: ['1er choix', '2e choix', '3e choix', '4e choix'],
    comment: 'Commentaire',
    date: 'Date',
    voteLink: 'Lien vote',
  },
  en: {
    rankCols: ['1st choice', '2nd choice', '3rd choice', '4th choice'],
    comment: 'Comment',
    date: 'Date',
    voteLink: 'Vote link',
  },
  es: {
    rankCols: ['1ª opción', '2ª opción', '3ª opción', '4ª opción'],
    comment: 'Comentario',
    date: 'Fecha',
    voteLink: 'Enlace de voto',
  },
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
    const labels = RESULT_LABELS[lang] || RESULT_LABELS.fr;

    // 1. Update each design row with its ranking, and collect titles
    const rankedDesigns: { rank: string; title: string }[] = [];

    for (const vote of votes) {
      const properties: Record<string, unknown> = {
        [rankingPropertyName]: {
          type: 'select',
          select: { name: vote.ranking },
        },
      };

      // Add comment to first-choice row only
      if (comment && vote.ranking.includes('1')) {
        properties[commentPropertyName] = {
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
      rankedDesigns.push({ rank: vote.ranking, title });
    }

    // 2. Update the Results DB row (if we have one)
    if (resultRowId) {
      // Sort designs by rank number
      rankedDesigns.sort((a, b) => {
        const numA = parseInt(a.rank.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.rank.match(/\d+/)?.[0] || '0');
        return numA - numB;
      });

      const resultProps: Record<string, unknown> = {
        [labels.date]: {
          type: 'date',
          date: { start: new Date().toISOString().split('T')[0] },
        },
      };

      // Fill each rank column with the design title
      for (let i = 0; i < rankedDesigns.length && i < labels.rankCols.length; i++) {
        resultProps[labels.rankCols[i]] = {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: rankedDesigns[i].title } }],
        };
      }

      // Add comment
      if (comment) {
        resultProps[labels.comment] = {
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
