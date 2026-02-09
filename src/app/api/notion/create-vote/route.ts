import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const VOTE_WIDGET_PAGE_ID = '2ff6c41f-4b3a-81ad-b92d-d0af513a04ac';

type Lang = 'fr' | 'en' | 'es';

interface RequestBody {
  clientName?: string;
  siteUrl: string;
  lang: Lang;
  screenshotUrl: string;
  buttonColor: string;
  presenceColor: string;
}

// Titles for the client votes DB (separate from community/demo "Résultats")
const CLIENT_VOTES_DB_TITLES = ['Votes Clients', 'Client Votes', 'Votos Clientes'];

// Fixed column names for Client Votes DB (always use French since it's shared)
const CLIENT_VOTES_COLS = {
  voteLink: 'Lien vote',
  clientLink: 'Lien client',
  rankCols: ['1er choix', '2e choix', '3e choix'],
  comment: 'Commentaire',
  date: 'Date',
};

const LABELS: Record<Lang, {
  ranking: string;
  rankOptions: string[];
  description: string;
  recommended: string;
  image: string;
  comment: string;
  dbTitle: string;
  clientVotesDbTitle: string;
  resultRankCols: string[];
  resultComment: string;
  resultDate: string;
  resultVoteLink: string;
  resultClientLink: string;
}> = {
  fr: {
    ranking: 'Classement',
    rankOptions: ['1er choix', '2e choix', '3e choix'],
    description: 'Description',
    recommended: 'Recommandé',
    image: 'Image',
    comment: 'Commentaire',
    dbTitle: 'Designs proposés',
    clientVotesDbTitle: 'Votes Clients',
    resultRankCols: ['1er choix', '2e choix', '3e choix'],
    resultComment: 'Commentaire',
    resultDate: 'Date',
    resultVoteLink: 'Lien vote',
    resultClientLink: 'Lien client',
  },
  en: {
    ranking: 'Ranking',
    rankOptions: ['1st choice', '2nd choice', '3rd choice'],
    description: 'Description',
    recommended: 'Recommended',
    image: 'Image',
    comment: 'Comment',
    dbTitle: 'Proposed designs',
    clientVotesDbTitle: 'Client Votes',
    resultRankCols: ['1st choice', '2nd choice', '3rd choice'],
    resultComment: 'Comment',
    resultDate: 'Date',
    resultVoteLink: 'Vote link',
    resultClientLink: 'Client link',
  },
  es: {
    ranking: 'Clasificación',
    rankOptions: ['1ª opción', '2ª opción', '3ª opción'],
    description: 'Descripción',
    recommended: 'Recomendado',
    image: 'Imagen',
    comment: 'Comentario',
    dbTitle: 'Diseños propuestos',
    clientVotesDbTitle: 'Votos Clientes',
    resultRankCols: ['1ª opción', '2ª opción', '3ª opción'],
    resultComment: 'Comentario',
    resultDate: 'Fecha',
    resultVoteLink: 'Enlace de voto',
    resultClientLink: 'Enlace cliente',
  },
};

const CONCEPT_LETTERS: Record<string, string> = {
  B: 'A', B2: 'B', D: 'C', D2: 'D', OLD: 'E', OLD2: 'F',
};

