/**
 * Extract dominant color from an image URL using Canvas
 */
export function extractDominantColor(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Use small size for performance
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        // Count color occurrences
        const colorCounts: Record<string, number> = {};

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          // Skip white-ish pixels (> 240)
          if (r > 240 && g > 240 && b > 240) continue;

          // Skip black-ish pixels (< 15)
          if (r < 15 && g < 15 && b < 15) continue;

          // Skip gray-ish pixels (low saturation)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          if (saturation < 0.2) continue;

          // Round to reduce variations (group similar colors)
          const roundedR = Math.round(r / 16) * 16;
          const roundedG = Math.round(g / 16) * 16;
          const roundedB = Math.round(b / 16) * 16;

          const key = `${roundedR},${roundedG},${roundedB}`;
          colorCounts[key] = (colorCounts[key] || 0) + 1;
        }

        // Find most common color
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
          const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
          resolve(hex);
        } else {
          resolve(null);
        }
      } catch (e) {
        console.error('Color extraction error:', e);
        resolve(null);
      }
    };

    img.onerror = () => {
      console.error('Failed to load image for color extraction');
      resolve(null);
    };

    img.src = imageUrl;
  });
}

/**
 * Get favicon URL for a domain (proxied through our API to avoid CORS)
 */
export function getFaviconUrl(url: string, size: number = 64): string {
  try {
    const urlObj = new URL(url);
    // Use our proxy API to avoid CORS issues
    return `/api/favicon?domain=${encodeURIComponent(urlObj.hostname)}&size=${size}`;
  } catch {
    return '';
  }
}
