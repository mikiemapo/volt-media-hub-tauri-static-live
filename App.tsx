
import React, { useState, useEffect, useCallback } from 'react';
import { MediaItem, MarkersState } from './types';
import { getAllMediaItems, saveMediaItem, clearLibraryStorage } from './services/storage';
import { Icons, MEDIA_EXTENSIONS } from './constants';
import Library from './components/Library';
import Player from './components/Player';
import Markers from './components/Markers';
import Transcript from './components/Transcript';



const App: React.FC = () => {
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null);
  const [activeSlot, setActiveSlot] = useState<'a' | 'b' | 'c'>('a');
  const [markers, setMarkers] = useState<MarkersState>({
    a: { inTime: null, outTime: null, text: '' },
    b: { inTime: null, outTime: null, text: '' },
    c: { inTime: null, outTime: null, text: '' }
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [view, setView] = useState<'player' | 'library'>('library');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      switch (e.key.toLowerCase()) {
        case ' ': e.preventDefault(); setIsPlaying(prev => !prev); break;
        case 'arrowleft': setCurrentTime(prev => Math.max(0, prev - 5)); break;
        case 'arrowright': setCurrentTime(prev => Math.min(duration, prev + 5)); break;
        case 'a': setActiveSlot('a'); break;
        case 'b': setActiveSlot('b'); break;
        case 'c': setActiveSlot('c'); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [duration]);

  useEffect(() => {
    if (activeItem) {
      const saved = localStorage.getItem(`markers_${activeItem.key}`);
      setMarkers(saved ? JSON.parse(saved) : {
        a: { inTime: null, outTime: null, text: '' },
        b: { inTime: null, outTime: null, text: '' },
        c: { inTime: null, outTime: null, text: '' }
      });
    }
  }, [activeItem]);

  useEffect(() => {
    if (activeItem) {
      localStorage.setItem(`markers_${activeItem.key}`, JSON.stringify(markers));
    }
  }, [markers, activeItem]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleImport = async (files: File[]) => {
    setIsImporting(true);
    setImportProgress(0);
    const textFiles: Record<string, File> = {};
    const potentialMediaFiles: File[] = [];

    const getFileKey = (filename: string) => {
      let key = filename.split('/').pop() || filename;
      const lastDot = key.lastIndexOf('.');
      key = lastDot > 0 ? key.substring(0, lastDot) : key;
      return key.replace(/\(transcribed\)$/i, '').toLowerCase().replace(/[_\s]+/g, ' ').trim();
    };

    for (const f of files) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext === 'txt') textFiles[getFileKey(f.name)] = f;
      else if (ext && MEDIA_EXTENSIONS.includes(ext)) potentialMediaFiles.push(f);
    }

    const matches = potentialMediaFiles.filter(mf => !!textFiles[getFileKey(mf.name)]);
    const filesToImport = matches;

    if (filesToImport.length === 0) {
      showToast('No matching pairs found. Select both audio and transcript files.', 'error');
      setIsImporting(false);
      return;
    }

    const newItems: MediaItem[] = [];
    for (let i = 0; i < filesToImport.length; i++) {
      const mf = filesToImport[i];
      const key = getFileKey(mf.name);
      // Strict pairing means textFiles[key] is guaranteed by the filter above
      const transcript = await textFiles[key].text();
      const item: MediaItem = { key, name: mf.name, file: mf, date: mf.lastModified, size: mf.size, transcript };
      await saveMediaItem(item);
      newItems.push(item);
      setImportProgress(Math.round(((i + 1) / filesToImport.length) * 100));
    }

    setLibrary(prev => {
      const combined = [...prev, ...newItems];
      const seen = new Set();
      return combined.filter(item => {
        const duplicate = seen.has(item.key);
        seen.add(item.key);
        return !duplicate;
      });
    });

    setIsImporting(false);
    showToast(`${newItems.length} paired items synced.`, 'success');
  };

  useEffect(() => {
    getAllMediaItems().then(items => {
      if (items.length > 0) {
        setLibrary(items);
        setActiveItem(items[0]);
      }
    });
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 overflow-hidden text-zinc-100 font-sans selection:bg-rose-500/30">
      <header className="flex items-center justify-between px-4 pt-14 md:pt-6 pb-3 bg-zinc-900 border-b border-zinc-800 shrink-0 z-50 shadow-lg sticky top-0">
        <button
          onClick={() => setView('library')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${view === 'library' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <div className={`p-1 rounded ${view === 'library' ? 'bg-rose-600' : 'bg-zinc-800 group-hover:bg-zinc-700'}`}>
            <Icons.Folder />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Library</span>
        </button>

        <h1 className="absolute left-1/2 -translate-x-1/2 font-black text-sm md:text-base tracking-tighter uppercase pointer-events-none opacity-80">
          AZ-104 <span className="text-rose-500">Hub</span>
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('player')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${view === 'player' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Player</span>
            <div className={`p-1.5 rounded ${view === 'player' ? 'bg-rose-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
              <Icons.Play />
            </div>
          </button>

          <div className="w-px h-6 bg-zinc-800 mx-1" />

          <button onClick={() => { if (confirm('Purge library?')) clearLibraryStorage().then(() => location.reload()); }} className="p-2 text-zinc-700 hover:text-rose-500 transition-colors">
            <Icons.Trash />
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        <aside className={`${view === 'library' ? 'flex w-full absolute inset-0 z-40 md:relative md:w-[280px]' : 'hidden md:flex md:w-[280px]'} border-r border-zinc-800 bg-zinc-900 flex-col shrink-0 transition-all`}>
          <Library items={library} activeItem={activeItem} onSelect={(item) => { setActiveItem(item); setView('player'); }} onImport={handleImport} />
        </aside>

        <section className={`${view === 'player' ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-zinc-950 overflow-hidden`}>
          <Player item={activeItem} isPlaying={isPlaying} onPlayPause={setIsPlaying} onTimeUpdate={setCurrentTime} onDurationChange={setDuration} currentTime={currentTime} duration={duration} />

          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 relative">
              <Transcript
                text={activeItem?.transcript}
                currentTime={currentTime}
                duration={duration}
                onSeek={setCurrentTime}
                markers={markers}
              />
            </div>

            <div className="w-full md:w-[200px] h-[45%] md:h-auto flex flex-col min-h-0 bg-zinc-900/60 shrink-0 border-l border-zinc-900 shadow-2xl">
              <Markers activeSlot={activeSlot} onSelectSlot={setActiveSlot} markers={markers} setMarkers={setMarkers} currentTime={currentTime} duration={duration} activeItem={activeItem} onSeek={setCurrentTime} onToast={showToast} />
            </div>
          </div>
        </section>
      </main>

      {isImporting && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
          <div className="w-full max-w-xs space-y-6 animate-pulse">
            <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-white">Syncing Workspace</h3>
            <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-600 transition-all" style={{ width: `${importProgress}%` }} />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full shadow-2xl z-[110] animate-in slide-in-from-bottom duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : 'bg-zinc-100 text-zinc-950'} text-[9px] font-black uppercase tracking-[0.2em]`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default App;
