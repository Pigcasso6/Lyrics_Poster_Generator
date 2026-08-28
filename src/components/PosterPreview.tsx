import React from 'react';
import { Song, LyricLine, PosterConfig, PosterTheme, PosterFont } from '../types';
import { cleanPosterSongTitle, cleanArtistName, cleanAlbumName } from '../utils/cleanTitle';
import { generateVinylCoverSvg } from '../utils/cover';

export const FONT_FAMILY_MAP: Record<string, string> = {
  'noto-sans-sc': '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Heiti SC", sans-serif',
  'noto-sans-tc': '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
  'noto-sans-jp': '"Noto Sans JP", "Hiragino Sans", "Meiryo", sans-serif',
  'yu-mincho': '"Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Shippori Mincho", "Noto Serif JP", serif',
  'yu-gothic': '"Yu Gothic", "YuGothic", "Hiragino Kaku Gothic ProN", "Zen Kaku Gothic New", "Noto Sans JP", sans-serif',
  'songti': '"Noto Serif SC", "Songti SC", "SimSun", "STSong", "Songti", serif',
  'heiti': '"SimHei", "STHeiti", "Heiti SC", "PingFang SC", "Noto Sans SC", sans-serif',
  'times-new-roman': '"Times New Roman", Times, "Noto Serif SC", "Songti SC", serif',
  // Backward compatibility aliases
  'noto-sans-cn': '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Heiti SC", sans-serif',
  'noto-sans-tw': '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
};

interface PosterPreviewProps {
  song: Song;
  selectedLyrics: LyricLine[];
  config: PosterConfig;
  previewRef?: React.RefObject<HTMLDivElement | null>;
  customCoverUrl?: string;
}

