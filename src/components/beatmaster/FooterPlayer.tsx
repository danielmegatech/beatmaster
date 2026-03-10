import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  onSongEnd?: () => void;
  countInMeasures: number;
  setCountInMeasures: (v: number) => void;
  countOutMeasures: number;
  setCountOutMeasures: (v: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Phase = 'count-in' | 'playing' | 'count-out' | 'idle';

const FooterPlayer: React.FC<FooterPlayerProps> = ({
  isPlaying, toggle, bpm, currentBeat, beatsPerMeasure,
  masterVolume, setMasterVolume, pan, setPan,
  mode, setMode, activeSong, onPrev, onNext,
  countIn, setCountIn, onSongEnd,
  countInMeasures, setCountInMeasures,
  countOutMeasures, setCountOutMeasures,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const songEndedRef = useRef(false);

  // Calculate count-in/out durations in seconds
  const countInDuration = countIn && countInMeasures > 0 ? (countInMeasures * beatsPerMeasure * 60) / bpm : 0;
  const countOutDuration = countOutMeasures > 0 ? (countOutMeasures * beatsPerMeasure * 60) / bpm : 0;

  // Reset on song change
  useEffect(() => {
    setElapsed(0);
    startTimeRef.current = null;
    songEndedRef.current = false;
    setPhase('idle');
  }, [activeSong?.id]);

  // Timer logic
  useEffect(() => {
    if (isPlaying && activeSong?.duration) {
      const totalDuration = countInDuration + activeSong.duration + countOutDuration;
      startTimeRef.current = Date.now() - elapsed * 1000;
      songEndedRef.current = false;

      intervalRef.current = window.setInterval(() => {
        const e = (Date.now() - (startTimeRef.current || Date.now())) / 1000;
        const capped = Math.min(e, totalDuration);
        setElapsed(capped);

        // Determine phase
        if (capped < countInDuration) {
          setPhase('count-in');
        } else if (capped < countInDuration + activeSong.duration!) {
          setPhase('playing');
        } else if (capped < totalDuration) {
          setPhase('count-out');
        }

        // Song ended - auto advance
        if (capped >= totalDuration && !songEndedRef.current) {
          songEndedRef.current = true;
          if (onSongEnd && mode === 'setlist') {
            onSongEnd();
          }
        }
      }, 200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!isPlaying) setPhase('idle');
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, activeSong?.id, activeSong?.duration, countInDuration, countOutDuration, mode, onSongEnd]);

  // Calculate progress for each phase
  const totalDuration = activeSong?.duration
    ? countInDuration + activeSong.duration + countOutDuration
    : 0;

  const countInProgress = countInDuration > 0
    ? Math.min(1, Math.max(0, elapsed / countInDuration)) * 100
    : 100;

  const songElapsed = Math.max(0, elapsed - countInDuration);
  const songProgress = activeSong?.duration
    ? Math.min(1, songElapsed / activeSong.duration) * 100
    : 0;

  const countOutElapsed = Math.max(0, elapsed - countInDuration - (activeSong?.duration || 0));
  const countOutProgress = countOutDuration > 0
    ? Math.min(1, countOutElapsed / countOutDuration) * 100
    : 0;

  const remaining = activeSong?.duration
    ? Math.max(0, activeSong.duration - songElapsed)
    : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50">
      {/* Multi-phase progress bars */}
      {activeSong?.duration && isPlaying && (
        <div className="flex h-1.5">
          {/* Count-in bar */}
          {countInDuration > 0 && (
            <div className="relative bg-accent/20" style={{ width: `${(countInDuration / totalDuration) * 100}%` }}>
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${countInProgress}%` }}
              />
              {phase === 'count-in' && (
                <span className="absolute top-full left-1 text-[8px] text-accent font-bold z-10 whitespace-nowrap">
                  COUNT IN
                </span>
              )}
            </div>
          )}
          {/* Main song bar */}
          <div className="relative flex-1 bg-primary/10">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${songProgress}%` }}
            />
          </div>
          {/* Count-out bar */}
          {countOutDuration > 0 && (
            <div className="relative bg-destructive/20" style={{ width: `${(countOutDuration / totalDuration) * 100}%` }}>
              <div
                className="h-full bg-destructive/70 transition-all"
                style={{ width: `${countOutProgress}%` }}
              />
              {phase === 'count-out' && (
                <span className="absolute top-full right-1 text-[8px] text-destructive font-bold z-10 whitespace-nowrap">
                  COUNT OUT
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mobile: two rows */}
      <div className="sm:hidden px-3 py-2 space-y-1.5">
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

        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 text-[10px] text-muted-foreground truncate">
            {phase === 'count-in' && <span className="text-accent font-bold mr-1">⏳ COUNT IN</span>}
            {phase === 'count-out' && <span className="text-destructive font-bold mr-1">⏳ COUNT OUT</span>}
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
          <div className="flex flex-col min-w-0 w-32 md:w-48">
            {activeSong ? (
              <>
                <div className="text-xs md:text-sm font-medium truncate flex items-center gap-1">
                  {phase === 'count-in' && <span className="text-[9px] text-accent font-bold animate-pulse">COUNT IN</span>}
                  {phase === 'count-out' && <span className="text-[9px] text-destructive font-bold animate-pulse">COUNT OUT</span>}
                  <span className="truncate">{activeSong.name}</span>
                </div>
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

          {/* Count-in/out controls */}
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant={countIn ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCountIn(!countIn)}
              className="text-[10px] h-7 gap-0.5 px-1.5"
              title="Count-in"
            >
              <Timer className="w-3 h-3" />
              In:{countInMeasures}
            </Button>
            <Button
              variant={countOutMeasures > 0 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCountOutMeasures(countOutMeasures > 0 ? 0 : 2)}
              className="text-[10px] h-7 gap-0.5 px-1.5"
              title="Count-out"
            >
              <Timer className="w-3 h-3" />
              Out:{countOutMeasures}
            </Button>
          </div>

          {/* Pan L/C/R */}
          <div className="hidden lg:flex items-center gap-1">
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
