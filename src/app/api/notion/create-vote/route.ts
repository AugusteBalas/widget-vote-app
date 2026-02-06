import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const VOTE_WIDGET_PAGE_ID = '2ff6c41f-4b3a-81ad-b92d-d0af513a04ac';

interface ImagePayload {
  conceptId: string;
  dataUrl: string;
  filename: string;
}

type Lang = 'fr' | 'en' | 'es';

interface RequestBody {
  clientName: string;
  siteUrl: string;
  lang: Lang;
  images: ImagePayload[];
}

const LABELS: Record<Lang, {
  ranking: string;
  rankOptions: string[];
  description: string;
  recommended: string;
  image: string;
  comment: string;
  dbTitle: string;
  resultsDbTitle: string;
  resultRankCols: string[];
  resultComment: string;
  resultDate: string;
  resultVoteLink: string;
}> = {
  fr: {
    ranking: 'Classement',
    rankOptions: ['1er choix', '2e choix', '3e choix', '4e choix'],
    description: 'Description',
    recommended: 'Recommandé',
    image: 'Image',
    comment: 'Commentaire',
    dbTitle: 'Designs proposés',
    resultsDbTitle: 'Résultats',
    resultRankCols: ['1er choix', '2e choix', '3e choix', '4e choix'],
    resultComment: 'Commentaire',
    resultDate: 'Date',
    resultVoteLink: 'Lien vote',
  },
  en: {
    ranking: 'Ranking',
    rankOptions: ['1st choice', '2nd choice', '3rd choice', '4th choice'],
    description: 'Description',
    recommended: 'Recommended',
    image: 'Image',
    comment: 'Comment',
    dbTitle: 'Proposed designs',
    resultsDbTitle: 'Results',
    resultRankCols: ['1st choice', '2nd choice', '3rd choice', '4th choice'],
    resultComment: 'Comment',
    resultDate: 'Date',
    resultVoteLink: 'Vote link',
  },
  es: {
    ranking: 'Clasificación',
    rankOptions: ['1ª opción', '2ª opción', '3ª opción', '4ª opción'],
    description: 'Descripción',
    recommended: 'Recomendado',
    image: 'Imagen',
    comment: 'Comentario',
    dbTitle: 'Diseños propuestos',
    resultsDbTitle: 'Resultados',
    resultRankCols: ['1ª opción', '2ª opción', '3ª opción', '4ª opción'],
    resultComment: 'Comentario',
    resultDate: 'Fecha',
    resultVoteLink: 'Enlace de voto',
  },
};

const CONCEPT_META: Record<string, { name: Record<Lang, string>; description: Record<Lang, string>; recommended?: boolean }> = {
  B: {
    name:        { fr: 'Classique', en: 'Classic', es: 'Clásico' },
    description: { fr: 'Rotation 180° avec témoin de présence externe', en: '180° rotation with external presence indicator', es: 'Rotación 180° con indicador de presencia externo' },
  },
  B2: {
    name:        { fr: 'Présence Intégrée', en: 'Integrated Presence', es: 'Presencia Integrada' },
    description: { fr: 'Le cercle du logo devient le témoin de présence', en: 'The logo circle becomes the presence indicator', es: 'El círculo del logo se convierte en el indicador de presencia' },
    recommended: true,
  },
  D: {
    name:        { fr: 'Symétrie Verticale', en: 'Vertical Symmetry', es: 'Simetría Vertical' },
    description: { fr: 'Pill en haut, cercle en bas avec témoin externe', en: 'Pill on top, circle at bottom with external indicator', es: 'Píldora arriba, círculo abajo con indicador externo' },
  },
  D2: {
    name:        { fr: 'Symétrie + Glow', en: 'Symmetry + Glow', es: 'Simetría + Glow' },
    description: { fr: 'Symétrie verticale avec cercle vert intégré', en: 'Vertical symmetry with integrated green circle', es: 'Simetría vertical con círculo verde integrado' },
    recommended: true,
  },
};

