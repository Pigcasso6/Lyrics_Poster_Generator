import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  CheckSquare,
  Square,
  RefreshCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Type,
  X,
  Sliders,
  Ratio,
  ListMusic,
  Edit3,
  SlidersHorizontal,
} from 'lucide-react';
import { toPng, toBlob } from 'html-to-image';
import { Song, LyricLine, SongDetailResponse, PosterConfig, PosterTheme, PosterFont } from '../types';
import { fetchSongDetail } from '../services/api';
import { PosterPreview } from './PosterPreview';
import { TypographyModal } from './TypographyModal';
import { LyricPickerModal } from './LyricPickerModal';
import { ExportScaleModal } from './ExportScaleModal';
import { MobilePosterResultModal } from './MobilePosterResultModal';
import { cleanAlbumName, cleanArtistName } from '../utils/cleanTitle';
import { urlToBase64 } from '../utils/image';

interface LyricsModalProps {
  song: Song | null;
  onClose: () => void;
}

const DEFAULT_POSTER_CONFIG: PosterConfig = {
  theme: 'minimal-white',
  aspectRatio: '3:4',
  fontSize: 'md',
  lyricAlign: 'center',
  infoAlign: 'left',
  lyricFont: 'noto-sans-sc',
  translationFont: 'noto-sans-sc',
  quoteFont: 'noto-sans-sc',
  infoFont: 'noto-sans-sc',
  quoteStyle: 'curly',
  lyricBold: true,
  lyricItalic: false,
  translationBold: false,
  translationItalic: false,
  infoBold: true,
  infoItalic: false,
  quoteBold: false,
  quoteItalic: false,
  showCover: true,
  showAlbumInfo: true,
  showTranslation: true,
  customQuote: '',
};

const THEMES: Array<{ id: PosterTheme; name: string; color: string }> = [
  { id: 'minimal-white', name: '极简白', color: 'bg-white text-slate-900 border-slate-300' },
  { id: 'polaroid', name: '拍立得', color: 'bg-[#fcfaf7] text-neutral-800 border-stone-300' },
  { id: 'vinyl-sleeve', name: '黑胶质感', color: 'bg-zinc-900 text-zinc-100 border-zinc-700' },
  { id: 'gradient-sunset', name: '日落微光', color: 'bg-gradient-to-r from-amber-200 via-rose-200 to-sky-200 text-slate-900' },
  { id: 'dark-luxe', name: '暗夜鎏金', color: 'bg-[#0f111a] text-amber-200 border-amber-500/40' },
  { id: 'vintage-kraft', name: '复古牛皮', color: 'bg-[#eadecc] text-[#4a3b2c] border-[#bba993]' },
  { id: 'cyber-neon', name: '赛博霓虹', color: 'bg-[#0a0f24] text-cyan-200 border-cyan-400' },
];

const FONT_OPTIONS: Array<{ id: PosterFont; name: string }> = [
  { id: 'noto-sans-sc', name: 'Noto Sans SC' },
  { id: 'noto-sans-tc', name: 'Noto Sans TC' },
  { id: 'noto-sans-jp', name: 'Noto Sans JP' },
  { id: 'yu-mincho', name: 'Yu Mincho' },
  { id: 'yu-gothic', name: 'Yu Gothic' },
  { id: 'songti', name: '宋体' },
  { id: 'heiti', name: '黑体' },
  { id: 'times-new-roman', name: 'Times New Roman' },
];

type MobileActiveTab = 'theme' | 'ratio' | 'fontSize' | 'toggles' | 'quote';

