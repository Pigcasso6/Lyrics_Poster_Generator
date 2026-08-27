/**
 * Clean foreign song titles so Chinese translations or extraneous translation notations
 * are NOT displayed on the lyric poster.
 * E.g.,
 * "Someone Like You (像你一样的人)" -> "Someone Like You"
 * "Lemon（柠檬）" -> "Lemon"
 * "My Love / 我的爱" -> "My Love"
 * "Hotel California (加州旅馆)" -> "Hotel California"
 * "晴天 (Live)" -> "晴天 (Live)" (domestic Chinese songs preserve live/version tags)
 */
export function cleanPosterSongTitle(title: string): string {
  if (!title) return '';

  // Check if title has Latin/foreign/alphanumeric characters (English, Japanese kana, Korean, etc.)
  const hasForeignChars = /[a-zA-Z\u3040-\u30ff\uac00-\ud7af]/.test(title);

  if (!hasForeignChars) {
    return title.trim();
  }

  // If the song title contains foreign characters, remove parentheses/brackets containing Chinese translations
  let cleaned = title
    // Remove (中文翻译) or （中文翻译）
    .replace(/\s*[（(][^）)]*[\u4e00-\u9fa5]+[^）)]*[）)]/g, '')
    // Remove / 中文翻译
    .replace(/\s*\/.*[\u4e00-\u9fa5]+.*/g, '')
    // Remove - 中文翻译 if followed strictly by chinese
    .replace(/\s+-\s+[\u4e00-\u9fa5\s]+$/g, '')
    .trim();

  return cleaned || title.trim();
}

/**
 * Clean artist names to remove kana readings, furigana, or extraneous translations:
 * e.g.,
 * "米津玄師 (よねづ けんし)" -> "米津玄師"
 * "米津玄師（ヨネヅ ケンシ）" -> "米津玄師"
 * "米津玄師 (Kenshi Yonezu)" -> "米津玄師"
 * "宇多田ヒカル (Hikaru Utada)" -> "宇多田ヒカル"
 * "YOASOBI (ヨアソビ)" -> "YOASOBI"
 * "周杰伦 (Jay Chou)" -> "周杰伦"
 */
export function cleanArtistName(artist: string): string {
  if (!artist) return '';

  let cleaned = artist
    // 1. Remove Japanese kana annotations in parentheses: e.g. 米津玄師 (よねづ けんし) or (ヨネヅ ケンシ)
    .replace(/\s*[（(][^）)]*[ぁ-んァ-ヶー][^）)]*[）)]/g, '')
    // 2. Remove Korean hangul in parentheses: e.g. IU (아이유)
    .replace(/\s*[（(][^）)]*[\uac00-\ud7af][^）)]*[）)]/g, '')
    // 3. Remove Chinese translation in parentheses: e.g. LiSA (织部里沙) or Taylor Swift (泰勒·斯威夫特)
    .replace(/\s*[（(][^）)]*[\u4e00-\u9fa5]+[^）)]*[）)]/g, '')
    .trim();

  // If main artist name has CJK (Kanji/Hanzi/Kana), remove Latin alias in parentheses: e.g. 米津玄師 (Kenshi Yonezu)
  if (/[\u4e00-\u9fa5ぁ-んァ-ヶ]/.test(cleaned)) {
    cleaned = cleaned.replace(/\s*[（(][a-zA-Z\s.,'\-&]+[）)]/g, '').trim();
  }

  return cleaned || artist.trim();
}

/**
 * Clean album titles so foreign album names do not show appended Chinese translations.
 * E.g.,
 * "レモン (柠檬)" -> "レモン"
 * "Lemon (柠檬)" -> "Lemon"
 * "STRAY SHEEP (迷途之羊)" -> "STRAY SHEEP"
 * "First Love / 初恋" -> "First Love"
 */
export function cleanAlbumName(album: string): string {
  if (!album) return '';

  // Check if album name contains foreign chars (English, Japanese kana, Korean, etc.)
  const hasForeignChars = /[a-zA-Z\u3040-\u30ff\uac00-\ud7af]/.test(album);

  if (!hasForeignChars) {
    return album.trim();
  }

  let cleaned = album
    // Remove parentheses/brackets containing Chinese characters
    .replace(/\s*[（(][^）)]*[\u4e00-\u9fa5]+[^）)]*[）)]/g, '')
    // Remove / 中文翻译
    .replace(/\s*\/.*[\u4e00-\u9fa5]+.*/g, '')
    // Remove - 中文翻译 if followed strictly by chinese
    .replace(/\s+-\s+[\u4e00-\u9fa5\s]+$/g, '')
    .trim();

  return cleaned || album.trim();
}

