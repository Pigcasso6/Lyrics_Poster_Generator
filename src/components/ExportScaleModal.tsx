import React, { useState } from 'react';
import { Copy, Download, RefreshCw, X, Sparkles } from 'lucide-react';

interface ExportScaleModalProps {
  type: 'copy' | 'download';
  initialScale: number;
  isExporting: boolean;
  onConfirm: (scale: number) => void;
  onClose: () => void;
}

export const ExportScaleModal: React.FC<ExportScaleModalProps> = ({
  type,
  initialScale,
  isExporting,
  onConfirm,
  onClose,
}) => {
  const [scale, setScale] = useState<number>(initialScale || 16);
  const [scaleInput, setScaleInput] = useState<string>(String(initialScale || 16));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setScale(val);
    setScaleInput(String(val));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    setScaleInput(digits);
    if (digits) {
      const val = parseInt(digits, 10);
      setScale(Math.min(64, Math.max(2, val)));
    }
  };

  const handleInputBlur = () => {
    if (!scaleInput || scaleInput.trim() === '') {
      setScale(16);
      setScaleInput('16');
    } else {
      const val = parseInt(scaleInput, 10);
      const clamped = Math.min(64, Math.max(2, val));
      setScale(clamped);
      setScaleInput(String(clamped));
    }
  };

  const handlePreset = (preset: number) => {
    setScale(preset);
    setScaleInput(String(preset));
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-md bg-slate-900 rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-slideUp sm:animate-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              {type === 'copy' ? <Copy className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {type === 'copy' ? '复制歌词海报' : '保存歌词海报'}
              </h3>
              <p className="text-[11px] text-slate-400">选择导出图像采样倍率</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Multiplier Value Display & Manual Input */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <div>
              <span className="text-xs text-slate-400 font-medium">当前采样倍率</span>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {scale >= 32 ? '超高精细度（文件较大）' : scale >= 16 ? '高清标准（推荐）' : '普通标清'}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={scaleInput}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="w-14 h-10 text-center font-sans font-bold text-lg text-sky-400 bg-slate-900 border border-slate-700 rounded-xl outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
              <span className="text-sm font-sans font-bold text-slate-400">x</span>
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>2x（快速）</span>
              <span>64x（超清）</span>
            </div>
            <input
              type="range"
              min={2}
              max={64}
              step={1}
              value={scale}
              onChange={handleSliderChange}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">常用预设</span>
            <div className="grid grid-cols-4 gap-2">
              {[4, 8, 16, 32].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePreset(preset)}
                  className={`py-2 rounded-xl text-xs font-sans transition-all border cursor-pointer ${
                    scale === preset
                      ? 'bg-sky-600/30 border-sky-500 text-sky-300 font-bold'
                      : 'bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(scale)}
            disabled={isExporting}
            className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                {type === 'copy' ? <Copy className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                <span>确定{type === 'copy' ? '复制' : '保存'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
