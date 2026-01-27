
export interface MediaItem {
  key: string;
  name: string;
  file: File;
  date: number;
  size: number;
  transcript?: string;
  duration?: number;
  resumeTime?: number;
  isUnreadable?: boolean;
  lastModified?: number;
  lastPlayed?: number;
}

export interface Marker {
  inTime: number | null;
  outTime: number | null;
  text: string;
}

export interface MarkersState {
  a: Marker;
  b: Marker;
  c: Marker;
}

export interface SentenceMap {
  text: string;
  start: number;
  end: number;
}