export const LyricsModal: React.FC<LyricsModalProps> = ({ song, onClose }) => {
  const [detailData, setDetailData] = useState<SongDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  // Default unselected lyrics
  const [selectedLines, setSelectedLines] = useState<LyricLine[]>([]);
  const [posterConfig, setPosterConfig] = useState<PosterConfig>(DEFAULT_POSTER_CONFIG);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportScale, setExportScale] = useState<string>('4');
  const [showCoverLightbox, setShowCoverLightbox] = useState(false);
  const [customQuoteInput, setCustomQuoteInput] = useState('');
  const [coverDataUrl, setCoverDataUrl] = useState<string>('');

  // Mobile Bottom Bar Active Secondary Tab
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileActiveTab>('theme');
  // Modals for larger panels
  const [showTypographyModal, setShowTypographyModal] = useState(false);
  const [showLyricPickerModal, setShowLyricPickerModal] = useState(false);
  const [exportModalType, setExportModalType] = useState<'copy' | 'download' | null>(null);
  const [exportedResultDataUrl, setExportedResultDataUrl] = useState<string | null>(null);

  const posterRef = useRef<HTMLDivElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // Lock main page scrolling when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, []);

  // Fetch song details & lyrics and convert album cover
  useEffect(() => {
    if (!song) return;

    let isMounted = true;
    setLoading(true);
    setSelectedLines([]);
    setCustomQuoteInput('');

    const fetchLyrics = async () => {
      try {
        const data = await fetchSongDetail(song);
        if (isMounted) {
          setDetailData(data);
        }
      } catch (err) {
        console.error('Error fetching lyrics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLyrics();

    return () => {
      isMounted = false;
    };
  }, [song]);

  useEffect(() => {
    setPosterConfig((prev) => ({ ...prev, customQuote: customQuoteInput }));
  }, [customQuoteInput]);

  // Fit Poster completely into viewport without overflow, maximizing visible size
  useEffect(() => {
    const calculateScale = () => {
      const container = previewContainerRef.current;
      const poster = posterRef.current;
      if (!container || !poster) return;

      const isMobile = window.innerWidth < 640;
      const padding = isMobile ? 16 : 28;

      const containerH = container.clientHeight - padding;
      const containerW = container.clientWidth - padding;

      const posterH = poster.offsetHeight;
      const posterW = poster.offsetWidth;

      if (posterH <= 0 || posterW <= 0 || containerH <= 0 || containerW <= 0) return;

      const scaleY = containerH / posterH;
      const scaleX = containerW / posterW;
      // Fit completely inside the container while maximizing size
      const optimalScale = Math.min(scaleY, scaleX);

      setPreviewScale(Math.max(0.1, optimalScale));
    };

    calculateScale();

    const container = previewContainerRef.current;
    const poster = posterRef.current;
    let resizeObserver: ResizeObserver | null = null;

    if (container && poster && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        calculateScale();
      });
      resizeObserver.observe(container);
      resizeObserver.observe(poster);
    }

    const timer = setTimeout(calculateScale, 100);
    window.addEventListener('resize', calculateScale);

    return () => {
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', calculateScale);
    };
  }, [posterConfig, selectedLines, loading, mobileActiveTab, customQuoteInput]);

  if (!song) return null;

  const lyrics = detailData?.lyrics || [];

  // Toggle selection of a lyric line with no line count restrictions
  const handleToggleLine = (line: LyricLine) => {
    setSelectedLines((prev) => {
      const exists = prev.some((l) => l.id === line.id || (l.text === line.text && l.time === line.time));
      if (exists) {
        return prev.filter((l) => !(l.id === line.id || (l.text === line.text && l.time === line.time)));
      } else {
        const next = [...prev, line];
        return next.sort((a, b) => (a.time || 0) - (b.time || 0));
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedLines([...lyrics]);
  };

  const handleClearSelection = () => {
    setSelectedLines([]);
  };

  // Helper to generate clean image with customizable sampling multiplier (2x to 8x)
  const generatePosterImage = async (targetPixelRatio = 4) => {
    const node = posterRef.current;
    if (!node) throw new Error('Canvas element not found');

    const width = node.offsetWidth;
    const height = node.offsetHeight;

    const clampedRatio = Math.min(8, Math.max(2, targetPixelRatio));

    // Try target down through progressive fallback levels
    const ratiosToTry = [clampedRatio, 6, 4, 3, 2].filter(
      (r, idx, arr) => arr.indexOf(r) === idx && r <= clampedRatio
    );

    for (const ratio of ratiosToTry) {
      try {
        const dataUrl = await toPng(node, {
          quality: 0.98,
          pixelRatio: ratio,
          cacheBust: false,
          skipFonts: true,
          width,
          height,
          canvasWidth: width * ratio,
          canvasHeight: height * ratio,
          style: {
            margin: '0',
            transform: 'none',
            left: '0',
            top: '0',
            position: 'static',
          },
        });
        if (dataUrl) return dataUrl;
      } catch (e) {
        console.warn(`Export attempt with pixelRatio=${ratio} failed, trying next resolution level...`, e);
      }
    }
    throw new Error('Failed to generate image across all resolution attempts');
  };

  // Export Poster as PNG image
  const handleDownloadPoster = async (scaleRatio?: number) => {
    if (!posterRef.current) return;
    setIsExporting(true);

    try {
      const targetRatio = scaleRatio || Number(exportScale) || 4;
      const dataUrl = await generatePosterImage(targetRatio);
      const isMobile = window.innerWidth < 768 || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

      if (isMobile) {
        setExportModalType(null);
        setExportedResultDataUrl(dataUrl);
      } else {
        const link = document.createElement('a');
        const filename = `${song.name}-${song.artist}-歌词海报.png`.replace(/[\\/:*?"<>|]/g, '_');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setCopyStatus('download');
        setExportModalType(null);
        setTimeout(() => setCopyStatus(null), 2500);
      }
    } catch (err) {
      console.error('High-res export failed, trying fallback quality:', err);
      try {
        const dataUrl = await generatePosterImage(2);
        const isMobile = window.innerWidth < 768 || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

        if (isMobile) {
          setExportModalType(null);
          setExportedResultDataUrl(dataUrl);
        } else {
          const link = document.createElement('a');
          link.download = `${song.name}-歌词海报.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setCopyStatus('download');
          setExportModalType(null);
          setTimeout(() => setCopyStatus(null), 2500);
        }
      } catch (finalErr) {
        console.error('Fallback export also failed:', finalErr);
        // Fallback: try capturing canvas at current DOM scale
        try {
          const node = posterRef.current;
          if (node) {
            const fallbackDataUrl = await toPng(node, { quality: 0.95, pixelRatio: 1 });
            setExportModalType(null);
            setExportedResultDataUrl(fallbackDataUrl);
            return;
          }
        } catch {}
        alert('海报制作失败，请重试');
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Poster to Clipboard
  const handleCopyImage = async (scaleRatio?: number) => {
    if (!posterRef.current) return;
    setIsExporting(true);

    try {
      const node = posterRef.current;
      const targetRatio = scaleRatio || Number(exportScale) || 4;
      const isMobile = window.innerWidth < 768 || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

      // On mobile devices, clipboard write for PNG images is restricted by WebKit/Blink security policies
      // We directly provide the high-def result modal for seamless saving/sharing!
      if (isMobile) {
        const dataUrl = await generatePosterImage(targetRatio);
        setExportModalType(null);
        setExportedResultDataUrl(dataUrl);
        return;
      }

      const width = node.offsetWidth;
      const height = node.offsetHeight;

      let blob: Blob | null = null;
      const ratiosToTry = [targetRatio, 6, 4, 3, 2].filter(
        (r, idx, arr) => arr.indexOf(r) === idx && r <= targetRatio
      );
      for (const ratio of ratiosToTry) {
        try {
          blob = await toBlob(node, {
            pixelRatio: ratio,
            cacheBust: false,
            skipFonts: true,
            width,
            height,
            canvasWidth: width * ratio,
            canvasHeight: height * ratio,
          });
          if (blob) break;
        } catch (e) {
          console.warn(`Copy blob with ratio=${ratio} failed, trying lower ratio...`, e);
        }
      }

      if (!blob) throw new Error('Blob generation failed');

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        setCopyStatus('image');
        setExportModalType(null);
        setTimeout(() => setCopyStatus(null), 2000);
      } else {
        throw new Error('Clipboard API not supported');
      }
    } catch (err) {
      console.error('Copy poster failed, falling back to result preview:', err);
      try {
        const targetRatio = scaleRatio || Number(exportScale) || 4;
        const dataUrl = await generatePosterImage(targetRatio);
        setExportModalType(null);
        setExportedResultDataUrl(dataUrl);
      } catch {
        handleDownloadPoster(scaleRatio);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Copy raw plain text lyrics
  const handleCopyTextLyrics = () => {
    const textToCopy =
      selectedLines.length > 0
        ? selectedLines
            .map((l) => (posterConfig.showTranslation && l.translation ? `${l.text}\n${l.translation}` : l.text))
            .join('\n\n')
        : lyrics
            .map((l) => (posterConfig.showTranslation && l.translation ? `${l.text}\n${l.translation}` : l.text))
            .join('\n');

    navigator.clipboard.writeText(textToCopy);
    setCopyStatus('text');
    setTimeout(() => setCopyStatus(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 animate-fadeIn">
      {/* Top Navigation Bar: Minimal and uncluttered */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 backdrop-blur-md z-20">
        {/* Left: Back button & basic song info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          <button
            type="button"
            id="modal-back-btn"
            onClick={onClose}
            className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">返回搜索</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block shrink-0" />

          {/* Song Info (without book title marks around album) */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg overflow-hidden border border-slate-700/80 shrink-0 cursor-pointer group relative"
              onClick={() => setShowCoverLightbox(true)}
              title="点击查看高清封面"
            >
              <img
                src={song.albumCover}
                alt={song.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs sm:text-sm font-bold text-white truncate">{song.name}</h2>
              <div className="text-[10px] sm:text-[11px] text-slate-400 flex items-center overflow-hidden">
                <span className="shrink-0 max-w-[50%] sm:max-w-[60%] truncate">{cleanArtistName(song.artist)}</span>
                {song.album && (
                  <>
                    <span className="shrink-0 mx-1.5 text-slate-500 select-none">·</span>
                    <span className="truncate shrink min-w-0">{cleanAlbumName(song.album)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Export & Copy Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Sampling Multiplier Input (Manual numeric input only, Noto Sans CN font) */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-850 text-xs text-slate-300">
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">采样倍率</span>
            <input
              id="export-scale-input"
              type="text"
              inputMode="numeric"
              value={exportScale}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                setExportScale(digits);
              }}
              onBlur={() => {
                if (!exportScale || exportScale.trim() === '') {
                  setExportScale('4');
                } else {
                  const val = parseInt(exportScale, 10);
                  if (val < 2) setExportScale('2');
                  else if (val > 8) setExportScale('8');
                  else setExportScale(String(val));
                }
              }}
              className="w-8 text-center font-sans font-bold text-sky-400 bg-slate-900 border border-slate-750 rounded px-1 py-0.5 outline-none focus:border-sky-500 text-xs"
            />
            <span className="text-[11px] text-slate-400 font-sans">x</span>
          </div>

          {/* Copy Plain Text (Desktop only) */}
          <button
            type="button"
            id="copy-text-lyrics-btn"
            onClick={handleCopyTextLyrics}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            {copyStatus === 'text' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">已复制文本</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>复制歌词</span>
              </>
            )}
          </button>

          {/* Copy Poster Image (Desktop only) */}
          <button
            type="button"
            id="copy-poster-image-btn"
            onClick={() => handleCopyImage()}
            disabled={isExporting}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {copyStatus === 'image' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">已复制图片</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>复制海报</span>
              </>
            )}
          </button>

          {/* Download HD PNG Poster */}
          {/* Desktop version with text */}
          <button
            type="button"
            id="download-poster-btn"
            onClick={() => handleDownloadPoster()}
            disabled={isExporting}
            className="hidden lg:flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>生成中...</span>
              </>
            ) : copyStatus === 'download' ? (
              <>
                <Check className="w-3.5 h-3.5 text-slate-950" />
                <span>保存成功</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>保存海报</span>
              </>
            )}
          </button>

          {/* Mobile version: Icon only, rounded square, triggers scale modal */}
          <button
            type="button"
            id="mobile-download-poster-btn"
            onClick={() => setExportModalType('download')}
            disabled={isExporting}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-sky-500 active:bg-sky-400 text-slate-950 shadow-md shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50 font-bold"
            title="保存海报"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : copyStatus === 'download' ? (
              <Check className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Studio Body: Left Preview, Right Controls on Desktop; Top Preview, Bottom 2-Row Controls on Mobile */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Poster Stage: Auto scaled to completely fit viewport without clipping */}
        <div
          ref={previewContainerRef}
          className="flex-1 lg:col-span-7 xl:col-span-6 bg-slate-950/70 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex items-center justify-center p-2 sm:p-4 relative overflow-hidden min-h-0"
        >
          <div
            className="transition-transform duration-200 flex items-center justify-center origin-center"
            style={{
              transform: `scale(${previewScale})`,
            }}
          >
            <PosterPreview
              song={song}
              selectedLyrics={selectedLines}
              config={posterConfig}
              previewRef={posterRef}
              customCoverUrl={song.albumCover}
            />
          </div>
        </div>

        {/* Desktop Right Column: Generously sized control panel */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 flex-col min-h-0 bg-slate-900/60 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto w-full">
            {/* 1. Theme Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-sky-400" />
                <span>海报风格</span>
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {THEMES.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    id={`theme-select-${th.id}`}
                    onClick={() => setPosterConfig((prev) => ({ ...prev, theme: th.id }))}
                    className={`py-2 px-1 rounded-xl text-center border transition-all text-xs flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      posterConfig.theme === th.id
                        ? 'border-sky-500 bg-sky-950/50 font-bold text-white ring-2 ring-sky-500/30'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border shadow-xs ${th.color}`} />
                    <span className="text-[10px] truncate">{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Format & Layout Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              {/* Aspect Ratio */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">海报比例</label>
                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  {[
                    {
                      id: '3:4',
                      title: '3:4 比例',
                      icon: <span className="w-[10px] h-[13px] border border-current rounded-[1px] inline-block" />,
                    },
                    {
                      id: '1:1',
                      title: '1:1 比例',
                      icon: <span className="w-3 h-3 border border-current rounded-[1px] inline-block" />,
                    },
                    {
                      id: '9:16',
                      title: '9:16 比例',
                      icon: <span className="w-2 h-3.5 border border-current rounded-[1px] inline-block" />,
                    },
                    {
                      id: 'auto',
                      title: '完整海报',
                      icon: <span className="text-xs">完整</span>,
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      id={`ratio-btn-${item.id}`}
                      onClick={() => setPosterConfig((prev) => ({ ...prev, aspectRatio: item.id as any }))}
                      className={`flex-1 h-7 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer whitespace-nowrap ${
                        posterConfig.aspectRatio === item.id
                          ? 'bg-sky-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={item.title}
                    >
                      {item.icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">歌词字号</label>
                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      id={`size-btn-${size}`}
                      onClick={() => setPosterConfig((prev) => ({ ...prev, fontSize: size }))}
                      className={`flex-1 py-1.5 text-center rounded-md uppercase font-mono text-xs transition-colors cursor-pointer ${
                        posterConfig.fontSize === size
                          ? 'bg-sky-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Element Toggles */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">元素开关</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="toggle-cover-btn"
                    onClick={() => setPosterConfig((prev) => ({ ...prev, showCover: !prev.showCover }))}
                    className={`flex-1 py-1.5 rounded-md border text-xs transition-all cursor-pointer text-center font-medium ${
                      posterConfig.showCover
                        ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    封面
                  </button>
                  <button
                    type="button"
                    id="toggle-trans-btn"
                    onClick={() => setPosterConfig((prev) => ({ ...prev, showTranslation: !prev.showTranslation }))}
                    className={`flex-1 py-1.5 rounded-md border text-xs transition-all cursor-pointer text-center font-medium ${
                      posterConfig.showTranslation
                        ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    翻译
                  </button>
                  <button
                    type="button"
                    id="toggle-album-btn"
                    onClick={() => setPosterConfig((prev) => ({ ...prev, showAlbumInfo: !prev.showAlbumInfo }))}
                    className={`flex-1 py-1.5 rounded-md border text-xs transition-all cursor-pointer text-center font-medium ${
                      posterConfig.showAlbumInfo
                        ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    专辑
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Typography & Alignment Settings */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-sky-400" />
                  <span>字体与对齐设置</span>
                </label>
              </div>

              <div className="flex flex-col gap-2.5 text-xs">
                {/* 1. 歌词: 对齐 + B + I (从右到左为：I, B, 对齐) + 字体 */}
                <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                  <div className="flex items-center justify-between h-7">
                    <span className="text-[11px] font-medium text-slate-300">歌词</span>
                    <div className="flex items-center gap-1.5">
                      {/* Lyric Align */}
                      <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          id="lyric-align-left-btn"
                          onClick={() => setPosterConfig((prev) => ({ ...prev, lyricAlign: 'left' }))}
                          className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                            posterConfig.lyricAlign === 'left' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="歌词左对齐"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          id="lyric-align-center-btn"
                          onClick={() => setPosterConfig((prev) => ({ ...prev, lyricAlign: 'center' }))}
                          className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                            posterConfig.lyricAlign === 'center' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="歌词居中对齐"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          id="lyric-align-right-btn"
                          onClick={() => setPosterConfig((prev) => ({ ...prev, lyricAlign: 'right' }))}
                          className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                            posterConfig.lyricAlign === 'right' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="歌词右对齐"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Standalone Bold Button */}
                      <button
                        type="button"
                        id="lyric-bold-toggle"
                        onClick={() => setPosterConfig((prev) => ({ ...prev, lyricBold: !prev.lyricBold }))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                          posterConfig.lyricBold
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="歌词加粗"
                      >
                        B
                      </button>

                      {/* Standalone Italic Button */}
                      <button
                        type="button"
                        id="lyric-italic-toggle"
                        onClick={() => setPosterConfig((prev) => ({ ...prev, lyricItalic: !prev.lyricItalic }))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg border italic font-serif text-xs transition-colors cursor-pointer ${
                          posterConfig.lyricItalic
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="歌词斜体"
                      >
                        I
                      </button>
                    </div>
                  </div>

                  <div>
                    <select
                      id="lyric-font-select"
                      value={posterConfig.lyricFont}
                      onChange={(e) => setPosterConfig((prev) => ({ ...prev, lyricFont: e.target.value as PosterFont }))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. 翻译: B + I (从右到左为：I, B) + 字体 */}
                <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                  <div className="flex items-center justify-between h-7">
                    <span className="text-[11px] font-medium text-slate-300">翻译</span>
                    <div className="flex items-center gap-1.5">
                      {/* Standalone Bold Button */}
                      <button
                        type="button"
                        id="translation-bold-toggle"
                        onClick={() => setPosterConfig((prev) => ({ ...prev, translationBold: !prev.translationBold }))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                          posterConfig.translationBold
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="翻译加粗"
                      >
                        B
                      </button>

                      {/* Standalone Italic Button */}
                      <button
                        type="button"
                        id="translation-italic-toggle"
                        onClick={() => setPosterConfig((prev) => ({ ...prev, translationItalic: !prev.translationItalic }))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg border italic font-serif text-xs transition-colors cursor-pointer ${
                          posterConfig.translationItalic
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="翻译斜体"
                      >
                        I
                      </button>
                    </div>
                  </div>

                  <div>
                    <select
                      id="translation-font-select"
                      value={posterConfig.translationFont}
                      onChange={(e) => setPosterConfig((prev) => ({ ...prev, translationFont: e.target.value as PosterFont }))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. 歌名与歌手: 对齐 + B + I (从右到左为：I, B, 对齐) + 字体 */}
                <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                  <div className="flex items-center justify-between h-7">
                    <span className="text-[11px] font-medium text-slate-300">歌名与歌手</span>
                    <div className="flex items-center gap-1.5">
                      {/* Info Align */}
                      <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          id="info-align-left-btn"
                          onClick={() => setPosterConfig((prev) => ({ ...prev, infoAlign: 'left' }))}
                          className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                            posterConfig.infoAlign === 'left' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="歌曲信息左对齐"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          id="info-align-center-btn"
                          onClick={() => setPosterConfig((prev) => ({ ...prev, infoAlign: 'center' }))}
                          className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                            posterConfig.infoAlign === 'center' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="歌曲信息居中对齐"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          id="info-align-right-btn"
                          onClick={() => setPosterConfig((prev) => ({ ...prev, infoAlign: 'right' }))}
                          className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                            posterConfig.infoAlign === 'right' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="歌曲信息右对齐"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Standalone Bold Button */}
                      <button
                        type="button"
                        id="info-bold-toggle"
                        onClick={() => setPosterConfig((prev) => ({ ...prev, infoBold: !prev.infoBold }))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                          posterConfig.infoBold
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="歌名与歌手加粗"
                      >
                        B
                      </button>

                      {/* Standalone Italic Button */}
                      <button
                        type="button"
                        id="info-italic-toggle"
                        onClick={() => setPosterConfig((prev) => ({ ...prev, infoItalic: !prev.infoItalic }))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg border italic font-serif text-xs transition-colors cursor-pointer ${
                          posterConfig.infoItalic
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="歌名与歌手斜体"
                      >
                        I
                      </button>
                    </div>
                  </div>

                  {/* Info Font */}
                  <div>
                    <select
                      id="info-font-select"
                      value={posterConfig.infoFont}
                      onChange={(e) => setPosterConfig((prev) => ({ ...prev, infoFont: e.target.value as PosterFont }))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. 心情随笔: 引号样式 + B + I (从右到左为：I, B, 引号样式) + 字体 */}
                <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                  <div className="flex items-center justify-between h-7">
                    <span className="text-[11px] font-medium text-slate-300">心情随笔</span>
                    <div className="flex items-center gap-1.5">
                      {/* Quote Style (Equal width buttons, unified style) */}
                      <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          id="quote-style-corner-btn"
                          onClick={() => setPosterConfig((prev) => ({ ...prev, quoteStyle: 'corner' }))}
                          className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-normal transition-colors cursor-pointer ${
                            posterConfig.quoteStyle === 'corner' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="直角引号「」"
                        >
                          「」
                        </button>
                        <button
                          type="button"
                          id="quote-style-curly-btn"
                          onClick={() => setPosterConfig((prev) => ({ ...prev, quoteStyle: 'curly' }))}
                          className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-normal transition-colors cursor-pointer ${
                            posterConfig.quoteStyle === 'curly' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title="弯引号“”"
                        >
                          “”
                        </button>
                      </div>

                      {/* Standalone Bold Button */}
                      <button
                        type="button"
                        id="quote-bold-toggle"
                        onClick={() => setPosterConfig((prev) => ({ ...prev, quoteBold: !prev.quoteBold }))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                          posterConfig.quoteBold
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="心情随笔加粗"
                      >
                        B
                      </button>

                      {/* Standalone Italic Button */}
                      <button
                        type="button"
                        id="quote-italic-toggle"
                        onClick={() => setPosterConfig((prev) => ({ ...prev, quoteItalic: !prev.quoteItalic }))}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg border italic font-serif text-xs transition-colors cursor-pointer ${
                          posterConfig.quoteItalic
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="心情随笔斜体"
                      >
                        I
                      </button>
                    </div>
                  </div>
                  <div>
                    <select
                      id="quote-font-select"
                      value={posterConfig.quoteFont}
                      onChange={(e) => setPosterConfig((prev) => ({ ...prev, quoteFont: e.target.value as PosterFont }))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Lyric Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                  <span>挑选歌词</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    id="select-all-lyrics-btn"
                    onClick={handleSelectAll}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    全选
                  </button>
                  <button
                    type="button"
                    id="clear-all-lyrics-btn"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    清空
                  </button>
                </div>
              </div>

              {/* Scrollable list of lyric lines with balanced left and right padding */}
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 p-2">
                <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin text-sky-500" />
                      <p className="text-xs">加载歌词中...</p>
                    </div>
                  ) : lyrics.length > 0 ? (
                    lyrics.map((line) => {
                      const isSelected = selectedLines.some(
                        (l) => l.id === line.id || (l.text === line.text && l.time === line.time)
                      );
                      return (
                        <div
                          key={line.id}
                          id={`lyric-select-${line.id}`}
                          onClick={() => handleToggleLine(line)}
                          className={`p-2.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-sky-600/20 border-sky-500/60 text-white'
                              : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 text-slate-300'
                          }`}
                        >
                          {/* Vertically centered with first line text */}
                          <div className="h-5 flex items-center shrink-0 text-sky-400">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-sky-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs sm:text-sm leading-5 ${isSelected ? 'font-semibold' : ''}`}>
                              {line.text}
                            </p>
                            {line.translation && (
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{line.translation}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      暂未检索到歌词
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Custom Quote / Sentiment */}
            <div className="space-y-1.5 pt-0.5">
              <label className="text-xs font-semibold text-slate-300">添加心情随笔</label>
              <input
                id="custom-poster-quote-input"
                type="text"
                value={customQuoteInput}
                onChange={(e) => setCustomQuoteInput(e.target.value)}
                maxLength={40}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-100 outline-none focus:border-sky-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Only 2-Row Bottom Control Center */}
      <div className="lg:hidden shrink-0 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md z-20 flex flex-col">
        {/* Row 1: Active Feature Secondary Options Panel */}
        <div className="h-12 px-2.5 flex items-center justify-between border-b border-slate-800/80 no-scrollbar overflow-x-auto gap-2 bg-slate-950/40">
          {mobileActiveTab === 'theme' && (
            <div className="flex items-center gap-1.5 w-full no-scrollbar overflow-x-auto py-1">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setPosterConfig((prev) => ({ ...prev, theme: th.id }))}
                  className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap flex items-center gap-1.5 border shrink-0 transition-colors cursor-pointer ${
                    posterConfig.theme === th.id
                      ? 'bg-sky-600/30 border-sky-500 text-sky-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full border ${th.color}`} />
                  <span>{th.name}</span>
                </button>
              ))}
            </div>
          )}

          {mobileActiveTab === 'ratio' && (
            <div className="flex items-center justify-between w-full gap-1.5">
              {[
                {
                  id: '3:4',
                  title: '3:4 比例',
                  label: '3:4',
                  icon: <span className="w-[10px] h-[13px] border border-current rounded-[1px] inline-block" />,
                },
                {
                  id: '1:1',
                  title: '1:1 比例',
                  label: '1:1',
                  icon: <span className="w-3 h-3 border border-current rounded-[1px] inline-block" />,
                },
                {
                  id: '9:16',
                  title: '9:16 比例',
                  label: '9:16',
                  icon: <span className="w-2 h-3.5 border border-current rounded-[1px] inline-block" />,
                },
                {
                  id: 'auto',
                  title: '完整海报',
                  label: '完整',
                  icon: <span className="text-xs">完整</span>,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPosterConfig((prev) => ({ ...prev, aspectRatio: item.id as any }))}
                  className={`flex-1 min-w-0 h-8 flex items-center justify-center gap-1 rounded-lg border text-xs transition-colors cursor-pointer ${
                    posterConfig.aspectRatio === item.id
                      ? 'bg-sky-600/30 border-sky-500 text-sky-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                  title={item.title}
                >
                  {item.icon}
                  <span className="text-[11px]">{item.label}</span>
                </button>
              ))}
            </div>
          )}

          {mobileActiveTab === 'fontSize' && (
            <div className="flex items-center justify-between w-full gap-1.5">
              {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPosterConfig((prev) => ({ ...prev, fontSize: size }))}
                  className={`flex-1 min-w-0 h-8 flex items-center justify-center rounded-lg border text-xs font-mono uppercase transition-colors cursor-pointer ${
                    posterConfig.fontSize === size
                      ? 'bg-sky-600/30 border-sky-500 text-sky-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          {mobileActiveTab === 'toggles' && (
            <div className="flex items-center justify-between w-full gap-1.5">
              <button
                type="button"
                onClick={() => setPosterConfig((prev) => ({ ...prev, showCover: !prev.showCover }))}
                className={`flex-1 min-w-0 h-8 rounded-lg border text-xs transition-colors cursor-pointer font-medium text-center ${
                  posterConfig.showCover
                    ? 'bg-sky-600/30 border-sky-500 text-sky-200 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                封面: {posterConfig.showCover ? '开' : '关'}
              </button>
              <button
                type="button"
                onClick={() => setPosterConfig((prev) => ({ ...prev, showTranslation: !prev.showTranslation }))}
                className={`flex-1 min-w-0 h-8 rounded-lg border text-xs transition-colors cursor-pointer font-medium text-center ${
                  posterConfig.showTranslation
                    ? 'bg-sky-600/30 border-sky-500 text-sky-200 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                翻译: {posterConfig.showTranslation ? '开' : '关'}
              </button>
              <button
                type="button"
                onClick={() => setPosterConfig((prev) => ({ ...prev, showAlbumInfo: !prev.showAlbumInfo }))}
                className={`flex-1 min-w-0 h-8 rounded-lg border text-xs transition-colors cursor-pointer font-medium text-center ${
                  posterConfig.showAlbumInfo
                    ? 'bg-sky-600/30 border-sky-500 text-sky-200 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                专辑: {posterConfig.showAlbumInfo ? '开' : '关'}
              </button>
            </div>
          )}

          {mobileActiveTab === 'quote' && (
            <div className="flex items-center w-full gap-1.5">
              <input
                type="text"
                placeholder="输入心情随笔（最多40字）..."
                value={customQuoteInput}
                onChange={(e) => setCustomQuoteInput(e.target.value)}
                maxLength={40}
                className="flex-1 min-w-0 px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 outline-none focus:border-sky-500"
              />
              {customQuoteInput && (
                <button
                  type="button"
                  onClick={() => setCustomQuoteInput('')}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Bottom Primary Tab Navigation */}
        <div className="h-14 px-1.5 flex items-center justify-between overflow-hidden gap-0.5 no-scrollbar">
          {/* 1. 海报风格 */}
          <button
            type="button"
            onClick={() => setMobileActiveTab('theme')}
            className={`flex-1 min-w-0 py-1.5 flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
              mobileActiveTab === 'theme' ? 'text-sky-400 font-bold bg-slate-800/60' : 'text-slate-400'
            }`}
          >
            <Palette className="w-4 h-4 mb-0.5 shrink-0" />
            <span className="text-[10px] whitespace-nowrap">风格</span>
          </button>

          {/* 2. 海报比例 */}
          <button
            type="button"
            onClick={() => setMobileActiveTab('ratio')}
            className={`flex-1 min-w-0 py-1.5 flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
              mobileActiveTab === 'ratio' ? 'text-sky-400 font-bold bg-slate-800/60' : 'text-slate-400'
            }`}
          >
            <Ratio className="w-4 h-4 mb-0.5 shrink-0" />
            <span className="text-[10px] whitespace-nowrap">比例</span>
          </button>

          {/* 3. 歌词字号 */}
          <button
            type="button"
            onClick={() => setMobileActiveTab('fontSize')}
            className={`flex-1 min-w-0 py-1.5 flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
              mobileActiveTab === 'fontSize' ? 'text-sky-400 font-bold bg-slate-800/60' : 'text-slate-400'
            }`}
          >
            <Type className="w-4 h-4 mb-0.5 shrink-0" />
            <span className="text-[10px] whitespace-nowrap">字号</span>
          </button>

          {/* 4. 元素开关 */}
          <button
            type="button"
            onClick={() => setMobileActiveTab('toggles')}
            className={`flex-1 min-w-0 py-1.5 flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
              mobileActiveTab === 'toggles' ? 'text-sky-400 font-bold bg-slate-800/60' : 'text-slate-400'
            }`}
          >
            <Sliders className="w-4 h-4 mb-0.5 shrink-0" />
            <span className="text-[10px] whitespace-nowrap">元素</span>
          </button>

          {/* 5. 字体与对齐设置 (Modal Popup) */}
          <button
            type="button"
            onClick={() => setShowTypographyModal(true)}
            className="flex-1 min-w-0 py-1.5 flex flex-col items-center justify-center rounded-lg text-slate-400 active:text-sky-400 active:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 mb-0.5 shrink-0" />
            <span className="text-[10px] whitespace-nowrap">排版</span>
          </button>

          {/* 6. 挑选歌词 (Modal Popup) */}
          <button
            type="button"
            onClick={() => setShowLyricPickerModal(true)}
            className="flex-1 min-w-0 py-1.5 flex flex-col items-center justify-center rounded-lg text-slate-400 active:text-sky-400 active:bg-slate-800/60 transition-colors cursor-pointer relative"
          >
            <ListMusic className="w-4 h-4 mb-0.5 shrink-0" />
            <span className="text-[10px] whitespace-nowrap">选词</span>
            {selectedLines.length > 0 && (
              <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-sky-400" />
            )}
          </button>

          {/* 7. 心情随笔 */}
          <button
            type="button"
            onClick={() => setMobileActiveTab('quote')}
            className={`flex-1 min-w-0 py-1.5 flex flex-col items-center justify-center rounded-lg transition-colors cursor-pointer ${
              mobileActiveTab === 'quote' ? 'text-sky-400 font-bold bg-slate-800/60' : 'text-slate-400'
            }`}
          >
            <Edit3 className="w-4 h-4 mb-0.5 shrink-0" />
            <span className="text-[10px] whitespace-nowrap">随笔</span>
          </button>
        </div>
      </div>

      {/* Popups & Modals */}
      {/* 1. Typography & Alignment Popup Modal */}
      {showTypographyModal && (
        <TypographyModal
          config={posterConfig}
          onChange={setPosterConfig}
          onClose={() => setShowTypographyModal(false)}
          fontOptions={FONT_OPTIONS}
        />
      )}

      {/* 2. Lyric Picker Popup Modal */}
      {showLyricPickerModal && (
        <LyricPickerModal
          lyrics={lyrics}
          selectedLines={selectedLines}
          onToggleLine={handleToggleLine}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearSelection}
          loading={loading}
          onClose={() => setShowLyricPickerModal(false)}
        />
      )}

      {/* 3. Export Scale Selector Modal (Mobile Copy / Download) */}
      {exportModalType && (
        <ExportScaleModal
          type={exportModalType}
          initialScale={Number(exportScale) || 4}
          isExporting={isExporting}
          onConfirm={(scale) => {
            setExportScale(String(scale));
            if (exportModalType === 'copy') {
              handleCopyImage(scale);
            } else {
              handleDownloadPoster(scale);
            }
          }}
          onClose={() => setExportModalType(null)}
        />
      )}

      {/* 4. Lightbox for HD Artwork */}
      {showCoverLightbox && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-md w-full bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-2xl flex flex-col items-center space-y-3">
            <button
              type="button"
              id="close-lightbox-btn"
              onClick={() => setShowCoverLightbox(false)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-full aspect-square rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-black/40">
              <img
                src={song.albumCover}
                alt={song.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-center space-y-0.5">
              <h3 className="text-sm font-bold text-white">{song.name}</h3>
              <div className="flex items-center justify-center text-xs text-slate-400 overflow-hidden">
                <span className="truncate max-w-[45%]">{cleanArtistName(song.artist)}</span>
                {song.album && (
                  <>
                    <span className="shrink-0 mx-1.5 opacity-60 select-none">·</span>
                    <span className="truncate max-w-[45%]">{cleanAlbumName(song.album)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Mobile Poster Result Modal (Long-press save, Share, Download) */}
      {exportedResultDataUrl && (
        <MobilePosterResultModal
          imageDataUrl={exportedResultDataUrl}
          songName={song.name}
          artistName={song.artist}
          onClose={() => setExportedResultDataUrl(null)}
        />
      )}
    </div>
  );
};
