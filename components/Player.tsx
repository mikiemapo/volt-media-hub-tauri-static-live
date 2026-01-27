
import React, { useRef, useEffect, useState } from 'react';
import { MediaItem } from '../types';
import { Icons } from '../constants';

interface PlayerProps {
  item: MediaItem | null;
  isPlaying: boolean;
  onPlayPause: (playing: boolean) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  currentTime: number;
  duration: number;
}

const Player: React.FC<PlayerProps> = ({ 
  item, isPlaying, onPlayPause, onTimeUpdate, onDurationChange, currentTime, duration 
}) => {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [isAudioOnly, setIsAudioOnly] = useState(true);

  useEffect(() => {
    if (!item) return;
    const isAudio = item.file.type.startsWith('audio') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(item.name);
    setIsAudioOnly(isAudio);

    if (mediaRef.current) {
      if (item.key === 'demo-sample') {
        // Special case for demo item (no real source)
        mediaRef.current.src = "";
        onDurationChange(180); // Simulate 3 mins
      } else {
        const url = URL.createObjectURL(item.file);
        mediaRef.current.src = url;
        return () => URL.revokeObjectURL(url);
      }
      onPlayPause(false);
    }
  }, [item, onPlayPause]);

  useEffect(() => {
    if (mediaRef.current && mediaRef.current.src) {
      if (isPlaying) mediaRef.current.play().catch(() => onPlayPause(false));
      else mediaRef.current.pause();
    }
  }, [isPlaying, onPlayPause]);

  useEffect(() => {
    if (mediaRef.current && Math.abs(mediaRef.current.currentTime - currentTime) > 0.5) {
      mediaRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!item) return null;

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 flex flex-col shrink-0">
      {!isAudioOnly && (
        <div className="relative bg-black flex items-center justify-center overflow-hidden aspect-video max-h-[25vh] md:max-h-[35vh]">
          <video 
            ref={mediaRef as any} 
            className="w-full h-full object-contain cursor-pointer" 
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)} 
            onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)} 
            onClick={() => onPlayPause(!isPlaying)} 
          />
        </div>
      )}

      {isAudioOnly && (
        <audio 
          ref={mediaRef as any} 
          className="hidden" 
          onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)} 
          onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)} 
        />
      )}

      <div className="px-4 py-3 md:px-8 bg-zinc-900 shadow-2xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onPlayPause(!isPlaying)} 
            className="w-10 h-10 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
          >
            {isPlaying ? <Icons.Pause /> : <Icons.Play />}
          </button>
          
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black text-zinc-300 mono">{formatTime(currentTime)} <span className="text-zinc-700">/ {formatTime(duration)}</span></span>
              <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{item.name.substring(0, 20)}...</span>
            </div>
            <div className="relative h-1 bg-zinc-800 rounded-full overflow-hidden">
               <div className="h-full bg-rose-500 transition-all duration-100" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
               <input 
                type="range" 
                min={0} 
                max={duration || 100} 
                step={0.1} 
                value={currentTime} 
                onChange={(e) => { 
                  const t = parseFloat(e.target.value); 
                  onTimeUpdate(t); 
                  if(mediaRef.current) mediaRef.current.currentTime = t; 
                }} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
