import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, X } from 'lucide-react';
import { PosterConfig, PosterFont } from '../types';

interface TypographyModalProps {
  config: PosterConfig;
  onChange: React.Dispatch<React.SetStateAction<PosterConfig>>;
  onClose: () => void;
  fontOptions: Array<{ id: PosterFont; name: string }>;
}

export const TypographyModal: React.FC<TypographyModalProps> = ({
  config,
  onChange,
  onClose,
  fontOptions,
}) => {
  return (
    <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full sm:max-w-lg bg-slate-900 rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-slideUp sm:animate-none">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <h3 className="text-sm font-bold text-white">字体与对齐设置</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 overflow-y-auto">
          {/* 1. 歌词 */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
            <div className="flex items-center justify-between h-7">
              <span className="text-xs font-semibold text-slate-300">歌词</span>
              <div className="flex items-center gap-1.5">
                {/* Lyric Align */}
                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, lyricAlign: 'left' }))}
                    className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                      config.lyricAlign === 'left' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="歌词左对齐"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, lyricAlign: 'center' }))}
                    className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                      config.lyricAlign === 'center' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="歌词居中对齐"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, lyricAlign: 'right' }))}
                    className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                      config.lyricAlign === 'right' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="歌词右对齐"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Standalone Bold */}
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, lyricBold: !prev.lyricBold }))}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                    config.lyricBold
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="歌词加粗"
                >
                  B
                </button>

                {/* Standalone Italic */}
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, lyricItalic: !prev.lyricItalic }))}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border italic font-serif text-xs transition-colors cursor-pointer ${
                    config.lyricItalic
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
                value={config.lyricFont}
                onChange={(e) => onChange((prev) => ({ ...prev, lyricFont: e.target.value as PosterFont }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer"
              >
                {fontOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. 翻译 */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
            <div className="flex items-center justify-between h-7">
              <span className="text-xs font-semibold text-slate-300">翻译</span>
              <div className="flex items-center gap-1.5">
                {/* Standalone Bold */}
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, translationBold: !prev.translationBold }))}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                    config.translationBold
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="翻译加粗"
                >
                  B
                </button>

                {/* Standalone Italic */}
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, translationItalic: !prev.translationItalic }))}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border italic font-serif text-xs transition-colors cursor-pointer ${
                    config.translationItalic
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
                value={config.translationFont}
                onChange={(e) => onChange((prev) => ({ ...prev, translationFont: e.target.value as PosterFont }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer"
              >
                {fontOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. 歌名与歌手 */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
            <div className="flex items-center justify-between h-7">
              <span className="text-xs font-semibold text-slate-300">歌名与歌手</span>
              <div className="flex items-center gap-1.5">
                {/* Info Align */}
                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, infoAlign: 'left' }))}
                    className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                      config.infoAlign === 'left' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="歌曲信息左对齐"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, infoAlign: 'center' }))}
                    className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                      config.infoAlign === 'center' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="歌曲信息居中对齐"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, infoAlign: 'right' }))}
                    className={`w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
                      config.infoAlign === 'right' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="歌曲信息右对齐"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Standalone Bold */}
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, infoBold: !prev.infoBold }))}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                    config.infoBold
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="歌名与歌手加粗"
                >
                  B
                </button>

                {/* Standalone Italic */}
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, infoItalic: !prev.infoItalic }))}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border italic font-serif text-xs transition-colors cursor-pointer ${
                    config.infoItalic
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="歌名与歌手斜体"
                >
                  I
                </button>
              </div>
            </div>

            <div>
              <select
                value={config.infoFont}
                onChange={(e) => onChange((prev) => ({ ...prev, infoFont: e.target.value as PosterFont }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer"
              >
                {fontOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. 心情随笔 */}
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-850">
            <div className="flex items-center justify-between h-7">
              <span className="text-xs font-semibold text-slate-300">心情随笔</span>
              <div className="flex items-center gap-1.5">
                {/* Quote Style */}
                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, quoteStyle: 'corner' }))}
                    className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-normal transition-colors cursor-pointer ${
                      config.quoteStyle === 'corner' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="直角引号「」"
                  >
                    「」
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, quoteStyle: 'curly' }))}
                    className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-normal transition-colors cursor-pointer ${
                      config.quoteStyle === 'curly' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="弯引号“”"
                  >
                    “”
                  </button>
                </div>

                {/* Standalone Bold */}
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, quoteBold: !prev.quoteBold }))}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border font-bold text-xs transition-colors cursor-pointer ${
                    config.quoteBold
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="心情随笔加粗"
                >
                  B
                </button>

                {/* Standalone Italic */}
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, quoteItalic: !prev.quoteItalic }))}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border italic font-serif text-xs transition-colors cursor-pointer ${
                    config.quoteItalic
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
                value={config.quoteFont}
                onChange={(e) => onChange((prev) => ({ ...prev, quoteFont: e.target.value as PosterFont }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-sky-500 cursor-pointer"
              >
                {fontOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            完成设置
          </button>
        </div>
      </div>
    </div>
  );
};
