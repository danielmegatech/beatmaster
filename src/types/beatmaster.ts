export interface Song {
  id: string;
  name: string;
  bpm: number;
  timeSignature: string;
  notes: string;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
}

export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth';

export type SoundTimbre =
  | 'triangle' | 'sine' | 'square' | 'sawtooth'
  | 'woodblock' | 'cowbell' | 'hihat' | 'rim' | 'clave' | 'click';

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
  audioBuffer?: AudioBuffer | null;
  fileName?: string;
}

export type AppMode = 'free' | 'setlist';
