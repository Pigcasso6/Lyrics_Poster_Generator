import React from 'react';
import { CheckSquare, Square, RefreshCw, X } from 'lucide-react';
import { LyricLine } from '../types';

interface LyricPickerModalProps {
  lyrics: LyricLine[];
  selectedLines: LyricLine[];
  onToggleLine: (line: LyricLine) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  loading: boolean;
  onClose: () => void;
}

export const LyricPickerModal: React.FC<LyricPickerModalProps> = ({
  lyrics,
  selectedLines,
  onToggleLine,
  onSelectAll,
  onClearAll,
  loading,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-lg bg-slate-900 rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-slideUp sm:animate-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">挑选歌词</h3>
            <span className="text-[11px] text-slate-400 font-mono">
              （已选 {selectedLines.length}/{lyrics.length}）
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
            >
              全选
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
            >
              清空
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 ml-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lyric List */}
        <div className="p-4 overflow-y-auto space-y-1.5 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2 text-slate-400">
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
                  onClick={() => onToggleLine(line)}
                  className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-sky-600/20 border-sky-500/60 text-white'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 text-slate-300'
                  }`}
                >
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
            <div className="text-center py-12 text-slate-500 text-xs">暂未检索到歌词</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
