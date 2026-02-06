import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const size = searchParams.get('size') || '64';

  if (!domain) {
    return NextResponse.json({ error: 'Domain required' }, { status: 400 });
  }

  try {
    // Fetch favicon from Google's service
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;

    const response = await fetch(faviconUrl);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch favicon' }, { status: 500 });
    }

    const imageBuffer = await response.arrayBuffer();

    // Return the image with proper CORS headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Favicon fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch favicon' }, { status: 500 });
  }
}
