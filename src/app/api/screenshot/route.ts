import { NextRequest, NextResponse } from 'next/server';

// Cookie reject/close selectors for Playwright - ordered by popularity in France
const COOKIE_SELECTORS = [
  // Axeptio (very common in France - wavestone.com uses this)
  '[data-axeptio-action="close"]',
  '.axeptio_btn_dismiss',
  '.axeptio-widget__btn--close',
  'button[class*="axeptio"][class*="close"]',
  'button[class*="axeptio"][class*="dismiss"]',
  // OneTrust
  '#onetrust-reject-all-handler',
  '#onetrust-accept-btn-handler',
  '.onetrust-close-btn-handler',
  // Cookiebot
  '#CybotCookiebotDialogBodyButtonDecline',
  '#CybotCookiebotDialogBodyButtonAccept',
  // Didomi
  '#didomi-notice-disagree-button',
  '.didomi-continue-without-agreeing',
  '#didomi-notice-agree-button',
  // Tarteaucitron
  '#tarteaucitronAllDenied2',
  '#tarteaucitronPersonalize2',
  // Generic patterns
  '.cc-deny',
  '.cc-dismiss',
  '#reject-cookies',
  '#accept-cookies',
  'button[data-cookiebanner="reject_button"]',
  'button[data-cookiebanner="accept_button"]',
  // Common French patterns
  'button:has-text("Refuser")',
  'button:has-text("Tout refuser")',
  'button:has-text("Continuer sans accepter")',
  'button:has-text("Fermer")',
  // Common English patterns
  'button:has-text("Reject")',
  'button:has-text("Decline")',
  'button:has-text("Close")',
  // ARIA labels
  '[aria-label*="cookie" i][aria-label*="close" i]',
  '[aria-label*="cookie" i][aria-label*="reject" i]',
  '[aria-label*="cookie" i][aria-label*="dismiss" i]',
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
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;

    // Method 1: Try Playwright FIRST in local (handles cookie banners properly)
    if (isLocal) {
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
            waitUntil: 'networkidle',
            timeout: 15000,
          });

          // Wait for cookie banners to appear
          await page.waitForTimeout(1500);

          // Try to dismiss cookie banners
          for (const selector of COOKIE_SELECTORS) {
            try {
              // Handle text-based selectors differently
              if (selector.includes(':has-text(')) {
                const textMatch = selector.match(/:has-text\("([^"]+)"\)/);
                if (textMatch) {
                  const button = await page.locator(`button`, { hasText: textMatch[1] }).first();
                  if (await button.isVisible({ timeout: 100 })) {
                    await button.click();
                    await page.waitForTimeout(500);
                    break;
                  }
                }
              } else {
                const button = await page.$(selector);
                if (button && await button.isVisible()) {
                  await button.click();
                  await page.waitForTimeout(500);
                  break;
                }
              }
            } catch {
              // Continue to next selector
            }
          }

          // Also try to hide any remaining cookie overlays via CSS
          await page.addStyleTag({
            content: `
              [class*="cookie"], [class*="Cookie"], [id*="cookie"], [id*="Cookie"],
              [class*="consent"], [class*="Consent"], [id*="consent"], [id*="Consent"],
              [class*="axeptio"], [class*="Axeptio"], [id*="axeptio"],
              [class*="gdpr"], [class*="GDPR"], [id*="gdpr"],
              .cc-window, #onetrust-banner-sdk, #CybotCookiebotDialog,
              [class*="tarteaucitron"], [id*="tarteaucitron"],
              [class*="didomi"], [id*="didomi"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
              }
            `,
          });

          await page.waitForTimeout(300);

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
        // Fall through to external services
      }
    }

    // Method 2: Microlink API (free, fast, no API key) - fallback for Vercel
    // Inject script to hide cookie banners via CSS
    try {
      const hideCookieScript = `
        (function(){
          var style = document.createElement('style');
          style.textContent = '[class*="cookie"],[class*="Cookie"],[id*="cookie"],[id*="Cookie"],[class*="consent"],[class*="Consent"],[id*="consent"],[id*="Consent"],[class*="axeptio"],[class*="Axeptio"],[id*="axeptio"],[class*="gdpr"],[class*="GDPR"],[id*="gdpr"],.cc-window,#onetrust-banner-sdk,#CybotCookiebotDialog,[class*="tarteaucitron"],[id*="tarteaucitron"],[class*="didomi"],[id*="didomi"]{display:none!important;visibility:hidden!important;opacity:0!important;}';
          document.head.appendChild(style);
        })();
      `;

      const microlinkParams = new URLSearchParams({
        url: validUrl.toString(),
        screenshot: 'true',
        meta: 'false',
        'viewport.width': '1280',
        'viewport.height': '720',
        scripts: hideCookieScript,
        waitForTimeout: '2000', // Wait for cookie banners to load before hiding
      });

      const microlinkUrl = `https://api.microlink.io/?${microlinkParams.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // Longer timeout for script execution

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

    // Method 3: Thum.io (simple, free, reliable)
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

    // Method 4: Google PageSpeed API (free, but slower)
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
