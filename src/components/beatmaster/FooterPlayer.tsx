import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, SkipBack, SkipForward, Volume2, Timer } from 'lucide-react';
import BeatIndicator from './BeatIndicator';
import type { Song, AppMode } from '@/types/beatmaster';
import { cn } from '@/lib/utils';

interface FooterPlayerProps {
  isPlaying: boolean;
  toggle: () => void;
  bpm: number;
  currentBeat: number;
  beatsPerMeasure: number;
  masterVolume: number;
  setMasterVolume: (v: number) => void;
  pan: number;
  setPan: (v: number) => void;
  mode: AppMode;
  setMode: (m: AppMode) => void;
  activeSong: Song | null;
  onPrev: () => void;
  onNext: () => void;
  countIn: boolean;
  setCountIn: (v: boolean) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const FooterPlayer: React.FC<FooterPlayerProps> = ({
  isPlaying, toggle, bpm, currentBeat, beatsPerMeasure,
  masterVolume, setMasterVolume, pan, setPan,
  mode, setMode, activeSong, onPrev, onNext,
  countIn, setCountIn,
}) => {
  // Duration countdown
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset on song change
    setElapsed(0);
    startTimeRef.current = null;
  }, [activeSong?.id]);

  useEffect(() => {
    if (isPlaying && activeSong?.duration) {
      startTimeRef.current = Date.now() - elapsed * 1000;
      intervalRef.current = window.setInterval(() => {
        const e = (Date.now() - (startTimeRef.current || Date.now())) / 1000;
        setElapsed(Math.min(e, activeSong.duration!));
      }, 250);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, activeSong?.id, activeSong?.duration]);

  const remaining = activeSong?.duration ? Math.max(0, activeSong.duration - elapsed) : 0;
  const progress = activeSong?.duration ? (elapsed / activeSong.duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50">
      {/* Duration bar */}
      {activeSong?.duration && isPlaying && (
        <Progress value={progress} className="h-1 rounded-none" />
      )}

      {/* Mobile: two rows */}
      <div className="sm:hidden px-3 py-2 space-y-1.5">
        {/* Row 1: Transport + BPM + Beat */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev} disabled={mode === 'free'}>
              <SkipBack className="w-3.5 h-3.5" />
            </Button>
            <Button onClick={toggle} size="icon" className="rounded-full h-9 w-9 glow-purple">
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNext} disabled={mode === 'free'}>
              <SkipForward className="w-3.5 h-3.5" />
            </Button>
          </div>

          <BeatIndicator beatsPerMeasure={beatsPerMeasure} currentBeat={currentBeat} compact />

          <div className="flex items-center gap-1.5">
            <span className="text-sm tabular-nums font-semibold">{bpm}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode(mode === 'free' ? 'setlist' : 'free')}
              className={cn('text-[10px] h-6 px-2', mode === 'setlist' && 'border-primary text-primary')}
            >
              {mode === 'free' ? 'Livre' : 'Set'}
            </Button>
          </div>
        </div>

        {/* Row 2: Song info + countdown + Volume */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 text-[10px] text-muted-foreground truncate">
            {activeSong
              ? `${activeSong.name}${activeSong.artist ? ` · ${activeSong.artist}` : ''}`
              : 'Modo Livre'}
          </div>
          {activeSong?.duration && isPlaying && (
            <span className="text-[10px] tabular-nums text-primary font-mono shrink-0">
              -{formatTime(remaining)}
            </span>
          )}
          <Volume2 className="w-3 h-3 text-muted-foreground shrink-0" />
          <Slider value={[masterVolume]} onValueChange={([v]) => setMasterVolume(v)} min={0} max={1} step={0.01} className="w-20" />
        </div>
      </div>

      {/* Desktop/Tablet: single row */}
      <div className="hidden sm:block px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 md:gap-4">
          {/* Song info */}
          <div className="flex flex-col min-w-0 w-32 md:w-44">
            {activeSong ? (
              <>
                <div className="text-xs md:text-sm font-medium truncate">{activeSong.name}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground truncate">
                  {activeSong.artist && <span className="text-primary/70">{activeSong.artist} · </span>}
                  {activeSong.bpm} BPM · {activeSong.timeSignature}
                  {activeSong.duration && isPlaying && (
                    <span className="text-primary font-mono ml-1">-{formatTime(remaining)}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">Modo Livre</div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={onPrev} disabled={mode === 'free'}>
              <SkipBack className="w-3.5 h-3.5" />
            </Button>
            <Button onClick={toggle} size="icon" className="rounded-full h-9 w-9 md:h-10 md:w-10 glow-purple">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={onNext} disabled={mode === 'free'}>
              <SkipForward className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Beat indicator + BPM */}
          <div className="flex items-center gap-2 md:gap-3">
            <BeatIndicator beatsPerMeasure={beatsPerMeasure} currentBeat={currentBeat} compact showLabels />
            <span className="text-sm tabular-nums font-semibold text-foreground">{bpm}</span>
          </div>

          {/* Master volume */}
          <div className="flex items-center gap-2 w-24 md:w-28">
            <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider value={[masterVolume]} onValueChange={([v]) => setMasterVolume(v)} min={0} max={1} step={0.01} />
          </div>

          {/* Count-in toggle */}
          <Button
            variant={countIn ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCountIn(!countIn)}
            className="text-xs h-7 md:h-8 gap-1 hidden md:flex"
            title="Count-in: conta o compasso antes do metrônomo"
          >
            <Timer className="w-3.5 h-3.5" />
            {countIn ? 'Count ✓' : 'Count'}
          </Button>

          {/* Pan L/C/R */}
          <div className="hidden md:flex items-center gap-1">
            {[{ label: 'L', val: -1 }, { label: 'C', val: 0 }, { label: 'R', val: 1 }].map(({ label, val }) => (
              <Button
                key={label}
                variant={Math.abs(pan - val) < 0.1 ? 'default' : 'outline'}
                size="sm"
                className="h-7 w-7 text-xs p-0"
                onClick={() => setPan(val)}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Mode toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode(mode === 'free' ? 'setlist' : 'free')}
            className={cn(
              'text-xs whitespace-nowrap h-7 md:h-8',
              mode === 'setlist' && 'border-primary text-primary'
            )}
          >
            {mode === 'free' ? 'Livre' : 'Setlist'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FooterPlayer;
