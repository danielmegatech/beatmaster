import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Minus, Plus, Hand } from 'lucide-react';
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

const timeSignatures = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8'];
const subdivisions: { value: Subdivision; label: string }[] = [
  { value: 'quarter', label: '♩' },
  { value: 'eighth', label: '♪♪' },
  { value: 'triplet', label: '♪♪♪' },
  { value: 'sixteenth', label: '♬♬' },
];
const sounds: SoundTimbre[] = ['click', 'triangle', 'sine', 'square', 'sawtooth', 'woodblock', 'cowbell', 'hihat', 'rim', 'clave'];

const Metronome: React.FC<MetronomeProps> = (props) => {
  const {
    isPlaying, bpm, setBpm, timeSignature, setTimeSignature,
    subdivision, setSubdivision, sound, setSound,
    volume, setVolume, pan, setPan,
    currentBeat, beatsPerMeasure, toggle, tapTempo,
  } = props;

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">🥁 Metrônomo</h2>
        <Button
          onClick={toggle}
          size="icon"
          className="rounded-full w-12 h-12 glow-purple"
        >
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
        <Slider
          value={[bpm]}
          onValueChange={([v]) => setBpm(v)}
          min={40}
          max={240}
          step={1}
        />
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
        <BeatIndicator beatsPerMeasure={beatsPerMeasure} currentBeat={currentBeat} />
      </div>

      {/* Time Signature & Subdivision */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Compasso</label>
          <Select value={timeSignature} onValueChange={setTimeSignature}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {timeSignatures.map(ts => (
                <SelectItem key={ts} value={ts}>{ts}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Subdivisão</label>
          <Select value={subdivision} onValueChange={(v) => setSubdivision(v as Subdivision)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {subdivisions.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label} {s.value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sound Selector */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Timbre</label>
        <Select value={sound} onValueChange={(v) => setSound(v as SoundTimbre)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {sounds.map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Volume & Pan */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Volume</label>
          <Slider value={[volume]} onValueChange={([v]) => setVolume(v)} min={0} max={1} step={0.01} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Pan (L/R)</label>
          <Slider value={[pan]} onValueChange={([v]) => setPan(v)} min={-1} max={1} step={0.01} />
        </div>
      </div>
    </div>
  );
};

export default Metronome;