export const PosterPreview: React.FC<PosterPreviewProps> = ({
  song,
  selectedLyrics,
  config,
  previewRef,
  customCoverUrl,
}) => {
  // Fixed width styling for high-definition render (380px nominal width)
  const aspectStyles: Record<string, string> = {
    '3:4': 'aspect-[3/4] w-[380px] shrink-0',
    '1:1': 'aspect-square w-[380px] shrink-0',
    '9:16': 'aspect-[9/16] w-[340px] shrink-0',
    'auto': 'w-[380px] min-h-[380px] h-auto shrink-0',
  };

  // Font size classes
  const fontSizeClasses: Record<string, { main: string; trans: string; lineSpacing: string }> = {
    sm: { main: 'text-xs', trans: 'text-[10px]', lineSpacing: 'space-y-2' },
    md: { main: 'text-sm', trans: 'text-xs', lineSpacing: 'space-y-2.5' },
    lg: { main: 'text-base', trans: 'text-xs', lineSpacing: 'space-y-3' },
    xl: { main: 'text-lg', trans: 'text-[13px]', lineSpacing: 'space-y-3.5' },
  };

  const textAlignClasses: Record<string, string> = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  };

  const currentFont = fontSizeClasses[config.fontSize] || fontSizeClasses.md;
  const lyricAlign = config.lyricAlign || config.textAlign || 'center';
  const infoAlign = config.infoAlign || config.textAlign || 'left';

  const lyricFontStyle = { fontFamily: FONT_FAMILY_MAP[config.lyricFont || 'noto-sans-sc'] || FONT_FAMILY_MAP['noto-sans-sc'] };
  const transFontStyle = { fontFamily: FONT_FAMILY_MAP[config.translationFont || config.lyricFont || 'noto-sans-sc'] || FONT_FAMILY_MAP['noto-sans-sc'] };
  const quoteFontStyle = { fontFamily: FONT_FAMILY_MAP[config.quoteFont || 'noto-sans-sc'] || FONT_FAMILY_MAP['noto-sans-sc'] };
  const infoFontStyle = { fontFamily: FONT_FAMILY_MAP[config.infoFont || 'noto-sans-sc'] || FONT_FAMILY_MAP['noto-sans-sc'] };

  const quoteOpen = config.quoteStyle === 'corner' ? '「' : '“';
  const quoteClose = config.quoteStyle === 'corner' ? '」' : '”';

  // Theme-specific styling definitions - Standard rectangle with 0 corner radius
  const getThemeWrapperClass = (theme: PosterTheme): string => {
    switch (theme) {
      case 'minimal-white':
        return 'bg-white text-slate-900 border border-slate-200 shadow-xl';
      case 'polaroid':
        return 'bg-[#faf8f5] text-[#2c2724] border-[14px] border-b-[44px] border-white shadow-2xl ring-1 ring-black/5';
      case 'vinyl-sleeve':
        return 'bg-[#18181b] text-zinc-100 border border-zinc-700/60 shadow-xl';
      case 'gradient-sunset':
        return 'bg-gradient-to-br from-amber-100 via-rose-200 to-sky-200 text-slate-900 border border-white/60 shadow-xl';
      case 'dark-luxe':
        return 'bg-[#0c0e14] text-[#e0e2ec] border border-[#232736] shadow-xl';
      case 'vintage-kraft':
        return 'bg-[#eadecc] text-[#3d2f23] border border-[#cfbeab] shadow-xl';
      case 'cyber-neon':
        return 'bg-[#090a16] text-[#e2f3ff] border border-cyan-500/40 shadow-xl shadow-cyan-950/40';
      default:
        return 'bg-white text-slate-900 shadow-xl';
    }
  };

  const cleanSongName = cleanPosterSongTitle(song.name);
  const cleanArtist = cleanArtistName(song.artist);
  const cleanAlbum = cleanAlbumName(song.album);
  const rawCoverSrc = customCoverUrl || song.albumCover;
  const coverImageSrc = rawCoverSrc || generateVinylCoverSvg(cleanSongName, cleanArtist);

  return (
    <div
      ref={previewRef}
      id="lyric-poster-canvas"
      className={`${aspectStyles[config.aspectRatio] || aspectStyles['3:4']} ${getThemeWrapperClass(
        config.theme
      )} px-6 pt-6 pb-0 flex flex-col justify-between overflow-hidden transition-all duration-300 relative shadow-xl shrink-0 mx-auto rounded-none`}
    >
      {/* Decorative Background Elements for specific themes */}
      {config.theme === 'dark-luxe' && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      )}
      {config.theme === 'cyber-neon' && (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00ffff08_1px,transparent_1px),linear-gradient(to_bottom,#ff007f08_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
      )}

      {/* Top: Square Album Artwork (1:1 Ratio) */}
      {config.showCover && (
        <div className="relative z-10 w-full flex justify-center pb-2 shrink-0">
          <div
            className={`aspect-square overflow-hidden bg-black/5 relative rounded-none ${
              config.theme === 'polaroid'
                ? 'border border-black/10 shadow-inner'
                : 'shadow-md border border-current/10'
            } ${
              config.aspectRatio === '9:16'
                ? 'w-36 max-w-[55%]'
                : config.aspectRatio === '1:1'
                ? 'w-32 max-w-[42%]'
                : config.aspectRatio === 'auto'
                ? 'w-36 max-w-[50%]'
                : 'w-40 max-w-[55%]'
            }`}
          >
            <img
              src={coverImageSrc}
              alt={cleanSongName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover block"
              onError={(e) => {
                const target = e.currentTarget;
                target.src = generateVinylCoverSvg(cleanSongName, cleanArtist);
              }}
            />
          </div>
        </div>
      )}

      {/* Middle: Selected Lyric Lines Content */}
      <div
        className={`relative z-10 my-auto py-2 flex flex-col justify-center min-h-0 ${
          config.aspectRatio !== 'auto' ? 'overflow-hidden' : ''
        } ${textAlignClasses[lyricAlign]}`}
        style={lyricFontStyle}
      >
        {selectedLyrics.length > 0 ? (
          <div className={`w-full ${currentFont.lineSpacing}`}>
            {selectedLyrics.map((line, index) => (
              <div key={line.id || index} className="space-y-1">
                {/* Original Lyric Line */}
                <p
                  className={`tracking-wide leading-snug break-words ${currentFont.main} ${
                    config.lyricBold ? 'font-bold' : 'font-normal'
                  } ${config.lyricItalic ? 'italic' : 'not-italic'} ${
                    config.theme === 'cyber-neon'
                      ? 'text-cyan-200 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : config.theme === 'dark-luxe'
                      ? 'text-amber-100/95'
                      : config.theme === 'polaroid'
                      ? 'text-[#241f1c]'
                      : ''
                  }`}
                  style={lyricFontStyle}
                >
                  {line.text}
                </p>

                {/* Translation Line: Independent translation font styling */}
                {config.showTranslation && line.translation && (
                  <p
                    className={`leading-relaxed break-words tracking-normal ${currentFont.trans} ${
                      config.translationBold ? 'font-bold' : 'font-normal'
                    } ${config.translationItalic ? 'italic' : 'not-italic'} ${
                      config.theme === 'polaroid'
                        ? 'text-[#7d736a]'
                        : config.theme === 'dark-luxe'
                        ? 'text-amber-300/60 tracking-wide'
                        : config.theme === 'cyber-neon'
                        ? 'text-fuchsia-300/80'
                        : config.theme === 'vinyl-sleeve'
                        ? 'text-zinc-400'
                        : 'text-slate-500'
                    }`}
                    style={transFontStyle}
                  >
                    {line.translation}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full text-center py-4 border border-dashed border-current/25 opacity-60">
            <p className="text-xs" style={{ fontFamily: FONT_FAMILY_MAP['noto-sans-sc'] }}>
              点击右侧歌词，挑选想要印在海报上的歌词
            </p>
          </div>
        )}
      </div>

      {/* Bottom Section: Custom Quote & Song Info (Symmetrical distance above and below horizontal divider) */}
      <div className="relative z-10 shrink-0 mt-auto">
        {/* User's custom quote / note */}
        {config.customQuote && config.customQuote.trim() && (
          <div
            className={`pb-3.5 w-full flex flex-col ${textAlignClasses[lyricAlign]}`}
            style={quoteFontStyle}
          >
            <p
              className={`text-[11px] opacity-80 break-words leading-relaxed ${
                config.quoteBold ? 'font-bold' : 'font-normal'
              } ${config.quoteItalic ? 'italic' : 'not-italic'}`}
            >
              {quoteOpen}{config.customQuote.trim()}{quoteClose}
            </p>
          </div>
        )}

        {/* Horizontal Divider Line */}
        <div className="border-t border-current/15 w-full" />

        {/* Song & Artist Info: Exactly 14px (pt-3.5) below divider and 14px (pb-3.5) above bottom edge */}
        <div
          className={`pt-3.5 pb-3.5 flex flex-col w-full justify-center ${textAlignClasses[infoAlign]}`}
          style={infoFontStyle}
        >
          <h4
            className={`tracking-tight truncate w-full ${
              config.infoBold ? 'font-bold' : 'font-normal'
            } ${config.infoItalic ? 'italic' : 'not-italic'} ${
              config.fontSize === 'xl' ? 'text-sm' : 'text-xs'
            }`}
          >
            {cleanSongName}
          </h4>
          <div
            className={`text-[11px] opacity-75 mt-0.5 w-full flex items-center overflow-hidden ${
              config.infoItalic ? 'italic' : 'not-italic'
            } ${
              infoAlign === 'center'
                ? 'justify-center'
                : infoAlign === 'right'
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            <span className="shrink-0 max-w-[50%] sm:max-w-[60%] truncate">{cleanArtist}</span>
            {config.showAlbumInfo && song.album && (
              <>
                <span className="shrink-0 mx-1.5 opacity-60 select-none">·</span>
                <span className="truncate shrink min-w-0">{cleanAlbum}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



