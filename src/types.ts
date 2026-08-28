export type PlatformType = 'netease' | 'qq';

export interface Song {
  id: string;
  platform: PlatformType;
  name: string;
  artist: string;
  album: string;
  albumCover: string;
  duration?: number;
  songMid?: string;
  albumMid?: string;
  releaseDate?: string;
  url?: string;
  lrcUrl?: string;
}

export interface LyricLine {
  id: string;
  time?: number;
  text: string;
  translation?: string;
}

export interface SongDetailResponse {
  song: Song;
  rawLyric: string;
  rawTLyric?: string;
  lyrics: LyricLine[];
  hasLyric: boolean;
}

export interface SearchResponse {
  keyword: string;
  netease: Song[];
  qq: Song[];
  total: number;
}

export type PosterTheme =
  | 'minimal-white'
  | 'polaroid'
  | 'vinyl-sleeve'
  | 'gradient-sunset'
  | 'dark-luxe'
  | 'vintage-kraft'
  | 'cyber-neon';

export type PosterFont =
  | 'noto-sans-sc'
  | 'noto-sans-tc'
  | 'noto-sans-jp'
  | 'yu-mincho'
  | 'yu-gothic'
  | 'songti'
  | 'heiti'
  | 'times-new-roman'
  | 'noto-sans-cn'
  | 'noto-sans-tw';

export type QuoteStyle = 'curly' | 'corner';

export interface PosterConfig {
  theme: PosterTheme;
  aspectRatio: '3:4' | '1:1' | '9:16' | 'auto';
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  lyricAlign: 'left' | 'center' | 'right';
  infoAlign: 'left' | 'center' | 'right';
  lyricFont: PosterFont;
  translationFont: PosterFont;
  quoteFont: PosterFont;
  infoFont: PosterFont;
  quoteStyle: QuoteStyle;
  lyricBold?: boolean;
  lyricItalic?: boolean;
  translationBold?: boolean;
  translationItalic?: boolean;
  infoBold?: boolean;
  infoItalic?: boolean;
  quoteBold?: boolean;
  quoteItalic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  showCover: boolean;
  showAlbumInfo: boolean;
  showTranslation: boolean;
  customQuote?: string;
}