const CONCEPT_META: Record<string, { name: Record<Lang, string>; description: Record<Lang, string>; recommended?: boolean }> = {
  B: {
    name:        { fr: 'Rotation + Présence', en: 'Rotation + Presence', es: 'Rotación + Presencia' },
    description: { fr: 'Logo inversé avec point vert de présence', en: 'Flipped logo with green presence dot', es: 'Logo invertido con punto verde de presencia' },
  },
  B2: {
    name:        { fr: 'Rotation + Badge', en: 'Rotation + Badge', es: 'Rotación + Badge' },
    description: { fr: 'Logo inversé avec badge de notification', en: 'Flipped logo with notification badge', es: 'Logo invertido con insignia de notificación' },
  },
  D: {
    name:        { fr: 'Symétrie + Présence', en: 'Symmetry + Presence', es: 'Simetría + Presencia' },
    description: { fr: 'Logo symétrique avec point vert de présence', en: 'Symmetric logo with green presence dot', es: 'Logo simétrico con punto verde de presencia' },
  },
  D2: {
    name:        { fr: 'Symétrie + Badge', en: 'Symmetry + Badge', es: 'Simetría + Badge' },
    description: { fr: 'Logo symétrique avec badge de notification', en: 'Symmetric logo with notification badge', es: 'Logo simétrico con insignia de notificación' },
  },
  OLD: {
    name:        { fr: 'Actuel + Présence', en: 'Current + Presence', es: 'Actual + Presencia' },
    description: { fr: 'Widget actuel avec point vert de présence', en: 'Current widget with green presence dot', es: 'Widget actual con punto verde de presencia' },
  },
  OLD2: {
    name:        { fr: 'Actuel + Badge', en: 'Current + Badge', es: 'Actual + Badge' },
    description: { fr: 'Widget actuel avec badge de notification', en: 'Current widget with notification badge', es: 'Widget actual con insignia de notificación' },
  },
};

function slugify(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function base64ToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

function extractClientNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    // Remove www. and get the main domain part
    const domain = hostname.replace(/^www\./, '').split('.')[0];
    // Capitalize first letter
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return url;
  }
}

