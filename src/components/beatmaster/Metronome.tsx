import React from 'react';
import { Slider } from '@/components/ui/slider';
import { ResettableSlider } from '@/components/ui/resettable-slider';
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
const sounds: SoundTimbre[] = ['clave', 'bell', 'hihat', 'bongo', 'beep', 'woodblock', 'click', 'cowbell', 'rim', 'triangle', 'sine', 'square', 'sawtooth'];

const soundEmojis: Record<SoundTimbre, string> = {
  click: '🔘', triangle: '🔺', sine: '〰️', square: '⬜', sawtooth: '📐',
  woodblock: '🪵', cowbell: '🔔', hihat: '🥁', rim: '🪘', clave: '🥢',
  bell: '🔔', bongo: '🪘', beep: '🔊',
};

function NavSelector<T extends string>({ items, value, onChange, label, displayFn, accent }: {
  items: T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  displayFn?: (v: T) => string;
  accent?: boolean;
}) {
  const idx = items.indexOf(value);
  const prev = () => onChange(items[(idx - 1 + items.length) % items.length]);
  const next = () => onChange(items[(idx + 1) % items.length]);
  const display = displayFn ? displayFn(value) : value;
  return (
    <div className="space-y-1 min-w-0">
      <label className="block text-center truncate font-medium uppercase tracking-wide text-muted-foreground" style={{ fontSize: '12px' }}>{label}</label>
      <div className="flex items-center gap-1 min-w-0">
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-7 w-6 shrink-0 rounded-md",
            accent && "border-primary/60 text-primary hover:bg-primary/10"
          )}
          onClick={prev}
          aria-label={`${label} anterior`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <div className={cn(
          "flex-1 min-w-0 text-center font-semibold text-sm sm:text-base bg-secondary/50 rounded-md py-2 px-1 truncate border",
          accent ? "border-primary/40 text-foreground" : "border-border/50"
        )}>
          {display}
        </div>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-7 w-6 shrink-0 rounded-md",
            accent && "border-primary/60 text-primary hover:bg-primary/10"
          )}
          onClick={next}
          aria-label={`${label} próximo`}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

/**
 * CycleButton: single button that cycles forward through items.
 * Click → next option (wraps around). Big icon, small label.
 */
