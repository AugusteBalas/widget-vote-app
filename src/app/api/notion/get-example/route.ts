import { NextResponse } from 'next/server';

// Static example configuration using local screenshot (no cookie popup)
const VIASAY_EXAMPLE = {
  clientName: 'ViaSay',
  screenshotUrl: '/viasay-preview.png', // Static image in public folder
  buttonColor: '#0066FF',
  presenceColor: '#22c55e',
};

export interface ExampleData {
  clientName: string;
  screenshotUrl: string;
  buttonColor: string;
  presenceColor: string;
}

export async function GET() {
  return NextResponse.json({
    clientName: VIASAY_EXAMPLE.clientName,
    screenshotUrl: VIASAY_EXAMPLE.screenshotUrl,
    buttonColor: VIASAY_EXAMPLE.buttonColor,
    presenceColor: VIASAY_EXAMPLE.presenceColor,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=604800', // 1 day browser, 1 week CDN
    },
  });
}
