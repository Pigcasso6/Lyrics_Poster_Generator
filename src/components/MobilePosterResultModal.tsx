import React, { useState } from 'react';
import { Download, Copy, Share2, Check, X, Sparkles, Image as ImageIcon } from 'lucide-react';

interface MobilePosterResultModalProps {
  imageDataUrl: string;
  songName: string;
  artistName: string;
  onClose: () => void;
}

export const MobilePosterResultModal: React.FC<MobilePosterResultModalProps> = ({
  imageDataUrl,
  songName,
  artistName,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const filename = `${songName}-${artistName}-歌词海报.png`.replace(/[\\/:*?"<>|]/g, '_');

  const handleShare = async () => {
    try {
      if (navigator.share) {
        // Convert dataUrl to blob
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${songName} - 歌词海报`,
            text: `${songName} - ${artistName} 歌词海报`,
          });
          setShared(true);
          setTimeout(() => setShared(false), 2000);
          return;
        }
      }
    } catch (e) {
      console.warn('Web Share failed or cancelled:', e);
    }
    // Fallback trigger direct download/tab
    handleDownload();
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.download = filename;
      link.href = imageDataUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      // In webview where download fails, open in new window
      window.open(imageDataUrl, '_blank');
    }
  };

  const handleCopy = async () => {
    try {
      const res = await fetch(imageDataUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        handleDownload();
      }
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-black/90 backdrop-blur-md flex flex-col justify-between items-center p-3 sm:p-6 animate-fadeIn">
      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between py-2 text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold">海报制作完成</h3>
            <p className="text-[11px] text-slate-400">已成功生成高清歌词海报</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Display */}
      <div className="flex-1 w-full max-w-md my-2 flex flex-col items-center justify-center min-h-0 overflow-hidden relative">
        <div className="relative max-h-full max-w-full flex items-center justify-center p-1 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl overflow-hidden">
          <img
            src={imageDataUrl}
            alt="生成的歌词海报"
            className="max-h-[58vh] max-w-full object-contain rounded-xl select-none"
            style={{ touchAction: 'pan-y pinch-zoom' }}
          />
        </div>

        {/* Mobile friendly prompt badge */}
        <div className="mt-3 px-3 py-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-medium flex items-center gap-1.5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>手机端可<strong>长按上方图片</strong>直接保存到相册</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col gap-2 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleShare}
              className="py-3 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>{shared ? '已呼起分享' : '系统分享/相册'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className={`py-3 px-3 rounded-xl ${
              typeof navigator !== 'undefined' && 'share' in navigator
                ? 'bg-slate-800 hover:bg-slate-700 text-white font-medium'
                : 'col-span-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-md shadow-sky-500/20'
            } text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer`}
          >
            <Download className="w-4 h-4" />
            <span>下载海报图像</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 border border-slate-700/60 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已复制到剪贴板' : '复制海报图片'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 border border-slate-800 transition-all cursor-pointer"
          >
            <span>完成</span>
          </button>
        </div>
      </div>
    </div>
  );
};
