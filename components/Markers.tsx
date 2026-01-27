import React, { useRef } from 'react';
import { MarkersState, MediaItem } from '../types';
import { Icons } from '../constants';

interface MarkersProps {
  activeSlot: 'a' | 'b' | 'c';
  onSelectSlot: (slot: 'a' | 'b' | 'c') => void;
  markers: MarkersState;
  setMarkers: React.Dispatch<React.SetStateAction<MarkersState>>;
  currentTime: number;
  duration: number;
  activeItem: MediaItem | null;
  onSeek: (time: number) => void;
  onToast: (msg: string, type?: any) => void;
}

const Markers: React.FC<MarkersProps> = ({
  activeSlot, onSelectSlot, markers, setMarkers, currentTime, duration, activeItem, onSeek, onToast
}) => {
  const lastTapRef = useRef<number>(0);

  const handleTap = (slot: 'a' | 'b' | 'c') => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 350;
    lastTapRef.current = now;

    if (isDoubleTap) {
      const m = markers[slot];
      if (m.inTime !== null) {
        onSeek(m.inTime);
        onToast(`JUMP: ${slot.toUpperCase()}`, 'info');
      }
    } else {
      onSelectSlot(slot);
    }
  };

  const handleCopy = (slot: 'a' | 'b' | 'c') => {
    const m = markers[slot];
    if (!m.text) return;
    const clip = `[${formatTime(m.inTime)} - ${formatTime(m.outTime)}] ${m.text}`;
    navigator.clipboard.writeText(clip).then(() => {
      onToast(`COPIED SLOT ${slot.toUpperCase()}`, 'success');
    });
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [lastCompletedSlot, setLastCompletedSlot] = React.useState<'a' | 'b' | 'c' | null>(null);

  const calculateMarkerData = (start: number, end: number) => {
    let extractedText = '';
    if (activeItem?.transcript) {
      let effectiveDuration = duration || activeItem.duration;
      if (!effectiveDuration || effectiveDuration < 1) {
        effectiveDuration = activeItem.transcript.length / 15;
      }

      const sentences = activeItem.transcript.match(/[^\.!\?]+[\.!\?]*/g) || [activeItem.transcript];
      const totalChars = sentences.reduce((acc, s) => acc + s.length, 0);
      let currentPos = 0;
      extractedText = sentences
        .map(s => {
          const sStart = (currentPos / totalChars) * effectiveDuration;
          currentPos += s.length;
          const sEnd = (currentPos / totalChars) * effectiveDuration;
          return { text: s, start: sStart, end: sEnd };
        })
        .filter(s => {
          return Math.max(0, Math.min(s.end, end) - Math.max(s.start, start)) > 0;
        })
        .map(s => s.text).join(' ').trim();
    }
    return extractedText;
  };

  const markIn = () => {
    if (!activeItem) return;
    setMarkers(prev => ({ ...prev, [activeSlot]: { ...prev[activeSlot], inTime: currentTime, outTime: null, text: '' } }));
    onToast(`${activeSlot.toUpperCase()} IN`, 'info');
  };

  const markOut = () => {
    if (!activeItem) return;

    // SCENARIO 1: Currently recording in the active slot?
    if (markers[activeSlot].inTime !== null) {
      let start = markers[activeSlot].inTime!;
      let end = currentTime;
      if (end < start) [start, end] = [end, start];

      const text = calculateMarkerData(start, end);

      setMarkers(prev => ({ ...prev, [activeSlot]: { ...prev[activeSlot], inTime: start, outTime: end, text } }));
      setLastCompletedSlot(activeSlot);
      onToast(`${activeSlot.toUpperCase()} LOCKED`, 'success');
      return;
    }

    // SCENARIO 2: Not recording, but hit OUT -> Extend previous?
    if (lastCompletedSlot) {
      const prevMarker = markers[lastCompletedSlot];
      // Only extend if it exists and has a start time
      if (prevMarker.inTime !== null && prevMarker.outTime !== null) {
        let start = prevMarker.inTime;
        let end = currentTime;
        if (end < start) [start, end] = [end, start]; // Correction if user rewound

        const text = calculateMarkerData(start, end);

        setMarkers(prev => ({ ...prev, [lastCompletedSlot]: { ...prev[lastCompletedSlot], outTime: end, text } }));
        onToast(`EXTENDED ${lastCompletedSlot.toUpperCase()}`, 'success');
      }
    }
  };

  const slotColors = { a: 'bg-rose-600', b: 'bg-blue-600', c: 'bg-amber-500' };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-3 space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600">Markers</h3>
        <div className="flex gap-1.5">
          <button onClick={markIn} className="px-3 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-lg active:scale-95 shadow-lg shadow-emerald-950/20">In</button>
          <button onClick={markOut} className="px-3 py-1 bg-rose-600 text-white text-[9px] font-black uppercase rounded-lg active:scale-95 shadow-lg shadow-rose-950/20">Out</button>
        </div>
      </div>

      <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pb-32">
        {(['a', 'b', 'c'] as const).map(slot => {
          const m = markers[slot];
          const isActive = activeSlot === slot;
          const hasSegment = m.inTime !== null && m.outTime !== null;

          return (
            <div
              key={slot}
              onClick={() => handleTap(slot)}
              className={`p-5 rounded-xl border transition-all cursor-pointer relative group
                ${isActive ? `bg-zinc-900 border-zinc-700/50 shadow-2xl` : 'bg-transparent border-transparent opacity-40 hover:opacity-70'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-red-500 font-black">DEBUG</span>
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-black text-white ${slotColors[slot]}`}>{slot.toUpperCase()}</span>
                  <span className={`text-[9px] mono font-bold ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`}>
                    {formatTime(m.inTime)} {hasSegment ? `— ${formatTime(m.outTime)}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1 transition-all">
                  <button onClick={(e) => { e.stopPropagation(); handleCopy(slot); }} className="px-1.5 py-0.5 bg-emerald-500 text-[9px] font-bold text-white rounded hover:bg-emerald-600 transition-colors" title="Copy Text">
                    FORCE COPY
                  </button>
                  {m.inTime !== null && (
                    <button onClick={(e) => { e.stopPropagation(); setMarkers(prev => ({ ...prev, [slot]: { inTime: null, outTime: null, text: '' } })); }} className="p-1.5 text-zinc-500 hover:text-rose-500 transition-colors">
                      <Icons.Trash />
                    </button>
                  )}
                </div>
              </div>

              <div className={`text-[10px] leading-relaxed mono line-clamp-3 ${hasSegment ? (isActive ? 'text-zinc-300' : 'text-zinc-600') : 'text-zinc-800 italic'}`}>
                {hasSegment ? m.text : (m.inTime !== null ? 'Segment active...' : 'Empty slot')}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[6px] font-black text-zinc-800 uppercase tracking-widest text-center mt-auto py-2">
        v1.2 // OFFLINE
      </p>
    </div>
  );
};

export default Markers;
