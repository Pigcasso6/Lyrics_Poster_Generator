/**
 * Generates an elegant SVG Vinyl Record artwork as a data URI
 * when no official album artwork is found on any provider.
 */
export function generateVinylCoverSvg(songName: string = 'Music', artist: string = 'Artist'): string {
  const safeName = (songName || 'Music').slice(0, 16).replace(/[<>&"']/g, '');
  const safeArtist = (artist || 'Artist').slice(0, 16).replace(/[<>&"']/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <radialGradient id="vinyl-grooves" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#24283b" />
      <stop offset="35%" stop-color="#1a1c29" />
      <stop offset="70%" stop-color="#0f111a" />
      <stop offset="100%" stop-color="#090a0f" />
    </radialGradient>
    <linearGradient id="label-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>
  <rect width="500" height="500" fill="url(#vinyl-grooves)" />
  <circle cx="250" cy="250" r="230" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="2" />
  <circle cx="250" cy="250" r="200" fill="none" stroke="#ffffff" stroke-opacity="0.03" stroke-width="1.5" />
  <circle cx="250" cy="250" r="170" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="2" />
  <circle cx="250" cy="250" r="140" fill="none" stroke="#ffffff" stroke-opacity="0.03" stroke-width="1.5" />
  
  <!-- Center Record Label -->
  <circle cx="250" cy="250" r="105" fill="url(#label-grad)" />
  <circle cx="250" cy="250" r="95" fill="none" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.5" />
  
  <!-- Song text on label -->
  <text x="250" y="235" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Noto Sans SC', sans-serif" font-size="20" font-weight="700" letter-spacing="1">
    ${safeName}
  </text>
  <text x="250" y="265" text-anchor="middle" fill="#e0f2fe" font-family="-apple-system, BlinkMacSystemFont, 'Noto Sans SC', sans-serif" font-size="14" font-weight="500" opacity="0.9">
    ${safeArtist}
  </text>
  
  <!-- Center Spindle Hole -->
  <circle cx="250" cy="250" r="22" fill="#0f111a" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2" />
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
