import React, { useState, useEffect } from 'react';
import { Search, X, History, Disc3 } from 'lucide-react';
import { PlatformType } from '../types';

interface SearchBarProps {
  keyword: string;
  onSearch: (query: string) => void;
  loading: boolean;
  activePlatform: PlatformType;
  onPlatformChange: (p: PlatformType) => void;
  neteaseCount: number;
  qqCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  keyword,
  onSearch,
  loading,
  activePlatform,
  onPlatformChange,
  neteaseCount,
  qqCount,
}) => {
  const [inputValue, setInputValue] = useState(keyword);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('music_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setInputValue(keyword);
  }, [keyword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const trimmed = inputValue.trim();
    saveRecent(trimmed);
    onSearch(trimmed);
  };

  const handleTagClick = (tag: string) => {
    setInputValue(tag);
    saveRecent(tag);
    onSearch(tag);
  };

  const saveRecent = (term: string) => {
    setRecentSearches((prev) => {
      const next = [term, ...prev.filter((t) => t !== term)].slice(0, 8);
      try {
        localStorage.setItem('music_recent_searches', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('music_recent_searches');
    } catch {}
  };

  return (
    <div id="search-section" className="w-full max-w-5xl mx-auto space-y-3.5">
      {/* Search Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center shadow-md shadow-slate-200/50 rounded-2xl bg-white border border-slate-200 hover:border-sky-300 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10 transition-all"
      >
        <div className="pl-4 sm:pl-5 text-slate-400 flex items-center">
          <Search className={`w-5 h-5 ${loading ? 'animate-pulse text-sky-500' : ''}`} />
        </div>

        <input
          id="music-search-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="搜索歌曲、歌手、专辑"
          className="w-full py-3.5 sm:py-4 pl-3 pr-10 text-slate-800 placeholder-slate-400 bg-transparent text-base sm:text-lg outline-none font-medium"
        />

        {inputValue && (
          <button
            type="button"
            id="clear-search-btn"
            onClick={() => setInputValue('')}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors mr-1 cursor-pointer"
            title="清空"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="pr-2 sm:pr-2.5 shrink-0">
          <button
            type="submit"
            id="submit-search-btn"
            disabled={loading || !inputValue.trim()}
            className="flex items-center justify-center gap-1.5 px-6 sm:px-8 py-2.5 sm:py-3 bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white font-medium text-sm sm:text-base rounded-xl shadow-sm shadow-sky-600/20 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer whitespace-nowrap shrink-0 min-w-[88px]"
          >
            {loading ? (
              <>
                <Disc3 className="w-4 h-4 animate-spin shrink-0" />
                <span className="whitespace-nowrap">搜索中</span>
              </>
            ) : (
              <span className="whitespace-nowrap">搜索</span>
            )}
          </button>
        </div>
      </form>

      {/* Platform Tabs & Recent Search History in one row (Tabs left, History right, max 5 items) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-0.5">
        {/* Left: Exclusive Platform Tabs (50% each on mobile) */}
        <div className="grid grid-cols-2 sm:flex sm:items-center w-full sm:w-auto gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 text-sm font-medium shrink-0">
          {/* QQ Music Tab First */}
          <button
            type="button"
            id="tab-qq-platform"
            onClick={() => onPlatformChange('qq')}
            className={`w-full sm:w-auto px-4 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePlatform === 'qq'
                ? 'bg-white text-emerald-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0"></span>
            <span className="truncate">QQ音乐</span>
            {qqCount > 0 && (
              <span className="text-xs px-1.5 py-0.2 bg-emerald-50 text-emerald-600 rounded-full font-mono shrink-0">
                {qqCount}
              </span>
            )}
          </button>

          {/* NetEase Tab Second */}
          <button
            type="button"
            id="tab-netease-platform"
            onClick={() => onPlatformChange('netease')}
            className={`w-full sm:w-auto px-4 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePlatform === 'netease'
                ? 'bg-white text-red-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-red-600 hover:bg-red-50/50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block shrink-0"></span>
            <span className="truncate">网易云音乐</span>
            {neteaseCount > 0 && (
              <span className="text-xs px-1.5 py-0.2 bg-red-50 text-red-600 rounded-full font-mono shrink-0">
                {neteaseCount}
              </span>
            )}
          </button>
        </div>

        {/* Right: Recent Search History (At most 5 items) */}
        {recentSearches.length > 0 && (
          <div className="flex items-center justify-start sm:justify-end gap-1.5 text-xs text-slate-500 flex-wrap overflow-hidden">
            <span className="flex items-center gap-1 text-slate-400 shrink-0">
              <History className="w-3 h-3" />
              <span>历史搜索：</span>
            </span>
            {recentSearches.slice(0, 5).map((term) => (
              <button
                key={term}
                type="button"
                id={`recent-tag-${term}`}
                onClick={() => handleTagClick(term)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200/80 text-slate-600 rounded-md text-xs transition-colors cursor-pointer max-w-[120px] truncate"
              >
                {term}
              </button>
            ))}
            <button
              type="button"
              id="clear-recent-searches-btn"
              onClick={clearRecent}
              className="text-slate-400 hover:text-slate-600 text-[11px] underline ml-0.5 cursor-pointer shrink-0"
            >
              清空
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
