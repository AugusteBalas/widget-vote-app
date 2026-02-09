import { NextResponse } from 'next/server';

// Static example configuration
const VIASAY_EXAMPLE = {
  clientName: 'ViaSay',
  siteUrl: 'https://www.viasay.io',
  buttonColor: '#0066FF',
  presenceColor: '#22c55e',
};

export interface ExampleData {
  clientName: string;
  screenshotUrl: string;
  buttonColor: string;
  presenceColor: string;
}

// Cache the screenshot URL to avoid repeated API calls
let cachedScreenshotUrl: string | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 3600000; // 1 hour in ms

export async function GET() {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedScreenshotUrl && (now - cacheTimestamp) < CACHE_DURATION) {
      return NextResponse.json({
        clientName: VIASAY_EXAMPLE.clientName,
        screenshotUrl: cachedScreenshotUrl,
        buttonColor: VIASAY_EXAMPLE.buttonColor,
        presenceColor: VIASAY_EXAMPLE.presenceColor,
      }, {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      });
    }

    // Call Microlink API to get screenshot URL
    const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(
      VIASAY_EXAMPLE.siteUrl
    )}&screenshot=true&meta=false&viewport.width=1280&viewport.height=720`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(microlinkUrl, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const screenshotUrl = data?.data?.screenshot?.url;

      if (screenshotUrl) {
        // Cache the URL
        cachedScreenshotUrl = screenshotUrl;
        cacheTimestamp = now;

        return NextResponse.json({
          clientName: VIASAY_EXAMPLE.clientName,
          screenshotUrl,
          buttonColor: VIASAY_EXAMPLE.buttonColor,
          presenceColor: VIASAY_EXAMPLE.presenceColor,
        }, {
          headers: {
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        });
      }
    }

    // Fallback to Thum.io if Microlink fails
    const fallbackUrl = `https://image.thum.io/get/width/1280/crop/720/noanimate/${VIASAY_EXAMPLE.siteUrl}`;

    return NextResponse.json({
      clientName: VIASAY_EXAMPLE.clientName,
      screenshotUrl: fallbackUrl,
      buttonColor: VIASAY_EXAMPLE.buttonColor,
      presenceColor: VIASAY_EXAMPLE.presenceColor,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });

  } catch (err) {
    console.error('Get example error:', err);

    // Return Thum.io fallback on error
    const fallbackUrl = `https://image.thum.io/get/width/1280/crop/720/noanimate/${VIASAY_EXAMPLE.siteUrl}`;

    return NextResponse.json({
      clientName: VIASAY_EXAMPLE.clientName,
      screenshotUrl: fallbackUrl,
      buttonColor: VIASAY_EXAMPLE.buttonColor,
      presenceColor: VIASAY_EXAMPLE.presenceColor,
    });
  }
}
