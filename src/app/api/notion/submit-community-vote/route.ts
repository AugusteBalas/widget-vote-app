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

async function sendSlackNotification(
  notion: Client,
  resultsDbId: string,
  voterName: string,
  conceptLabel: string,
) {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;
  if (!slackToken || !channelId) return;

  // Query all community votes from the Results DB to build a tally
  const resultsDb = await notion.databases.retrieve({ database_id: resultsDbId });
  if (!('data_sources' in resultsDb) || !resultsDb.data_sources?.length) return;

  const dsId = resultsDb.data_sources[0].id;
  const allRows = await notion.dataSources.query({ data_source_id: dsId, page_size: 100 });

  // Count votes per design (from "1er choix" column)
  const tally: Record<string, number> = {};
  let totalVotes = 0;

  for (const row of allRows.results) {
    if (!('properties' in row)) continue;
    const props = row.properties as Record<string, Record<string, unknown>>;
    const choiceProp = props['1er choix'];
    if (choiceProp && 'rich_text' in choiceProp) {
      const text = (choiceProp.rich_text as Array<{ plain_text: string }>)
        .map((t) => t.plain_text).join('').trim();
      if (text) {
        // Extract just "Option X" from "Option A - Rotation + Présence"
        const optionMatch = text.match(/^(Option [A-F])/);
        const key = optionMatch ? optionMatch[1] : text;
        tally[key] = (tally[key] || 0) + 1;
        totalVotes++;
      }
    }
  }

  // Sort by votes descending
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const leader = sorted[0];

  // Build tally lines
  const tallyLines = sorted.map(([design, count]) => {
    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
    return `${design}: ${bar} ${count} vote${count > 1 ? 's' : ''} (${pct}%)`;
  }).join('\n');

  const text = [
    `🗳️ *Nouveau vote !*`,
    `*${voterName}* a voté pour *${conceptLabel}*`,
    ``,
    `📊 *Classement en temps réel* (${totalVotes} vote${totalVotes > 1 ? 's' : ''})`,
    tallyLines,
    ``,
    `🏆 *En tête : ${leader[0]}* avec ${leader[1]} vote${leader[1] > 1 ? 's' : ''}`,
  ].join('\n');

  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${slackToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel: channelId, text }),
  });
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

    // Send Slack notification (non-blocking)
    sendSlackNotification(notion, resultsDbId, voterName?.trim() || 'Anonyme', conceptLabel).catch((e: unknown) =>
      console.error('Slack notification error:', e)
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Community vote error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
