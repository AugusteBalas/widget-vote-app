import { NextResponse } from 'next/server';

// Static example configuration - no Notion API call needed
const VIASAY_EXAMPLE = {
  clientName: 'ViaSay',
  siteUrl: 'https://www.viasay.io',
  buttonColor: '#0066FF',
  presenceColor: '#22c55e',
};

// Use Thum.io for fast, cached screenshot (free service)
function getStaticScreenshotUrl(siteUrl: string): string {
  return `https://image.thum.io/get/width/1280/crop/720/noanimate/${siteUrl}`;
}

export interface ExampleData {
  clientName: string;
  screenshotUrl: string;
  buttonColor: string;
  presenceColor: string;
}

export async function GET() {
  // Return static example data immediately - no API calls needed
  const exampleData: ExampleData = {
    clientName: VIASAY_EXAMPLE.clientName,
    screenshotUrl: getStaticScreenshotUrl(VIASAY_EXAMPLE.siteUrl),
    buttonColor: VIASAY_EXAMPLE.buttonColor,
    presenceColor: VIASAY_EXAMPLE.presenceColor,
  };

  // Set cache headers for performance
  return NextResponse.json(exampleData, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
