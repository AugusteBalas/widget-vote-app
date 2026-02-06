import { NextRequest, NextResponse } from 'next/server';
import { chromium, Browser } from 'playwright';

// Common cookie consent REJECT/REFUSE button selectors
const COOKIE_REJECT_SELECTORS = [
  // Generic patterns for reject/refuse
  '[class*="cookie"] button[class*="reject"]',
  '[class*="cookie"] button[class*="refuse"]',
  '[class*="cookie"] button[class*="decline"]',
  '[class*="cookie"] button[class*="deny"]',
  '[class*="consent"] button[class*="reject"]',
  '[class*="consent"] button[class*="refuse"]',
  '[class*="consent"] button[class*="decline"]',
  // Common cookie consent libraries - REJECT buttons
  '#onetrust-reject-all-handler',
  '.onetrust-reject-all-handler',
  '#CybotCookiebotDialogBodyButtonDecline',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
  '#didomi-notice-disagree-button',
  '.didomi-continue-without-agreeing',
  '[data-testid="cookie-reject-button"]',
  '[data-testid="cookie-reject-all"]',
  '[data-testid="cookie-decline-button"]',
  '#tarteaucitronAllDenied2',
  '.cc-deny',
  '.cc-decline',
  '.cc-btn.cc-deny',
  '#reject-cookies',
  '.reject-cookies',
  '#refuse-cookies',
  '.refuse-cookies',
  'button[data-cookiebanner="reject_button"]',
  'button[data-cookiebanner="decline_button"]',
  '[aria-label*="reject" i][aria-label*="cookie" i]',
  '[aria-label*="refuser" i]',
  '[aria-label*="decline" i]',
  // Close/dismiss buttons (to just close the banner)
  '[class*="cookie"] button[class*="close"]',
  '[class*="consent"] button[class*="close"]',
  '[class*="cookie"] [class*="close"]',
  '.cookie-banner-close',
  '.consent-close',
];

async function rejectCookies(page: import('playwright').Page): Promise<void> {
  // Try each reject selector
  for (const selector of COOKIE_REJECT_SELECTORS) {
    try {
      const button = await page.$(selector);
      if (button) {
        const isVisible = await button.isVisible();
        if (isVisible) {
          await button.click();
          // Wait a bit for the banner to disappear
          await page.waitForTimeout(500);
          return;
        }
      }
    } catch {
      // Continue to next selector
    }
  }

  // Try to find reject buttons by text content (French and English)
  const rejectTexts = [
    'Refuser',
    'Tout refuser',
    'Refuser tout',
    'Reject',
    'Reject all',
    'Decline',
    'Decline all',
    'Non merci',
    'No thanks',
    'Continuer sans accepter',
    'Continue without accepting',
    'Fermer',
    'Close',
    'Personnaliser', // Sometimes leads to refuse option
    'Gérer',
    'Manage',
  ];

  for (const text of rejectTexts) {
    try {
      const button = page.getByRole('button', { name: new RegExp(`^${text}$`, 'i') });
      if (await button.isVisible({ timeout: 100 })) {
        await button.click();
        await page.waitForTimeout(500);
        return;
      }
    } catch {
      // Continue
    }
  }

  // Last resort: try to find and click any close button on cookie banners
  try {
    const closeButton = await page.$('[class*="cookie"] button:has(svg), [class*="consent"] button:has(svg), [class*="cookie"] .close, [class*="consent"] .close');
    if (closeButton && await closeButton.isVisible()) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // No close button found
  }
}

export async function POST(request: NextRequest) {
  let browser: Browser | undefined;

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

    // Method 1: Try local Playwright screenshot with cookie handling
    try {
      browser = await chromium.launch({
        headless: true,
      });

      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });

      const page = await context.newPage();

      // Navigate to the page
      await page.goto(validUrl.toString(), {
        waitUntil: 'networkidle',
        timeout: 15000,
      });

      // Try to reject cookies (to avoid showing existing chatbot widgets)
      await rejectCookies(page);

      // Wait a bit more for any animations
      await page.waitForTimeout(1000);

      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
      });

      await browser.close();
      browser = undefined;

      // Convert to base64 data URL
      const base64 = Buffer.from(screenshot).toString('base64');
      const screenshotUrl = `data:image/png;base64,${base64}`;

      return NextResponse.json({ screenshotUrl, favicon });
    } catch (e) {
      console.log('Playwright failed, trying fallback methods:', e);
      if (browser) {
        await browser.close();
        browser = undefined;
      }
    }

    // Method 2: Try Microlink API (free, no API key needed)
    try {
      const microlinkUrl = `https://api.microlink.io/?url=${encodeURIComponent(
        validUrl.toString()
      )}&screenshot=true&meta=false&embed=screenshot.url`;

      const microlinkResponse = await fetch(microlinkUrl, {
        headers: { Accept: 'application/json' },
      });

      if (microlinkResponse.ok) {
        const microlinkData = await microlinkResponse.json();
        const screenshotUrl = microlinkData?.data?.screenshot?.url;

        if (screenshotUrl) {
          return NextResponse.json({ screenshotUrl, favicon });
        }
      }
    } catch (e) {
      console.log('Microlink failed, trying PageSpeed:', e);
    }

    // Method 3: Try Google PageSpeed API
    try {
      const pageSpeedUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
        validUrl.toString()
      )}&strategy=desktop&category=performance`;

      const pageSpeedResponse = await fetch(pageSpeedUrl);

      if (pageSpeedResponse.ok) {
        const pageSpeedData = await pageSpeedResponse.json();
        const screenshot =
          pageSpeedData?.lighthouseResult?.audits?.['final-screenshot']?.details
            ?.data;

        if (screenshot) {
          return NextResponse.json({ screenshotUrl: screenshot, favicon });
        }
      }
    } catch (e) {
      console.log('PageSpeed failed:', e);
    }

    // Method 4: Use thum.io (simple, free)
    const thumioUrl = `https://image.thum.io/get/width/1280/crop/720/noanimate/${validUrl.toString()}`;

    // Verify the image is accessible
    try {
      const thumioResponse = await fetch(thumioUrl, { method: 'HEAD' });
      if (thumioResponse.ok) {
        return NextResponse.json({ screenshotUrl: thumioUrl, favicon });
      }
    } catch (e) {
      console.log('Thum.io failed:', e);
    }

    // All methods failed
    return NextResponse.json({
      screenshotUrl: null,
      error: 'Impossible de capturer ce site. Essayez avec une autre URL.',
      favicon,
    });
  } catch (error) {
    console.error('Screenshot API error:', error);
    if (browser) {
      await browser.close();
    }
    return NextResponse.json(
      { error: 'Erreur lors de la capture' },
      { status: 500 }
    );
  }
}
