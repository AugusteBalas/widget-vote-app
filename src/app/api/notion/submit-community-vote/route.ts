import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const VOTE_WIDGET_PAGE_ID = '2ff6c41f-4b3a-81ad-b92d-d0af513a04ac';
const RESULTS_DB_TITLES = ['Résultats', 'Results', 'Resultados'];

interface RequestBody {
  voterName?: string;
  conceptId: string;
  conceptLabel: string;
  siteUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'NOTION_API_KEY not configured' }, { status: 500 });
    }

    const body: RequestBody = await request.json();
    const { voterName, conceptId, conceptLabel, siteUrl } = body;

    if (!conceptId || !conceptLabel) {
      return NextResponse.json({ error: 'conceptId and conceptLabel are required' }, { status: 400 });
    }

    const notion = new Client({ auth: apiKey });

    // Find or create the Results DB under Vote Widget
    const blocks = await notion.blocks.children.list({
      block_id: VOTE_WIDGET_PAGE_ID,
      page_size: 50,
    });

    let resultsDbId: string | null = null;
    for (const b of blocks.results) {
      if (!('type' in b) || b.type !== 'child_database') continue;
      const db = b as { child_database: { title: string }; id: string };
      if (RESULTS_DB_TITLES.includes(db.child_database.title)) {
        resultsDbId = db.id;
        break;
      }
    }

    if (!resultsDbId) {
      const resultsDb = await notion.databases.create({
        parent: { type: 'page_id', page_id: VOTE_WIDGET_PAGE_ID },
        title: [{ type: 'text', text: { content: 'Résultats' } }],
        is_inline: true,
        icon: { type: 'emoji', emoji: '📊' },
        initial_data_source: {
          properties: {
            Client: { type: 'title', title: {} },
            '1er choix': { type: 'rich_text', rich_text: {} },
            '2e choix': { type: 'rich_text', rich_text: {} },
            '3e choix': { type: 'rich_text', rich_text: {} },
            Commentaire: { type: 'rich_text', rich_text: {} },
            Date: { type: 'date', date: {} },
            'Lien vote': { type: 'url', url: {} },
          },
        },
      });
      resultsDbId = resultsDb.id;
    }

    // Add a row for this community vote
    await notion.pages.create({
      parent: { type: 'database_id', database_id: resultsDbId },
      properties: {
        Client: {
          type: 'title',
          title: [{ type: 'text', text: { content: voterName?.trim() || 'Anonyme' } }],
        },
        '1er choix': {
          type: 'rich_text',
          rich_text: [{ type: 'text', text: { content: conceptLabel } }],
        },
        Date: {
          type: 'date',
          date: { start: new Date().toISOString().split('T')[0] },
        },
        'Lien vote': {
          type: 'url',
          url: 'https://linkedin.com',
        },
        ...(siteUrl ? {
          Commentaire: {
            type: 'rich_text',
            rich_text: [{ type: 'text', text: { content: siteUrl } }],
          },
        } : {}),
      } as Parameters<Client['pages']['create']>[0]['properties'],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Community vote error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
