import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, Timer, Mic } from 'lucide-react';
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
  const [isSeeking, setIsSeeking] = useState(false);
  const [announcing, setAnnouncing] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const songEndedRef = useRef(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const countInDuration = countIn && countInMeasures > 0 ? (countInMeasures * beatsPerMeasure * 60) / bpm : 0;
  const countOutDuration = countOutMeasures > 0 ? (countOutMeasures * beatsPerMeasure * 60) / bpm : 0;
  const totalDuration = activeSong?.duration
    ? countInDuration + activeSong.duration + countOutDuration
    : 0;

  // Reset on song change
  useEffect(() => {
    setElapsed(0);
    startTimeRef.current = null;
    songEndedRef.current = false;
    setPhase('idle');
  }, [activeSong?.id]);

  // Timer logic
  useEffect(() => {
    if (isPlaying && activeSong?.duration && !isSeeking) {
      startTimeRef.current = Date.now() - elapsed * 1000;
      songEndedRef.current = false;

      intervalRef.current = window.setInterval(() => {
        const e = (Date.now() - (startTimeRef.current || Date.now())) / 1000;
        const capped = Math.min(e, totalDuration);
        setElapsed(capped);

        if (capped < countInDuration) {
          setPhase('count-in');
        } else if (capped < countInDuration + activeSong.duration!) {
          setPhase('playing');
        } else if (capped < totalDuration) {
          setPhase('count-out');
        }

        if (capped >= totalDuration && !songEndedRef.current) {
          songEndedRef.current = true;
          if (onSongEnd && mode === 'setlist') {
            onSongEnd();
          }
        }
      }, 100);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!isPlaying) setPhase('idle');
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, activeSong?.id, activeSong?.duration, countInDuration, countOutDuration, mode, onSongEnd, isSeeking]);

  // Seeking via progress bar
  const handleSeek = useCallback((clientX: number) => {
    if (!progressBarRef.current || !totalDuration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newElapsed = ratio * totalDuration;
    setElapsed(newElapsed);
    startTimeRef.current = Date.now() - newElapsed * 1000;
    songEndedRef.current = false;
  }, [totalDuration]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!totalDuration) return;
    setIsSeeking(true);
    handleSeek(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [handleSeek, totalDuration]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (isSeeking) handleSeek(e.clientX);
  }, [isSeeking, handleSeek]);

  const onPointerUp = useCallback(() => {
    setIsSeeking(false);
  }, []);

  // TTS announcement
  const announceSong = useCallback(async () => {
    if (!activeSong || announcing) return;
    setAnnouncing(true);
    try {
      const text = activeSong.artist
        ? `Next up: ${activeSong.name} by ${activeSong.artist}`
        : `Next up: ${activeSong.name}`;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );
      if (!response.ok) throw new Error('TTS failed');
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (err) {
      console.error('TTS announcement failed:', err);
    } finally {
      setAnnouncing(false);
    }
  }, [activeSong, announcing]);

  const overallProgress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
  const songElapsed = Math.max(0, elapsed - countInDuration);
  const remaining = activeSong?.duration
    ? Math.max(0, activeSong.duration - songElapsed)
    : 0;

  // Count-in/out beat counters
  const countInRemaining = phase === 'count-in'
    ? Math.ceil((countInDuration - elapsed) / (60 / bpm))
    : 0;
  const countOutRemaining = phase === 'count-out'
    ? Math.ceil((totalDuration - elapsed) / (60 / bpm))
    : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50">
      {/* Seekable progress bar */}
      {activeSong?.duration && (
        <div
          ref={progressBarRef}
          className="relative h-2.5 cursor-pointer group"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Background segments */}
          <div className="absolute inset-0 flex">
            {countInDuration > 0 && (
              <div className="h-full bg-accent/15" style={{ width: `${(countInDuration / totalDuration) * 100}%` }} />
            )}
            <div className="h-full bg-primary/10 flex-1" />
            {countOutDuration > 0 && (
              <div className="h-full bg-destructive/15" style={{ width: `${(countOutDuration / totalDuration) * 100}%` }} />
            )}
          </div>

          {/* Filled progress */}
          <div className="absolute inset-0 flex">
            {countInDuration > 0 && (
              <div className="h-full overflow-hidden" style={{ width: `${(countInDuration / totalDuration) * 100}%` }}>
                <div
                  className="h-full bg-accent transition-[width] duration-100"
                  style={{ width: `${Math.min(100, (elapsed / countInDuration) * 100)}%` }}
                />
              </div>
            )}
            <div className="h-full overflow-hidden flex-1">
              <div
                className="h-full bg-primary transition-[width] duration-100"
                style={{ width: `${activeSong.duration ? Math.min(100, (songElapsed / activeSong.duration) * 100) : 0}%` }}
              />
            </div>
            {countOutDuration > 0 && (
              <div className="h-full overflow-hidden" style={{ width: `${(countOutDuration / totalDuration) * 100}%` }}>
                <div
                  className="h-full bg-destructive/70 transition-[width] duration-100"
                  style={{ width: `${Math.min(100, ((elapsed - countInDuration - (activeSong.duration || 0)) / countOutDuration) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Seek thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-primary border-2 border-primary-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `calc(${overallProgress}% - 7px)` }}
          />

          {/* Phase labels */}
          {phase === 'count-in' && (
            <span className="absolute top-full left-1 text-[8px] text-accent font-bold z-10 whitespace-nowrap mt-0.5">
              COUNT IN · {countInRemaining}
            </span>
          )}
          {phase === 'count-out' && (
            <span className="absolute top-full right-1 text-[8px] text-destructive font-bold z-10 whitespace-nowrap mt-0.5">
              COUNT OUT · {countOutRemaining}
            </span>
          )}
        </div>
      )}

      {/* Mobile layout */}
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
          {activeSong?.coverArt && (
            <img src={activeSong.coverArt} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
          )}
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

      {/* Desktop layout */}
      <div className="hidden sm:block px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 md:gap-4">
          {/* Song info with cover art */}
          <div className="flex items-center gap-3 min-w-0 w-36 md:w-52">
            {activeSong?.coverArt && (
              <img
                src={activeSong.coverArt}
                alt=""
                className="w-10 h-10 md:w-11 md:h-11 rounded-lg object-cover shrink-0 shadow-md"
              />
            )}
            <div className="min-w-0">
              {activeSong ? (
                <>
                  <div className="text-xs md:text-sm font-medium truncate flex items-center gap-1">
                    {phase === 'count-in' && (
                      <span className="text-[9px] text-accent font-bold animate-pulse bg-accent/15 px-1 rounded">
                        IN {countInRemaining}
                      </span>
                    )}
                    {phase === 'count-out' && (
                      <span className="text-[9px] text-destructive font-bold animate-pulse bg-destructive/15 px-1 rounded">
                        OUT {countOutRemaining}
                      </span>
                    )}
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

          {/* Count-in/out + TTS */}
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
            <Button
              variant="outline"
              size="sm"
              onClick={announceSong}
              disabled={!activeSong || announcing}
              className="text-[10px] h-7 gap-0.5 px-1.5"
              title="Anunciar música (TTS)"
            >
              <Mic className={cn("w-3 h-3", announcing && "animate-pulse text-primary")} />
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
