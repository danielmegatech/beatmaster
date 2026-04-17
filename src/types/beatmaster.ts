export interface Song {
  id: string;
  name: string;
  artist?: string;
  bpm: number;
  timeSignature: string;
  duration?: number; // duration in seconds
  notes: string;
  isPause?: boolean;
  coverArt?: string; // URL to album cover art
  album?: string;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  band?: string; // Band/group this playlist belongs to
}

export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth';

export type SoundTimbre =
  | 'triangle' | 'sine' | 'square' | 'sawtooth'
  | 'woodblock' | 'cowbell' | 'hihat' | 'rim' | 'clave' | 'click';

export type PadMode = 'sampler' | 'loop';

export interface MetronomeSettings {
  bpm: number;
  timeSignature: string;
  subdivision: Subdivision;
  sound: SoundTimbre;
  volume: number;
  pan: number;
}

export interface PadConfig {
  id: number;
  name: string;
  volume: number;
  pan: number;
  mode: PadMode;
  audioBuffer?: AudioBuffer | null;
  fileName?: string;
  audioUrl?: string;
}

export type AppMode = 'free' | 'setlist';
