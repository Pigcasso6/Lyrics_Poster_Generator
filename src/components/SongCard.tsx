import React, { useState } from 'react';
import { Image as ImageIcon, Disc } from 'lucide-react';
import { Song } from '../types';
import { generateVinylCoverSvg } from '../utils/cover';

interface SongCardProps {
  song: Song;
  onSelect: (song: Song) => void;
  isSelected?: boolean;
}

export const SongCard: React.FC<SongCardProps> = ({ song, onSelect, isSelected }) => {
  const [imgError, setImgError] = useState(false);

  // Fallback vinyl image if cover fails
  const coverSrc = imgError || !song.albumCover
    ? generateVinylCoverSvg(song.name, song.artist)
    : song.albumCover;

  return (
    <div
      id={`song-card-${song.platform}-${song.id}`}
      onClick={() => onSelect(song)}
      className={`group relative flex items-center gap-3.5 p-3 sm:p-3.5 rounded-2xl bg-white border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-sky-500 shadow-md ring-2 ring-sky-500/20 bg-sky-50/20'
          : 'border-slate-200/80 hover:border-sky-300 hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      {/* Full Album Cover Thumbnail (Clean without corner badge) */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 shadow-xs border border-slate-100">
        <img
          src={coverSrc}
          alt={song.name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 block"
          loading="lazy"
        />

        {/* Hover image overlay */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-white/90 text-sky-600 flex items-center justify-center shadow-sm">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Song Information */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-colors">
            {song.name}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-slate-600 overflow-hidden">
          <span className="font-medium text-slate-800 shrink-0 max-w-[70%] truncate">{song.artist}</span>
          {song.album && (
            <>
              <span className="text-slate-300 shrink-0">•</span>
              <span className="text-slate-500 truncate flex items-center gap-1 text-xs sm:text-sm shrink min-w-0">
                <Disc className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{song.album}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