function formatArchiveEntry(choices: { first?: string; second?: string; third?: string }): string {
  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const parts: string[] = [];
  if (choices.first) parts.push(choices.first);
  if (choices.second) parts.push(choices.second);
  if (choices.third) parts.push(choices.third);
  return `[Archive ${date}: ${parts.join(', ')}]`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'NOTION_API_KEY non configurée' },
        { status: 500 }
      );
    }

    const body: RequestBody = await request.json();
    const { siteUrl, lang = 'fr', screenshotUrl, buttonColor, presenceColor } = body;

    // Auto-extract client name from URL if not provided
    const clientName = body.clientName || extractClientNameFromUrl(siteUrl);

    if (!siteUrl || !screenshotUrl) {
      return NextResponse.json(
        { error: 'siteUrl et screenshotUrl sont requis' },
        { status: 400 }
      );
    }

    const labels = LABELS[lang] || LABELS.fr;
    const notion = new Client({ auth: apiKey });
    const clientSlug = slugify(clientName);

    // 1. Upload screenshot to Notion
    let screenshotFileId: string | null = null;
    if (screenshotUrl.startsWith('data:')) {
      const buffer = base64ToBuffer(screenshotUrl);
      const uint8 = new Uint8Array(buffer);
      const blob = new Blob([uint8], { type: 'image/png' });

      const fileUpload = await notion.fileUploads.create({
        mode: 'single_part',
        filename: `${clientSlug}-screenshot.png`,
        content_type: 'image/png',
      });

      await notion.fileUploads.send({
        file_upload_id: fileUpload.id,
        file: { data: blob, filename: `screenshot.png` },
      });

      screenshotFileId = fileUpload.id;
    }

    // 2. Find or create Client Votes DB (separate from community "Résultats" DB)
    let clientVotesDbId: string | null = null;
    const voteWidgetBlocks = await notion.blocks.children.list({
      block_id: VOTE_WIDGET_PAGE_ID,
      page_size: 50,
    });

    for (const block of voteWidgetBlocks.results) {
      if ('type' in block && block.type === 'child_database') {
        const dbBlock = block as { type: 'child_database'; child_database: { title: string }; id: string };
        // Look for the Client Votes DB specifically (not the community "Résultats" DB)
        if (CLIENT_VOTES_DB_TITLES.includes(dbBlock.child_database.title)) {
          clientVotesDbId = dbBlock.id;
          break;
        }
      }
    }

    if (!clientVotesDbId) {
      // Create Client Votes DB with structure: Client, Lien vote, Lien client, 1er/2e/3e choix, Commentaire, Date
      // Always use French column names since this DB is shared across all languages
      const clientVotesDb = await notion.databases.create({
        parent: { type: 'page_id', page_id: VOTE_WIDGET_PAGE_ID },
        title: [{ type: 'text', text: { content: 'Votes Clients' } }],
        is_inline: true,
        icon: { type: 'emoji', emoji: '🗳️' },
        initial_data_source: {
          properties: {
            Client: { type: 'title', title: {} },
            [CLIENT_VOTES_COLS.voteLink]: { type: 'url', url: {} },
            [CLIENT_VOTES_COLS.clientLink]: { type: 'url', url: {} },
            [CLIENT_VOTES_COLS.rankCols[0]]: { type: 'rich_text', rich_text: {} },
            [CLIENT_VOTES_COLS.rankCols[1]]: { type: 'rich_text', rich_text: {} },
            [CLIENT_VOTES_COLS.rankCols[2]]: { type: 'rich_text', rich_text: {} },
            [CLIENT_VOTES_COLS.comment]: { type: 'rich_text', rich_text: {} },
            [CLIENT_VOTES_COLS.date]: { type: 'date', date: {} },
          },
        },
      });
      clientVotesDbId = clientVotesDb.id;
    }

    // 3. Check if client already exists in Results DB
    const clientVotesDb = await notion.databases.retrieve({ database_id: clientVotesDbId });
    if (!('data_sources' in clientVotesDb) || !clientVotesDb.data_sources?.length) {
      return NextResponse.json({ error: 'No data sources in Results DB' }, { status: 500 });
    }

    const clientVotesDataSourceId = clientVotesDb.data_sources[0].id;
    const existingQuery = await notion.dataSources.query({
      data_source_id: clientVotesDataSourceId,
      filter: {
        property: 'Client',
        title: { equals: clientName },
      },
      page_size: 1,
    });

    let resultRowId: string;
    let existingPageId: string | null = null;
    let wasUpdated = false;

    if (existingQuery.results.length > 0) {
      // Client exists - archive existing votes and reset
      wasUpdated = true;
      resultRowId = existingQuery.results[0].id;
      console.log('[create-vote] Updating existing client:', clientName);

      const voteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://widget-vote-app.vercel.app'}/vote/${clientSlug}`;
      const clientUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;

      // Get current vote values for archive
      const existingRow = existingQuery.results[0];
      if ('properties' in existingRow) {
        const props = existingRow.properties as Record<string, Record<string, unknown>>;

        const getTextValue = (prop: Record<string, unknown> | undefined): string => {
          if (!prop || !('rich_text' in prop)) return '';
          const rt = prop.rich_text as Array<{ plain_text: string }>;
          return rt.map(t => t.plain_text).join('');
        };

        // Use fixed French column names for Client Votes DB
        const currentFirst = getTextValue(props[CLIENT_VOTES_COLS.rankCols[0]]);
        const currentSecond = getTextValue(props[CLIENT_VOTES_COLS.rankCols[1]]);
        const currentThird = getTextValue(props[CLIENT_VOTES_COLS.rankCols[2]]);
        const currentComment = getTextValue(props[CLIENT_VOTES_COLS.comment]);

        // Build archive entry if there were existing votes
        let newComment = currentComment;
        if (currentFirst || currentSecond || currentThird) {
          const archiveEntry = formatArchiveEntry({
            first: currentFirst,
            second: currentSecond,
            third: currentThird,
          });
          newComment = currentComment
            ? `${archiveEntry}\n${currentComment}`
            : archiveEntry;
        }

        // Reset votes, update links, and add archive to comment
        // Use fixed French column names for Client Votes DB
        await notion.pages.update({
          page_id: resultRowId,
          properties: {
            [CLIENT_VOTES_COLS.voteLink]: {
              type: 'url',
              url: voteUrl,
            },
            [CLIENT_VOTES_COLS.clientLink]: {
              type: 'url',
              url: clientUrl,
            },
            [CLIENT_VOTES_COLS.rankCols[0]]: {
              type: 'rich_text',
              rich_text: [],
            },
            [CLIENT_VOTES_COLS.rankCols[1]]: {
              type: 'rich_text',
              rich_text: [],
            },
            [CLIENT_VOTES_COLS.rankCols[2]]: {
              type: 'rich_text',
              rich_text: [],
            },
            [CLIENT_VOTES_COLS.comment]: {
              type: 'rich_text',
              rich_text: newComment ? [{ type: 'text', text: { content: newComment } }] : [],
            },
            [CLIENT_VOTES_COLS.date]: {
              type: 'date',
              date: null,
            },
          } as Parameters<Client['pages']['update']>[0]['properties'],
        });
      }

      // Find existing client page to update
      let cursor: string | undefined;
      do {
        const children = await notion.blocks.children.list({
          block_id: VOTE_WIDGET_PAGE_ID,
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        });

        for (const block of children.results) {
          if ('type' in block && block.type === 'child_page') {
            const pageBlock = block as { child_page: { title: string }; id: string };
            const titleSlug = slugify(pageBlock.child_page.title);
            if (titleSlug === clientSlug) {
              existingPageId = pageBlock.id;
              break;
            }
          }
        }

        cursor = children.has_more ? children.next_cursor ?? undefined : undefined;
      } while (!existingPageId && cursor);

    } else {
      // Create new row in Client Votes DB
      // Use fixed French column names for Client Votes DB
      const voteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://widget-vote-app.vercel.app'}/vote/${clientSlug}`;
      const clientUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;

      const newRow = await notion.pages.create({
        parent: { type: 'database_id', database_id: clientVotesDbId },
        properties: {
          Client: {
            type: 'title',
            title: [{ type: 'text', text: { content: clientName } }],
          },
          [CLIENT_VOTES_COLS.voteLink]: {
            type: 'url',
            url: voteUrl,
          },
          [CLIENT_VOTES_COLS.clientLink]: {
            type: 'url',
            url: clientUrl,
          },
        } as Parameters<Client['pages']['create']>[0]['properties'],
      });
      resultRowId = newRow.id;
    }

    // 4. Create or update the client page with designs DB
    let clientPageId: string;
    let databaseId: string;

    if (existingPageId) {
      // UPDATE existing page
      clientPageId = existingPageId;
      console.log('[create-vote] Updating existing page:', clientPageId);

      // Find and update the code block with colors
      const pageBlocks = await notion.blocks.children.list({ block_id: clientPageId, page_size: 20 });

      for (const block of pageBlocks.results) {
        if ('type' in block && block.type === 'code') {
          await notion.blocks.update({
            block_id: block.id,
            code: {
              language: 'json',
              rich_text: [
                { type: 'text', text: { content: JSON.stringify({ buttonColor, presenceColor }) } },
              ],
            },
          });
        }
      }

      // Find the database
      const dbBlock = pageBlocks.results.find(
        (b) => 'type' in b && b.type === 'child_database'
      );

      if (!dbBlock || !('id' in dbBlock)) {
        return NextResponse.json({ error: 'Database not found in existing page' }, { status: 500 });
      }

      databaseId = dbBlock.id;

      // Get database to find data_source_id
      const db = await notion.databases.retrieve({ database_id: databaseId });
      if (!('data_sources' in db) || !db.data_sources?.length) {
        return NextResponse.json({ error: 'No data sources found' }, { status: 500 });
      }

      const dataSourceId = db.data_sources[0].id;

      // Query existing rows and reset votes + update images
      const queryResult = await notion.dataSources.query({ data_source_id: dataSourceId, page_size: 10 });

      for (const row of queryResult.results) {
        if ('properties' in row) {
          const updateProps: Record<string, unknown> = {
            // Reset ranking
            [labels.ranking]: {
              type: 'select',
              select: null,
            },
            // Reset comment
            [labels.comment]: {
              type: 'rich_text',
              rich_text: [],
            },
          };

          // Update image
          if (screenshotFileId) {
            updateProps[labels.image] = {
              type: 'files',
              files: [{
                type: 'file_upload',
                file_upload: { id: screenshotFileId },
                name: `screenshot.png`,
              }],
            };
          } else if (!screenshotUrl.startsWith('data:')) {
            updateProps[labels.image] = {
              type: 'files',
              files: [{
                type: 'external',
                external: { url: screenshotUrl },
                name: `screenshot.png`,
              }],
            };
          }

          await notion.pages.update({
            page_id: row.id,
            properties: updateProps as Parameters<Client['pages']['update']>[0]['properties'],
          });
        }
      }

    } else {
      // CREATE new page
      console.log('[create-vote] Creating new page for:', clientName);

      const clientPage = await notion.pages.create({
        parent: { type: 'page_id', page_id: VOTE_WIDGET_PAGE_ID },
        icon: { type: 'emoji', emoji: '🎨' },
        properties: {
          title: {
            type: 'title',
            title: [{ type: 'text', text: { content: clientName } }],
          },
        },
        children: [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [
                { type: 'text', text: { content: siteUrl, link: { url: siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}` } } },
              ],
            },
          },
          {
            type: 'code',
            code: {
              language: 'json',
              rich_text: [
                { type: 'text', text: { content: JSON.stringify({ buttonColor, presenceColor }) } },
              ],
            },
          },
        ],
      });

      clientPageId = clientPage.id;

      // Create database
      const db = await notion.databases.create({
        parent: { type: 'page_id', page_id: clientPageId },
        title: [{ type: 'text', text: { content: labels.dbTitle } }],
        is_inline: true,
        icon: { type: 'emoji', emoji: '🗳️' },
        initial_data_source: {
          properties: {
            Design: { type: 'title', title: {} },
            [labels.image]: { type: 'files', files: {} },
            [labels.description]: { type: 'rich_text', rich_text: {} },
            [labels.recommended]: { type: 'checkbox', checkbox: {} },
            [labels.ranking]: {
              type: 'select',
              select: {
                options: labels.rankOptions.map((name, i) => ({
                  name,
                  color: (['green', 'blue', 'yellow'] as const)[i],
                })),
              },
            },
            [labels.comment]: { type: 'rich_text', rich_text: {} },
          },
        },
      });

      databaseId = db.id;

      // Add rows for each widget variant
      const conceptOrder = ['B', 'B2', 'D', 'D2', 'OLD', 'OLD2'];
      for (const conceptId of conceptOrder) {
        const meta = CONCEPT_META[conceptId];
        if (!meta) continue;

        const letter = CONCEPT_LETTERS[conceptId] || conceptId;
        const designName = meta.recommended
          ? `Option ${letter} - ${meta.name[lang]} ⭐`
          : `Option ${letter} - ${meta.name[lang]}`;

        const properties: Record<string, unknown> = {
          Design: {
            type: 'title',
            title: [{ type: 'text', text: { content: designName } }],
          },
          [labels.description]: {
            type: 'rich_text',
            rich_text: [{ type: 'text', text: { content: meta.description[lang] } }],
          },
          [labels.recommended]: {
            type: 'checkbox',
            checkbox: !!meta.recommended,
          },
        };

        if (screenshotFileId) {
          properties[labels.image] = {
            type: 'files',
            files: [{
              type: 'file_upload',
              file_upload: { id: screenshotFileId },
              name: `screenshot.png`,
            }],
          };
        } else if (!screenshotUrl.startsWith('data:')) {
          properties[labels.image] = {
            type: 'files',
            files: [{
              type: 'external',
              external: { url: screenshotUrl },
              name: `screenshot.png`,
            }],
          };
        }

        await notion.pages.create({
          parent: { type: 'database_id', database_id: databaseId },
          properties: properties as Parameters<Client['pages']['create']>[0]['properties'],
        });
      }
    }

    const pageUrl = `https://www.notion.so/${clientPageId.replace(/-/g, '')}`;
    const voteUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://widget-vote-app.vercel.app'}/vote/${clientSlug}`;

    return NextResponse.json({
      success: true,
      pageId: clientPageId,
      databaseId,
      pageUrl,
      voteUrl,
      clientName,
      updated: wasUpdated,
    });
  } catch (err) {
    console.error('Notion create-vote error:', err);
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
