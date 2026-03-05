import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Play, Pause, Minus, Plus, Hand, ChevronLeft, ChevronRight } from 'lucide-react';
import BeatIndicator from './BeatIndicator';
import type { Subdivision, SoundTimbre } from '@/types/beatmaster';

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
}

const timeSignatures = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '7/4', '12/8', '13/8'];
const subdivisions: { value: Subdivision; label: string }[] = [
  { value: 'quarter', label: '♩ Quarter' },
  { value: 'eighth', label: '♪♪ Eighth' },
  { value: 'triplet', label: '♪♪♪ Triplet' },
  { value: 'sixteenth', label: '♬♬ 16th' },
];
const sounds: SoundTimbre[] = ['click', 'triangle', 'sine', 'square', 'sawtooth', 'woodblock', 'cowbell', 'hihat', 'rim', 'clave'];

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
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={prev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center text-sm font-medium truncate px-1">
          {displayFn ? displayFn(value) : value}
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={next}>
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
  } = props;

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">🥁 Metrônomo</h2>
        <Button onClick={toggle} size="icon" className="rounded-full w-12 h-12 glow-purple">
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </Button>
      </div>

      {/* BPM Display */}
      <div className="text-center">
        <div className="text-6xl font-bold text-foreground tabular-nums">{bpm}</div>
        <div className="text-sm text-muted-foreground mt-1">BPM</div>
      </div>

      {/* BPM Slider + Fine-tune */}
      <div className="space-y-2">
        <Slider value={[bpm]} onValueChange={([v]) => setBpm(v)} min={40} max={240} step={1} />
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setBpm(Math.max(40, bpm - 1))}>
            <Minus className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={tapTempo} className="gap-2">
            <Hand className="w-4 h-4" /> Tap
          </Button>
          <Button variant="outline" size="icon" onClick={() => setBpm(Math.min(240, bpm + 1))}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Beat Indicator */}
      <div className="flex justify-center py-2">
        <BeatIndicator beatsPerMeasure={beatsPerMeasure} currentBeat={currentBeat} showLabels />
      </div>

      {/* Nav selectors for Time Sig, Subdivision, Sound */}
      <div className="grid grid-cols-3 gap-3">
        <NavSelector
          items={timeSignatures}
          value={timeSignature}
          onChange={setTimeSignature}
          label="Compasso"
        />
        <NavSelector
          items={subdivisions.map(s => s.value)}
          value={subdivision}
          onChange={setSubdivision}
          label="Subdivisão"
          displayFn={(v) => subdivisions.find(s => s.value === v)?.label || v}
        />
        <NavSelector
          items={sounds}
          value={sound}
          onChange={setSound}
          label="Timbre"
          displayFn={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
        />
      </div>

      {/* Volume & Pan */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Volume</label>
          <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} min={0} max={1} step={0.01} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
            <span>Pan</span>
            <span className="text-[10px]">{panLabel(pan)}</span>
          </label>
          <Slider value={[pan]} onValueChange={([v]) => setPan(v)} min={-1} max={1} step={0.01} />
        </div>
      </div>
    </div>
  );
};

export default Metronome;
