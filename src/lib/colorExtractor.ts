/**
 * Extract dominant color from an image URL using Canvas.
 * Fetches the image as a blob first to avoid CORS issues with <img>.
 */
export async function extractDominantColor(imageUrl: string): Promise<string | null> {
  try {
    // Fetch the image as a blob to bypass CORS img loading issues
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmapUrl = URL.createObjectURL(blob);

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = bitmapUrl;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(bitmapUrl);
      return null;
    }

    const size = 64;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);
    URL.revokeObjectURL(bitmapUrl);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    const colorCounts: Record<string, number> = {};

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) continue;
      if (r > 240 && g > 240 && b > 240) continue;
      if (r < 15 && g < 15 && b < 15) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      if (saturation < 0.2) continue;

      const roundedR = Math.min(255, Math.round(r / 16) * 16);
      const roundedG = Math.min(255, Math.round(g / 16) * 16);
      const roundedB = Math.min(255, Math.round(b / 16) * 16);

      const key = `${roundedR},${roundedG},${roundedB}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    let maxCount = 0;
    let dominantColor: string | null = null;

    for (const [key, count] of Object.entries(colorCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = key;
      }
    }

    if (dominantColor) {
      const [r, g, b] = dominantColor.split(',').map(Number);
      return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get favicon URL for a domain (proxied through our API to avoid CORS)
 */
export function getFaviconUrl(url: string, size: number = 64): string {
  try {
    const urlObj = new URL(url);
    return `/api/favicon?domain=${encodeURIComponent(urlObj.hostname)}&size=${size}`;
  } catch {
    return '';
  }
}
