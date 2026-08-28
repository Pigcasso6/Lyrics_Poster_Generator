import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
          aria-label="关闭"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Display: 100% Crisp Straight Rectangle (rounded-none) */}
      <div className="flex-1 w-full max-w-md my-2 flex flex-col items-center justify-center min-h-0 overflow-hidden relative">
        <div className="relative max-h-full max-w-full flex items-center justify-center p-1 bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden rounded-none">
          <img
            src={imageDataUrl}
            alt={`${songName} - ${artistName} 歌词海报`}
            className="max-h-[58vh] max-w-full object-contain select-none rounded-none block"
            style={{ touchAction: 'pan-y pinch-zoom' }}
          />
        </div>

        {/* Mobile prompt without icon */}
        <div className="mt-3 px-4 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-200 text-xs font-medium text-center shadow-sm">
          长按上方图片保存到相册
        </div>
      </div>

      {/* Bottom Action: Only "完成" button */}
      <div className="w-full max-w-md bg-slate-900/95 border border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-2xl flex flex-col gap-2 shrink-0">
        <button
          type="button"
          id="mobile-poster-finish-btn"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-bold text-sm flex items-center justify-center transition-all cursor-pointer shadow-md shadow-sky-500/20"
        >
          完成
        </button>
      </div>
    </div>
  );
};

