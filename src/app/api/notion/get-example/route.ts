import { NextResponse } from 'next/server';
import { getVoteData } from '@/lib/notion';

// Default example client slug (Viasay)
const DEFAULT_EXAMPLE_SLUG = 'viasay';

export interface ExampleData {
  clientName: string;
  screenshotUrl: string | null;
  buttonColor: string;
  presenceColor: string;
}

export async function GET() {
  try {
    const result = await getVoteData(DEFAULT_EXAMPLE_SLUG);

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Example not found' },
        { status: result.status || 404 }
      );
    }

    const { clientName, designs, buttonColor, presenceColor } = result.data;

    // Get the first design's image URL as the screenshot
    // The designs all share the same screenshot in our system
    const screenshotUrl = designs.find(d => d.imageUrl)?.imageUrl || null;

    const exampleData: ExampleData = {
      clientName,
      screenshotUrl,
      buttonColor: buttonColor || '#0066FF',
      presenceColor: presenceColor || '#22c55e',
    };

    return NextResponse.json(exampleData);
  } catch (err) {
    console.error('Get example error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
