import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Icons } from '../constants';
import { MarkersState } from '../types';

interface TranscriptProps {
  text?: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  markers: MarkersState;
  searchQuery?: string;
}

const Transcript: React.FC<TranscriptProps> = ({ text, currentTime, duration, onSeek, markers, searchQuery }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollTimeoutRef = useRef<any>(null);
  const lastTimeRef = useRef(currentTime);

  const sentences = useMemo(() => {
    if (!text) return [];
    const rawSentences = text.match(/[^\.!\?]+[\.!\?]*/g) || [text];
    const totalChars = rawSentences.reduce((acc, s) => acc + s.length, 0);
    let currentPos = 0;

    const displayDuration = duration || 300;

    return rawSentences.map(s => {
      const start = (currentPos / totalChars) * displayDuration;
      currentPos += s.length;
      const end = (currentPos / totalChars) * displayDuration;
      return { text: s.trim(), start, end };
    });
  }, [text, duration]);

  const activeIndex = useMemo(() => {
    if (!duration) return -1;
    return sentences.findIndex(s => currentTime >= s.start && currentTime < s.end);
  }, [sentences, currentTime, duration]);

  useEffect(() => {
    const delta = Math.abs(currentTime - lastTimeRef.current);
    if (delta > 1.5) setAutoScroll(true);
    lastTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (autoScroll && activeIndex !== -1 && containerRef.current) {
      const activeEl = containerRef.current.querySelector(`#sent-${activeIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeIndex, autoScroll]);

  const handleUserScroll = () => {
    if (autoScroll) {
      setAutoScroll(false);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setAutoScroll(true), 3000);
    }
  };

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const highlightText = (content: string, query?: string) => {
    if (!query || query.trim() === '') return content;
    const parts = content.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-rose-500/80 text-white font-black px-1 rounded-sm shadow-[0_0_15px_rgba(225,29,72,0.5)]">
          {part}
        </span>
      ) : part
    );
  };

  const getMarkerClass = (sentenceStart: number, sentenceEnd: number) => {
    const isA = markers.a.inTime !== null && markers.a.outTime !== null && sentenceEnd > markers.a.inTime && sentenceStart < markers.a.outTime;
    const isB = markers.b.inTime !== null && markers.b.outTime !== null && sentenceEnd > markers.b.inTime && sentenceStart < markers.b.outTime;
    const isC = markers.c.inTime !== null && markers.c.outTime !== null && sentenceEnd > markers.c.inTime && sentenceStart < markers.c.outTime;

    if (isA) return 'border-rose-500/50 bg-rose-600/20 text-white shadow-[0_0_20px_rgba(225,29,72,0.1)]';
    if (isB) return 'border-blue-500/50 bg-blue-600/20 text-white shadow-[0_0_20px_rgba(59,130,246,0.1)]';
    if (isC) return 'border-amber-500/50 bg-amber-500/20 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.1)]';
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden relative">
      <div className="px-6 py-3 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${text ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-zinc-800'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Analysis Feed</span>
          </div>
          {text && !autoScroll && (
            <button
              onClick={() => setAutoScroll(true)}
              className="text-[8px] font-black bg-white text-zinc-950 px-3 py-1 rounded-full uppercase hover:bg-rose-500 hover:text-white transition-all shadow-xl active:scale-95"
            >
              Resume Follow
            </button>
          )}
        </div>
      </div>

      <div
        ref={containerRef} onWheel={handleUserScroll} onTouchMove={handleUserScroll}
        className="flex-1 overflow-y-auto p-12 md:p-20 custom-scrollbar scroll-smooth"
      >
        {!text ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-900 space-y-6">
            <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-[2rem] flex items-center justify-center opacity-50 shadow-2xl">
              <div className="animate-spin text-rose-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600">Loading Text Feed...</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-800 italic">Verifying segment integrity</p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto pb-64 space-y-2">
            {sentences.map((s, i) => {
              const isActive = activeIndex === i;
              const markerClass = getMarkerClass(s.start, s.end);
              return (
                <span
                  key={i} id={`sent-${i}`}
                  onClick={() => { onSeek(s.start); setAutoScroll(true); }}
                  className={`inline-block mr-2 mb-2 px-4 py-2.5 rounded-2xl cursor-pointer transition-all duration-300 text-lg md:text-xl border
                    ${isActive && !markerClass ? 'text-white bg-zinc-900 border-zinc-700 font-bold scale-[1.02] shadow-2xl z-10' : ''}
                    ${markerClass ? `font-bold ${markerClass} ${isActive ? 'scale-[1.04] ring-2 ring-white/20' : ''}` : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/40'}`}
                >
                  {highlightText(s.text, searchQuery)}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transcript;
