import React from 'react';
import { Song, PlatformType } from '../types';
import { SongCard } from './SongCard';
import { Disc3, Search, Music } from 'lucide-react';

interface SongListProps {
  songs: Song[];
  loading: boolean;
  activePlatform: PlatformType;
  selectedSong: Song | null;
  onSelectSong: (song: Song) => void;
  keyword: string;
  hasSearched: boolean;
}

export const SongList: React.FC<SongListProps> = ({
  songs,
  loading,
  activePlatform,
  selectedSong,
  onSelectSong,
  keyword,
  hasSearched,
}) => {
  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto py-8">
        <div className="flex items-center justify-center gap-3 text-slate-500 mb-6">
          <Disc3 className="w-5 h-5 animate-spin text-sky-600" />
          <span className="text-sm font-medium">正在检索「{keyword}」...</span>
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/60 animate-pulse">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-200 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Not searched yet (initial state)
  if (!hasSearched) {
    return (
      <div className="w-full max-w-md mx-auto py-20 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-50 text-sky-500 mb-3 border border-sky-100/80">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-700 mb-1">在上方搜索歌曲</h3>
        <p className="text-xs text-slate-400">
          输入歌名、歌手或专辑名开始制作歌词海报
        </p>
      </div>
    );
  }

  // Empty state when search returns nothing
  if (hasSearched && songs.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto py-16 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mb-3">
          <Music className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">未找到相关歌曲</h3>
        <p className="text-xs text-slate-500">
          未检索到关于「{keyword}」的曲目，建议尝试更换关键词重新搜索。
        </p>
      </div>
    );
  }

  // Display results of the currently selected platform
  return (
    <div id="songs-results-container" className="w-full max-w-5xl mx-auto py-2 space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              activePlatform === 'qq' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          ></span>
          {activePlatform === 'qq' ? 'QQ音乐' : '网易云音乐'}
          <span className="text-slate-400 font-normal">（{songs.length} 首）</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {songs.map((song) => (
          <SongCard
            key={`${song.platform}-${song.id}`}
            song={song}
            onSelect={onSelectSong}
            isSelected={selectedSong?.id === song.id && selectedSong?.platform === song.platform}
          />
        ))}
      </div>
    </div>
  );
};
