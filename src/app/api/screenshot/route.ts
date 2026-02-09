import { NextRequest, NextResponse } from 'next/server';

// Cookie reject selectors for Playwright (when available)
const COOKIE_REJECT_SELECTORS = [
  '#onetrust-reject-all-handler',
  '#CybotCookiebotDialogBodyButtonDecline',
  '#didomi-notice-disagree-button',
  '.didomi-continue-without-agreeing',
  '#tarteaucitronAllDenied2',
  '.cc-deny',
  '#reject-cookies',
  'button[data-cookiebanner="reject_button"]',
];

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL requise' }, { status: 400 });
    }

    // Validate URL
    let validUrl: URL;
    try {
      validUrl = new URL(url);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    const favicon = `https://www.google.com/s2/favicons?domain=${validUrl.hostname}&sz=64`;

    // Try external services first (faster and work on Vercel serverless)
    // Method 1: Microlink API (free, fast, no API key)
    try {
      const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(
        validUrl.toString()
      )}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=1280&viewport.height=720`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const microlinkResponse = await fetch(microlinkUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (microlinkResponse.ok) {
        const microlinkData = await microlinkResponse.json();
        const screenshotUrl = microlinkData?.data?.screenshot?.url;

        if (screenshotUrl) {
          return NextResponse.json({ screenshotUrl, favicon, source: 'microlink' });
        }
      }
    } catch (e) {
      console.log('Microlink failed:', e instanceof Error ? e.message : e);
    }

    // Method 2: Thum.io (simple, free, reliable)
    try {
      const thumioUrl = `https://image.thum.io/get/width/1280/crop/720/noanimate/${validUrl.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const thumioResponse = await fetch(thumioUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (thumioResponse.ok) {
        return NextResponse.json({ screenshotUrl: thumioUrl, favicon, source: 'thumio' });
      }
    } catch (e) {
      console.log('Thum.io failed:', e instanceof Error ? e.message : e);
    }

    // Method 3: Google PageSpeed API (free, but slower)
    // NOTE: This returns base64 which can be too large for subsequent requests
    // Only use as last resort and warn about potential size issues
    try {
      const pageSpeedUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
        validUrl.toString()
      )}&strategy=desktop&category=performance`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const pageSpeedResponse = await fetch(pageSpeedUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (pageSpeedResponse.ok) {
        const pageSpeedData = await pageSpeedResponse.json();
        const screenshot =
          pageSpeedData?.lighthouseResult?.audits?.['final-screenshot']?.details?.data;

        if (screenshot) {
          // Warn if base64 is too large (> 1MB when encoded)
          const isLarge = screenshot.length > 1_000_000;
          return NextResponse.json({
            screenshotUrl: screenshot,
            favicon,
            source: 'pagespeed',
            isBase64: true,
            warning: isLarge ? 'Screenshot is large and may cause upload issues' : undefined,
          });
        }
      }
    } catch (e) {
      console.log('PageSpeed failed:', e instanceof Error ? e.message : e);
    }

    // Method 4: Try Playwright only in local development (not on Vercel)
    if (process.env.NODE_ENV === 'development' || !process.env.VERCEL) {
      try {
        const { chromium } = await import('playwright');

        const browser = await chromium.launch({
          headless: true,
        });

        try {
          const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            userAgent:
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          });

          const page = await context.newPage();

          await page.goto(validUrl.toString(), {
            waitUntil: 'domcontentloaded',
            timeout: 10000,
          });

          // Try to reject cookies quickly
          for (const selector of COOKIE_REJECT_SELECTORS) {
            try {
              const button = await page.$(selector);
              if (button && await button.isVisible()) {
                await button.click();
                await page.waitForTimeout(300);
                break;
              }
            } catch {
              // Continue
            }
          }

          await page.waitForTimeout(500);

          const screenshot = await page.screenshot({
            type: 'png',
            fullPage: false,
          });

          const base64 = Buffer.from(screenshot).toString('base64');
          const screenshotUrl = `data:image/png;base64,${base64}`;

          return NextResponse.json({ screenshotUrl, favicon, source: 'playwright' });
        } finally {
          await browser.close();
        }
      } catch (e) {
        console.log('Playwright failed:', e instanceof Error ? e.message : e);
      }
    }

    // All methods failed
    return NextResponse.json({
      screenshotUrl: null,
      error: 'Impossible de capturer ce site. Vous pouvez coller une capture manuellement.',
      favicon,
    });
  } catch (error) {
    console.error('Screenshot API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la capture' },
      { status: 500 }
    );
  }
}
