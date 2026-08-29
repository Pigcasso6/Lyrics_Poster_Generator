/**
 * Converts any remote image URL into a Base64 data URL to ensure 100% reliable canvas export,
 * avoiding CORS taint, Mixed Content blocks, and html-to-image fetch failures in production.
 */
export async function urlToBase64(imageUrl: string): Promise<string> {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('data:image/')) return imageUrl;
  if (imageUrl.startsWith('data:')) return ''; // Filter out invalid data URLs like data:text/html

  const cleanUrl = imageUrl.replace(/^http:\/\//i, 'https://');

  // 1. Try our server proxy first (handles CORS & referer headers)
  try {
    const proxyUrl = `/api/music/proxy-image?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(proxyUrl);
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    
    // CRITICAL: MUST verify that response is 200 OK AND content-type is an image, NOT text/html or application/json!
    if (res.ok && contentType.startsWith('image/')) {
      const blob = await res.blob();
      if (blob && blob.size > 50 && (blob.type.startsWith('image/') || contentType.startsWith('image/'))) {
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string' && reader.result.startsWith('data:image/')) {
              resolve(reader.result);
            } else {
              reject(new Error('FileReader result is not a valid image data URL'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } else {
      console.warn(`Server proxy returned non-image content-type: "${contentType}", skipping proxy base64.`);
    }
  } catch (err) {
    console.warn('Server image proxy failed, trying canvas fallback:', err);
  }

  // 2. Direct browser Image + Canvas conversion fallback
  try {
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
            if (dataUrl && dataUrl.startsWith('data:image/')) {
              resolve(dataUrl);
              return;
            }
          }
        } catch (e) {
          console.warn('Canvas export tainted:', e);
        }
        resolve('');
      };
      img.onerror = () => resolve('');
      img.src = cleanUrl;
    });
  } catch {
    return '';
  }
}
