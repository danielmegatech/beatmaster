import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause, Minus, Plus, Hand, ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import BeatIndicator from './BeatIndicator';
import type { Subdivision, SoundTimbre } from '@/types/beatmaster';
import { cn } from '@/lib/utils';

interface MetronomeProps {
  isPlaying: boolean;
  bpm: number;
  setBpm: (v: number) => void;
  timeSignature: string;
  setTimeSignature: (v: string) => void;
  subdivision: Subdivision;
  setSubdivision: (v: Subdivision) => void;
  sound: SoundTimbre;
  setSound: (v: SoundTimbre) => void;
  volume: number;
  setVolume: (v: number) => void;
  pan: number;
  setPan: (v: number) => void;
  currentBeat: number;
  beatsPerMeasure: number;
  toggle: () => void;
  tapTempo: () => void;
  countIn: boolean;
  setCountIn: (v: boolean) => void;
  isCountingIn: boolean;
}

const timeSignatures = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '7/4', '9/8', '12/8', '13/8'];
const subdivisions: { value: Subdivision; label: string; short: string }[] = [
  { value: 'quarter', label: '♩ Quarter', short: '♩' },
  { value: 'eighth', label: '♪♪ Eighth', short: '♪♪' },
  { value: 'triplet', label: '♪♪♪ Triplet', short: '♪³' },
  { value: 'sixteenth', label: '♬♬ 16th', short: '♬♬' },
];
const sounds: SoundTimbre[] = ['click', 'triangle', 'sine', 'square', 'sawtooth', 'woodblock', 'cowbell', 'hihat', 'rim', 'clave'];

const soundEmojis: Record<SoundTimbre, string> = {
  click: '🔘', triangle: '🔺', sine: '〰️', square: '⬜', sawtooth: '📐',
  woodblock: '🪵', cowbell: '🔔', hihat: '🥁', rim: '🪘', clave: '🥢',
};

function NavSelector<T extends string>({ items, value, onChange, label, displayFn }: {
  items: T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  displayFn?: (v: T) => string;
}) {
  const idx = items.indexOf(value);
  const prev = () => onChange(items[(idx - 1 + items.length) % items.length]);
  const next = () => onChange(items[(idx + 1) % items.length]);
  const display = displayFn ? displayFn(value) : value;
  return (
    <div className="space-y-1">
      <label className="text-[10px] sm:text-xs text-muted-foreground block text-center">{label}</label>
      <div className="flex items-center gap-0.5">
        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-lg" onClick={prev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center font-semibold text-sm sm:text-base bg-secondary/50 rounded-lg py-1.5 px-1 min-w-0 truncate border border-border/50">
          {display}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-lg" onClick={next}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function panLabel(v: number): string {
  if (v <= -0.95) return '100% L';
  if (v >= 0.95) return '100% R';
  if (Math.abs(v) < 0.05) return 'Center';
  return `${Math.round(Math.abs(v) * 100)}% ${v < 0 ? 'L' : 'R'}`;
}

const Metronome: React.FC<MetronomeProps> = (props) => {
  const {
    isPlaying, bpm, setBpm, timeSignature, setTimeSignature,
    subdivision, setSubdivision, sound, setSound,
    volume, setVolume, pan, setPan,
    currentBeat, beatsPerMeasure, toggle, tapTempo,
    countIn, setCountIn, isCountingIn,
  } = props;

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* Header with play button */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-primary">🥁 Metrônomo</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={countIn ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCountIn(!countIn)}
            className="text-xs h-8 gap-1"
            title="Count-in: conta o compasso antes de iniciar"
          >
            <Timer className="w-3.5 h-3.5" />
            {countIn ? 'Count ✓' : 'Count'}
          </Button>
          <Button onClick={toggle} size="icon" className="rounded-full w-10 h-10 sm:w-12 sm:h-12 glow-purple">
            {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>
        </div>
      </div>

      {/* Count-in indicator */}
      {isCountingIn && (
        <div className="text-center py-2 rounded-lg bg-accent/20 border border-accent/40 animate-pulse">
          <span className="text-sm font-bold text-accent">🔔 Count-in...</span>
        </div>
      )}

      {/* BPM Display */}
      <div className="text-center">
        <div className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums">{bpm}</div>
        <div className="text-xs sm:text-sm text-muted-foreground mt-1">BPM</div>
      </div>

      {/* BPM Slider + Fine-tune */}
      <div className="space-y-2">
        <Slider value={[bpm]} onValueChange={([v]) => setBpm(v)} min={40} max={240} step={1} />
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setBpm(Math.max(40, bpm - 1))}>
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" onClick={tapTempo} className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm px-3 sm:px-4">
            <Hand className="w-3.5 h-3.5" /> Tap
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setBpm(Math.min(240, bpm + 1))}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Beat Indicator */}
      <div className="flex justify-center py-1 sm:py-2">
        <BeatIndicator beatsPerMeasure={beatsPerMeasure} currentBeat={currentBeat} showLabels />
      </div>

      {/* Nav selectors */}
      <div className="space-y-3">
        <NavSelector
          items={timeSignatures}
          value={timeSignature}
          onChange={setTimeSignature}
          label="Compasso"
        />
        <div className="grid grid-cols-2 gap-2">
          <NavSelector
            items={subdivisions.map(s => s.value)}
            value={subdivision}
            onChange={setSubdivision}
            label="Subdivisão"
            displayFn={(v) => subdivisions.find(s => s.value === v)?.short || v}
          />
          <NavSelector
            items={sounds}
            value={sound}
            onChange={setSound}
            label="Timbre"
            displayFn={(v) => `${soundEmojis[v] || ''} ${v.charAt(0).toUpperCase() + v.slice(1)}`}
          />
        </div>
      </div>

      {/* Volume & Pan */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="text-[10px] sm:text-xs text-muted-foreground mb-1 block">Volume</label>
          <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} min={0} max={1} step={0.01} />
        </div>
        <div>
          <label className="text-[10px] sm:text-xs text-muted-foreground mb-1 flex items-center justify-between">
            <span>Pan</span>
            <span className="text-[9px] sm:text-[10px]">{panLabel(pan)}</span>
          </label>
          <Slider value={[pan]} onValueChange={([v]) => setPan(v)} min={-1} max={1} step={0.01} />
        </div>
      </div>
    </div>
  );
};

export default Metronome;
