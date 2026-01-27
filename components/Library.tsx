import React, { useState } from 'react';
import { MediaItem } from '../types';
import { Icons } from '../constants';

interface LibraryProps {
  items: MediaItem[];
  activeItem: MediaItem | null;
  onSelect: (item: MediaItem) => void;
  onImport: (files: File[]) => void;
}

type SortBy = 'name' | 'size' | 'date';

import { syncAllUp, syncLibraryDown, initAuth } from '../services/firebase';

const Library: React.FC<LibraryProps> = ({ items, activeItem, onSelect, onImport }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Connecting...');
    try {
      const user = await initAuth();
      if (!user) {
        setSyncStatus('Auth Failed');
        setTimeout(() => setSyncStatus(''), 2000);
        setIsSyncing(false);
        return;
      }

      setSyncStatus('Syncing Up...');
      const uploaded = await syncAllUp();

      setSyncStatus('Syncing Down...');
      const downloaded = await syncLibraryDown();

      setSyncStatus('Done!');
      if (downloaded) {
        // Force reload if new data came in
        setTimeout(() => location.reload(), 1000);
      }
    } catch (e) {
      console.error(e);
      setSyncStatus('Error');
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncStatus('');
      }, 2000);
    }
  };

  const filteredItems = items
    .filter(item => item.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, undefined, { numeric: true });
      if (sortBy === 'size') return b.size - a.size;
      if (sortBy === 'date') return (b.date || 0) - (a.date || 0);
      return 0;
    });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImport(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const SortButton = ({ type, label }: { type: SortBy, label: string }) => (
    <button
      onClick={() => setSortBy(type)}
      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${sortBy === type ? 'bg-zinc-800 text-white border-zinc-700' : 'text-zinc-600 border-transparent hover:text-zinc-400 hover:bg-zinc-900'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="p-4 border-b border-zinc-800 space-y-4 shrink-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Sync Manager</h3>
            {syncStatus && <span className="text-[9px] font-bold text-emerald-500 animate-pulse">{syncStatus}</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col items-center justify-center gap-1.5 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer transition-all active:scale-95 shadow-xl shadow-rose-950/20">
              <Icons.Folder />
              <span className="text-[9px] font-black uppercase tracking-widest">Load Folder</span>
              {/* @ts-ignore */}
              <input type="file" className="hidden" multiple webkitdirectory="true" onChange={handleInput} />
            </label>
            <label className="flex flex-col items-center justify-center gap-1.5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl cursor-pointer transition-all active:scale-95 border border-zinc-700">
              <Icons.File />
              <span className="text-[9px] font-black uppercase tracking-widest">Load Files</span>
              <input type="file" className="hidden" multiple onChange={handleInput} />
            </label>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all active:scale-95 mt-2 flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
            )}
            {isSyncing ? 'Syncing...' : 'Cloud Sync v2'}
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search assets..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-[10px] font-bold placeholder:text-zinc-700 focus:outline-none focus:border-rose-500 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex items-center justify-between px-1">
            <span className="text-[8px] font-black uppercase text-zinc-700 tracking-widest">Sort Inventory</span>
            <div className="flex gap-1.5">
              <SortButton type="name" label="AZ" />
              <SortButton type="date" label="New" />
              <SortButton type="size" label="Size" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar">
        {filteredItems.length > 0 ? (
          <div className="space-y-1">
            {filteredItems.map(item => {
              const isActive = activeItem?.key === item.key;
              const isVideo = !item.file.type.startsWith('audio') && !/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(item.name);

              return (
                <button
                  key={item.key}
                  onClick={() => onSelect(item)}
                  className={`w-full text-left p-3 flex items-center gap-3 rounded-xl transition-all border
                    ${isActive
                      ? 'bg-rose-600 border-rose-500 text-white shadow-lg'
                      : 'bg-zinc-950/20 border-transparent hover:bg-zinc-800 text-zinc-400'}`}
                >
                  <div className={`shrink-0 p-1.5 rounded-lg ${isActive ? 'bg-rose-500' : 'bg-zinc-800'}`}>
                    {isVideo ? <Icons.Folder /> : <Icons.File />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`text-[10px] font-bold truncate ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                      {item.name}
                    </h4>
                    <span className={`text-[8px] mono font-bold opacity-40 uppercase ${isActive ? 'text-rose-200' : ''}`}>
                      {(item.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-zinc-800 opacity-20">
            <Icons.Folder />
            <p className="text-[8px] font-black uppercase tracking-widest mt-2">No Assets Locally Cached</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