function CycleButton<T extends string>({ items, value, onChange, label, displayFn, iconFn }: {
  items: T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  displayFn?: (v: T) => string;
  iconFn?: (v: T) => string;
}) {
  const idx = items.indexOf(value);
  const next = () => onChange(items[(idx + 1) % items.length]);
  const text = displayFn ? displayFn(value) : value;
  const icon = iconFn ? iconFn(value) : '';
  return (
    <div className="space-y-1 min-w-0">
      <label className="block text-center truncate font-medium uppercase tracking-wide text-muted-foreground" style={{ fontSize: '12px' }}>{label}</label>
      <button
        onClick={next}
        aria-label={`${label}: próximo (atual ${text})`}
        className={cn(
          "w-full min-w-0 flex items-center justify-center gap-2 rounded-md py-2 px-2 border-2 border-primary/50 bg-secondary/40 hover:bg-primary/10 hover:border-primary transition-all active:scale-95"
        )}
      >
        {icon && <span className="text-2xl leading-none">{icon}</span>}
        <span className="font-semibold text-foreground text-sm truncate" style={{ fontSize: '12px' }}>{text}</span>
      </button>
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
      {/* Header with Count In toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-primary">🥁 Metrônomo</h2>
        <Button
          variant={countIn ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCountIn(!countIn)}
          className={cn(
            "text-xs h-8 gap-1 transition-all",
            countIn
              ? "bg-accent text-accent-foreground hover:bg-accent/90 border-accent"
              : "border-accent/60 text-accent hover:bg-accent/10"
          )}
          title="Count In: anuncia a música e conta 1-2-3-4 antes do metrônomo. Aplicado ao iniciar/trocar de música."
        >
          <Timer className="w-3.5 h-3.5" />
          Count In {countIn ? 'ON' : 'OFF'}
        </Button>
      </div>

      {/* Count-in indicator */}
      {isCountingIn && (
        <div className="text-center py-2 rounded-lg bg-accent/20 border border-accent/40 animate-pulse">
          <span className="text-sm font-bold text-accent">🔔 Count-in...</span>
        </div>
      )}

      {/* BIG Play/Pause Button - destaque principal */}
      <Button
        onClick={toggle}
        className={cn(
          'w-full h-20 rounded-2xl text-lg font-bold gap-3 border-4 transition-all shadow-lg',
          isPlaying
            ? 'bg-destructive hover:bg-destructive/90 border-destructive-foreground/30 text-destructive-foreground pulse-active'
            : 'bg-primary hover:bg-primary/90 border-primary-foreground/30 text-primary-foreground glow-purple'
        )}
      >
        {isPlaying
          ? <Pause className="!w-9 !h-9" strokeWidth={2.5} />
          : <Play className="!w-9 !h-9" strokeWidth={2.5} />}
        {isPlaying ? 'PAUSE' : 'START'}
      </Button>

      {/* BPM Display */}
      <div className="text-center">
        <div className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums">{bpm}</div>
        <div className="text-xs sm:text-sm text-muted-foreground mt-1">BPM</div>
      </div>

      {/* BPM Slider + Fine-tune */}
      <div className="space-y-2">
        <Slider value={[bpm]} onValueChange={([v]) => setBpm(v)} min={40} max={240} step={1} />
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="h-8 px-2 text-[11px] font-bold" onClick={() => setBpm(Math.max(40, bpm - 5))} title="−5 BPM">
            −5
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setBpm(Math.max(40, bpm - 1))}>
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" onClick={tapTempo} className="gap-1.5 h-8 sm:h-9 text-xs sm:text-sm px-3 sm:px-4">
            <Hand className="w-3.5 h-3.5" /> Tap
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setBpm(Math.min(240, bpm + 1))}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2 text-[11px] font-bold" onClick={() => setBpm(Math.min(240, bpm + 5))} title="+5 BPM">
            +5
          </Button>
        </div>
      </div>

      {/* Beat Indicator */}
      <div className="flex justify-center py-1 sm:py-2">
        <BeatIndicator beatsPerMeasure={beatsPerMeasure} currentBeat={currentBeat} showLabels />
      </div>

      {/* Selectors: Compasso on top (full width), Subdivisão + Timbre as single cycle buttons */}
      <div className="space-y-3">
        <NavSelector
          items={timeSignatures}
          value={timeSignature}
          onChange={setTimeSignature}
          label="Compasso"
        />
        <div className="grid grid-cols-2 gap-2 min-w-0">
          <CycleButton
            items={subdivisions.map(s => s.value)}
            value={subdivision}
            onChange={setSubdivision}
            label="Subdivisão"
            displayFn={(v) => subdivisions.find(s => s.value === v)?.short || v}
          />
          <CycleButton
            items={sounds}
            value={sound}
            onChange={setSound}
            label="Timbre"
            iconFn={(v) => soundEmojis[v] || '🎵'}
            displayFn={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
          />
        </div>
      </div>

      {/* Mixer Click — metrônomo (separado do Mixer Sampler) */}
      <div className="rounded-xl border-2 border-accent/40 bg-accent/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-accent">🎚️ Mixer Click</span>
          <div className="flex-1 h-px bg-accent/30" />
          <span className="text-[10px] text-muted-foreground">só metrônomo</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="text-[10px] sm:text-xs text-muted-foreground mb-1 flex items-center justify-between">
              <span>Volume</span>
              <span className="text-[9px] sm:text-[10px] tabular-nums text-foreground/80">{Math.round(volume * 100)}%</span>
            </label>
            <ResettableSlider resetValue={0.8} value={[volume]} onValueChange={([v]) => setVolume(v)} min={0} max={1} step={0.01} />
          </div>
          <div>
            <label className="text-[10px] sm:text-xs text-muted-foreground mb-1 flex items-center justify-between">
              <span>Pan</span>
              <span className="text-[9px] sm:text-[10px] tabular-nums text-foreground/80">{panLabel(pan)}</span>
            </label>
            <ResettableSlider resetValue={0} value={[pan]} onValueChange={([v]) => setPan(v)} min={-1} max={1} step={0.01} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Metronome;
