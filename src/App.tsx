import React, { useState, useCallback } from 'react';
import { SearchBar } from './components/SearchBar';
import { SongList } from './components/SongList';
import { LyricsModal } from './components/LyricsModal';
import { Song, PlatformType, SearchResponse } from './types';
import { searchMusic } from './services/api';

export default function App() {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activePlatform, setActivePlatform] = useState<PlatformType>('qq');
  const [neteaseResults, setNeteaseResults] = useState<Song[]>([]);
  const [qqResults, setQqResults] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Perform search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setKeyword(query);
    setLoading(true);
    setHasSearched(true);

    try {
      const data: SearchResponse = await searchMusic(query);
      setNeteaseResults(data.netease || []);
      setQqResults(data.qq || []);
    } catch (err) {
      console.error('Search request error:', err);
      setNeteaseResults([]);
      setQqResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // When a song is clicked from list
  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setIsModalOpen(true);
  };

  // Compute active songs for current selected platform
  const displayedSongs = activePlatform === 'qq' ? qqResults : neteaseResults;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 pb-16">
        {/* Top Search Area */}
        <SearchBar
          keyword={keyword}
          onSearch={handleSearch}
          loading={loading}
          activePlatform={activePlatform}
          onPlatformChange={setActivePlatform}
          neteaseCount={neteaseResults.length}
          qqCount={qqResults.length}
        />

        {/* Results List or Empty Prompt */}
        <SongList
          songs={displayedSongs}
          loading={loading}
          activePlatform={activePlatform}
          selectedSong={selectedSong}
          onSelectSong={handleSelectSong}
          keyword={keyword}
          hasSearched={hasSearched}
        />
      </main>

      {/* Full Lyrics & Poster Studio Modal */}
      {isModalOpen && selectedSong && (
        <LyricsModal
          song={selectedSong}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