function base64ToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
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
    const { clientName, siteUrl, lang = 'fr', images } = body;

    if (!clientName || !images || images.length === 0) {
      return NextResponse.json(
        { error: 'clientName et images sont requis' },
        { status: 400 }
      );
    }

    const labels = LABELS[lang] || LABELS.fr;
    const notion = new Client({ auth: apiKey });

    // 1. Upload all images to Notion
    const uploadedFiles: { conceptId: string; fileUploadId: string }[] = [];

    for (const img of images) {
      const buffer = base64ToBuffer(img.dataUrl);
      const uint8 = new Uint8Array(buffer);
      const blob = new Blob([uint8], { type: 'image/png' });

      const fileUpload = await notion.fileUploads.create({
        mode: 'single_part',
        filename: img.filename,
        content_type: 'image/png',
      });

      await notion.fileUploads.send({
        file_upload_id: fileUpload.id,
        file: { data: blob, filename: img.filename },
      });

      uploadedFiles.push({
        conceptId: img.conceptId,
        fileUploadId: fileUpload.id,
      });
    }

    // 2. Create client sub-page under "Vote Widget"
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
      ],
    });

    const clientPageId = clientPage.id;

    // 3. Create database inside client page
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
                color: (['green', 'blue', 'yellow', 'gray'] as const)[i],
              })),
            },
          },
          [labels.comment]: { type: 'rich_text', rich_text: {} },
        },
      },
    });

    const databaseId = db.id;

    // 4. Add one row per variant
    const conceptOrder = ['B', 'B2', 'D', 'D2'];
    for (const conceptId of conceptOrder) {
      const meta = CONCEPT_META[conceptId];
      const upload = uploadedFiles.find((f) => f.conceptId === conceptId);
      if (!meta) continue;

      const designName = meta.recommended
        ? `Option ${conceptId} - ${meta.name[lang]} ⭐`
        : `Option ${conceptId} - ${meta.name[lang]}`;

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

      if (upload) {
        properties[labels.image] = {
          type: 'files',
          files: [{
            type: 'file_upload',
            file_upload: { id: upload.fileUploadId },
            name: `widget-${conceptId}.png`,
          }],
        };
      }

      await notion.pages.create({
        parent: { type: 'database_id', database_id: databaseId },
        properties: properties as Parameters<Client['pages']['create']>[0]['properties'],
      });
    }

    // 5. Find or create the shared "Résultats" DB under Vote Widget
    let resultsDbId: string | null = null;
    const voteWidgetBlocks = await notion.blocks.children.list({
      block_id: VOTE_WIDGET_PAGE_ID,
      page_size: 50,
    });

    for (const block of voteWidgetBlocks.results) {
      if ('type' in block && block.type === 'child_database') {
        const dbBlock = block as { type: 'child_database'; child_database: { title: string }; id: string };
        // Match any language variant of the results DB title
        const resultsTitles = Object.values(LABELS).map(l => l.resultsDbTitle);
        if (resultsTitles.includes(dbBlock.child_database.title)) {
          resultsDbId = dbBlock.id;
          break;
        }
      }
    }

    if (!resultsDbId) {
      // Create the Results DB (uses the language of the first client who triggers it)
      const resultsDb = await notion.databases.create({
        parent: { type: 'page_id', page_id: VOTE_WIDGET_PAGE_ID },
        title: [{ type: 'text', text: { content: labels.resultsDbTitle } }],
        is_inline: true,
        icon: { type: 'emoji', emoji: '📊' },
        initial_data_source: {
          properties: {
            Client: { type: 'title', title: {} },
            [labels.resultRankCols[0]]: { type: 'rich_text', rich_text: {} },
            [labels.resultRankCols[1]]: { type: 'rich_text', rich_text: {} },
            [labels.resultRankCols[2]]: { type: 'rich_text', rich_text: {} },
            [labels.resultRankCols[3]]: { type: 'rich_text', rich_text: {} },
            [labels.resultComment]: { type: 'rich_text', rich_text: {} },
            [labels.resultDate]: { type: 'date', date: {} },
            [labels.resultVoteLink]: { type: 'url', url: {} },
          },
        },
      });
      resultsDbId = resultsDb.id;
    }

    // 6. Add a row for this client in the Results DB
    const resultRow = await notion.pages.create({
      parent: { type: 'database_id', database_id: resultsDbId },
      properties: {
        Client: {
          type: 'title',
          title: [{ type: 'text', text: { content: clientName } }],
        },
      } as Parameters<Client['pages']['create']>[0]['properties'],
    });

    const resultRowId = resultRow.id;

    const pageUrl = 'url' in clientPage
      ? clientPage.url
      : `https://www.notion.so/${clientPageId.replace(/-/g, '')}`;

    return NextResponse.json({
      success: true,
      pageId: clientPageId,
      databaseId,
      resultRowId,
      pageUrl,
    });
  } catch (err) {
    console.error('Notion create-vote error:', err);
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
