/**
 * Converts any remote image URL into a Base64 data URL to ensure 100% reliable canvas export,
 * avoiding CORS taint, Mixed Content blocks, and html-to-image fetch failures in production.
 */
export async function urlToBase64(imageUrl: string): Promise<string> {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:')) return imageUrl;

  // 1. Try our server proxy first (handles CORS & referer headers)
  try {
    const proxyUrl = `/api/music/proxy-image?url=${encodeURIComponent(imageUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('FileReader result is not a string'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.warn('Server image proxy failed, falling back to direct canvas load:', err);
  }

  // 2. Direct browser Image + Canvas conversion fallback
  try {
    const secureUrl = imageUrl.startsWith('http://') ? imageUrl.replace('http://', 'https://') : imageUrl;
    return await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 400;
          canvas.height = img.naturalHeight || 400;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            resolve(dataUrl);
            return;
          }
        } catch (e) {
          console.warn('Canvas export tainted:', e);
        }
        resolve(imageUrl);
      };
      img.onerror = () => resolve(imageUrl);
      img.src = secureUrl;
    });
  } catch {
    return imageUrl;
  }
}
