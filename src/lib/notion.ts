import { Client } from '@notionhq/client';

const VOTE_WIDGET_PAGE_ID = '2ff6c41f-4b3a-81ad-b92d-d0af513a04ac';
const RESULTS_DB_TITLES = ['Résultats', 'Results', 'Resultados'];

function slugify(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isNotionId(str: string): boolean {
  return /^[a-f0-9-]{32,36}$/.test(str.replace(/-/g, ''));
}

export type Lang = 'fr' | 'en' | 'es';

export interface VoteDesign {
  pageId: string;
  title: string;
  description: string;
  recommended: boolean;
  imageUrl: string;
  ranking: string | null;
  comment: string;
}

export interface VoteData {
  clientName: string;
  databaseId: string;
  lang: Lang;
  labels: {
    ranking: string;
    description: string;
    recommended: string;
    image: string;
    comment: string;
  };
  designs: VoteDesign[];
  hasVoted: boolean;
  resultRowId?: string;
  buttonColor?: string;
  presenceColor?: string;
}

export interface GetVoteResult {
  data?: VoteData;
  error?: string;
  status?: number;
}

export async function getVoteData(pageIdOrSlug: string): Promise<GetVoteResult> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return { error: 'NOTION_API_KEY not configured', status: 500 };
  }

  let pageId = pageIdOrSlug;
  const notion = new Client({ auth: apiKey });

  try {
    // Resolve slug to Notion page ID if not a UUID
    if (!isNotionId(pageId)) {
      const slug = slugify(pageId);
      console.log('[get-vote] Resolving slug:', JSON.stringify(pageId), '→ slugified:', JSON.stringify(slug));
      let resolved = false;

      // Paginate through all children of the Vote Widget page
      let cursor: string | undefined;
      do {
        const children = await notion.blocks.children.list({
          block_id: VOTE_WIDGET_PAGE_ID,
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        });

        for (const block of children.results) {
          if ('type' in block && block.type === 'child_page') {
            const title = (block as { child_page: { title: string }; id: string }).child_page.title;
            const titleSlug = slugify(title);
            console.log('[get-vote]   child_page:', JSON.stringify(title), '→ slug:', JSON.stringify(titleSlug));
            if (titleSlug === slug) {
              pageId = block.id;
              resolved = true;
              break;
            }
          }
        }

        cursor = children.has_more ? children.next_cursor ?? undefined : undefined;
      } while (!resolved && cursor);

      if (!resolved) {
        console.log('[get-vote] Slug not found among children');
        return { error: 'Client not found', status: 404 };
      }
      console.log('[get-vote] Resolved to pageId:', pageId);
    }

    // 1. Retrieve client page to get title
    const page = await notion.pages.retrieve({ page_id: pageId });
    let clientName = 'Vote';
    if ('properties' in page) {
      const titleProp = page.properties?.title ?? page.properties?.Title;
      if (titleProp && 'title' in titleProp && Array.isArray(titleProp.title)) {
        clientName = titleProp.title.map((t: { plain_text: string }) => t.plain_text).join('') || 'Vote';
      }
    }

    // 2. Find child database and colors by listing blocks
    const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 20 });

    // Extract colors from code block if present
    let buttonColor: string | undefined;
    let presenceColor: string | undefined;
    for (const block of blocks.results) {
      if ('type' in block && block.type === 'code') {
        const codeBlock = block as { code: { rich_text: Array<{ plain_text: string }> } };
        const codeContent = codeBlock.code.rich_text.map(t => t.plain_text).join('');
        try {
          const colors = JSON.parse(codeContent);
          if (colors.buttonColor) buttonColor = colors.buttonColor;
          if (colors.presenceColor) presenceColor = colors.presenceColor;
        } catch {
          // Not a valid JSON, ignore
        }
      }
    }
    const dbBlock = blocks.results.find(
      (b) => 'type' in b && b.type === 'child_database'
    );

    if (!dbBlock || !('id' in dbBlock)) {
      return { error: 'No database found on this page', status: 404 };
    }

    const databaseId = dbBlock.id;

    // 3. Get database to find data_source_id and detect language from property names
    const db = await notion.databases.retrieve({ database_id: databaseId });
    if (!('data_sources' in db) || !db.data_sources?.length) {
      return { error: 'No data sources found', status: 500 };
    }

    const dataSourceId = db.data_sources[0].id;

    // Detect language from property names
    let lang: Lang = 'fr';
    if ('properties' in db && db.properties && typeof db.properties === 'object') {
      const propNames = Object.keys(db.properties as Record<string, unknown>);
      if (propNames.includes('Ranking')) lang = 'en';
      else if (propNames.includes('Clasificación')) lang = 'es';
    }

    // Property name mapping based on detected language
    const labelMap: Record<Lang, { ranking: string; description: string; recommended: string; image: string; comment: string }> = {
      fr: { ranking: 'Classement', description: 'Description', recommended: 'Recommandé', image: 'Image', comment: 'Commentaire' },
      en: { ranking: 'Ranking', description: 'Description', recommended: 'Recommended', image: 'Image', comment: 'Comment' },
      es: { ranking: 'Clasificación', description: 'Descripción', recommended: 'Recomendado', image: 'Imagen', comment: 'Comentario' },
    };
    const labels = labelMap[lang];

    // 4. Query all rows from the database
    const queryResult = await notion.dataSources.query({ data_source_id: dataSourceId, page_size: 10 });

    const designs: VoteDesign[] = queryResult.results
      .filter((r): r is Extract<typeof r, { object: 'page'; properties: Record<string, unknown> }> =>
        'properties' in r
      )
      .map((row) => {
        const props = row.properties as Record<string, Record<string, unknown>>;

        // Title (Design)
        const titleProp = props['Design'];
        const title = titleProp && 'title' in titleProp
          ? (titleProp.title as Array<{ plain_text: string }>).map((t) => t.plain_text).join('')
          : '';

        // Description
        const descProp = props[labels.description];
        const description = descProp && 'rich_text' in descProp
          ? (descProp.rich_text as Array<{ plain_text: string }>).map((t) => t.plain_text).join('')
          : '';

        // Recommended
        const recProp = props[labels.recommended];
        const recommended = recProp && 'checkbox' in recProp ? !!recProp.checkbox : false;

        // Image URL (Notion file)
        let imageUrl = '';
        const imgProp = props[labels.image];
        if (imgProp && 'files' in imgProp) {
          const files = imgProp.files as Array<{ type: string; file?: { url: string }; external?: { url: string } }>;
          if (files.length > 0) {
            const f = files[0];
            if (f.type === 'file' && f.file) imageUrl = f.file.url;
            else if (f.type === 'external' && f.external) imageUrl = f.external.url;
          }
        }

        // Current ranking
        const rankProp = props[labels.ranking];
        const ranking = rankProp && 'select' in rankProp && rankProp.select
          ? (rankProp.select as { name: string }).name
          : null;

        // Current comment
        const commentProp = props[labels.comment];
        const comment = commentProp && 'rich_text' in commentProp
          ? (commentProp.rich_text as Array<{ plain_text: string }>).map((t) => t.plain_text).join('')
          : '';

        return {
          pageId: row.id,
          title,
          description,
          recommended,
          imageUrl,
          ranking,
          comment,
        };
      });

    // Check if already voted (any row has a ranking set)
    const hasVoted = designs.some((d) => d.ranking !== null);

    // 5. Find the result row for this client in the shared Results DB
    let resultRowId: string | undefined;
    try {
      const voteWidgetBlocks = await notion.blocks.children.list({
        block_id: VOTE_WIDGET_PAGE_ID,
        page_size: 50,
      });
      const resultsDbBlock = voteWidgetBlocks.results.find((b) => {
        if (!('type' in b) || b.type !== 'child_database') return false;
        const db = b as { child_database: { title: string } };
        return RESULTS_DB_TITLES.includes(db.child_database.title);
      });

      if (resultsDbBlock) {
        const resultsDb = await notion.databases.retrieve({ database_id: resultsDbBlock.id });
        if ('data_sources' in resultsDb && resultsDb.data_sources?.length) {
          const resultsDs = resultsDb.data_sources[0].id;
          const resultsQuery = await notion.dataSources.query({
            data_source_id: resultsDs,
            filter: {
              property: 'Client',
              title: { equals: clientName },
            },
            page_size: 1,
          });
          if (resultsQuery.results.length > 0) {
            resultRowId = resultsQuery.results[0].id;
          }
        }
      }
    } catch (e) {
      console.error('Failed to find result row:', e);
    }

    return {
      data: {
        clientName,
        databaseId,
        lang,
        labels,
        designs,
        hasVoted,
        resultRowId,
        buttonColor,
        presenceColor,
      },
    };
  } catch (err) {
    console.error('Notion get-vote error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: message, status: 500 };
  }
}
