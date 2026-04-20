import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ResettableSlider } from '@/components/ui/resettable-slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, Timer, Mic, MicOff } from 'lucide-react';
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
  ttsEnabled: boolean;
  setTtsEnabled: (v: boolean) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Phase = 'announcing' | 'count-in' | 'playing' | 'idle';

// Count-in is fixed: 2 measures at song's BPM
const COUNT_IN_MEASURES = 2;

const FooterPlayer: React.FC<FooterPlayerProps> = ({
  isPlaying, toggle, bpm, currentBeat, beatsPerMeasure,
  masterVolume, setMasterVolume, pan, setPan,
  mode, setMode, activeSong, onPrev, onNext,
  countIn, setCountIn, onSongEnd,
  ttsEnabled, setTtsEnabled,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [isSeeking, setIsSeeking] = useState(false);
  const [announcing, setAnnouncing] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const songEndedRef = useRef(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const announcedSongRef = useRef<string | null>(null);

  // Count-in: 2 measures at the song BPM
  const countInBeats = countIn ? COUNT_IN_MEASURES * beatsPerMeasure : 0;
  const countInDuration = countInBeats > 0 ? (countInBeats * 60) / bpm : 0;
  const totalDuration = activeSong?.duration ? countInDuration + activeSong.duration : 0;

  // Stop any in-flight TTS (ElevenLabs audio + browser speech)
  const stopAnnouncement = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    }
    setAnnouncing(false);
  }, []);

  // Browser TTS fallback (when ElevenLabs unavailable)
  const speakWithBrowser = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        utter.rate = 1.05;
        utter.pitch = 1;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.speak(utter);
      } catch {
        resolve();
      }
    });
  }, []);

  // TTS announcement (always English, "Now playing: ..." or "Pause for X seconds")
  const announceSong = useCallback(async (song: Song): Promise<void> => {
    stopAnnouncement();
    setAnnouncing(true);
    const text = song.isPause
      ? `Pause for ${song.duration ?? 300} seconds.`
      : song.artist
        ? `Now playing: ${song.name}, by ${song.artist}.`
        : `Now playing: ${song.name}.`;
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      const contentType = response.headers.get('Content-Type') || '';

      // JSON response = error/fallback signal from edge function
      if (contentType.includes('application/json')) {
        const data = await response.json().catch(() => ({ fallback: true }));
        console.warn('ElevenLabs TTS unavailable, using browser fallback:', data);
        if (data?.fallback !== false) {
          await speakWithBrowser(text);
        }
        return;
      }

      if (!response.ok) {
        await speakWithBrowser(text);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      await new Promise<void>((resolve) => {
        audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(audioUrl); resolve(); };
        audio.play().catch(() => resolve());
      });
    } catch (err) {
      console.error('TTS announcement failed, falling back to browser:', err);
      await speakWithBrowser(text);
    } finally {
      setAnnouncing(false);
      audioRef.current = null;
    }
  }, [stopAnnouncement, speakWithBrowser]);

  // Reset on song change. Auto-announce ONLY happens when user presses play
  // (or when navigating between songs while already playing).
  useEffect(() => {
    setElapsed(0);
    startTimeRef.current = null;
    songEndedRef.current = false;
    setPhase('idle');
    stopAnnouncement();

    // If already playing and song changed (prev/next during playback), announce now
    if (
      isPlaying && activeSong && ttsEnabled && mode === 'setlist' &&
      announcedSongRef.current !== activeSong.id
    ) {
      announcedSongRef.current = activeSong.id;
      announceSong(activeSong);
    }
    return () => stopAnnouncement();
  }, [activeSong?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Play handler: TTS announce → then start metronome (count-in → BPM)
  const handlePlayClick = useCallback(async () => {
    // If currently playing → just stop
    if (isPlaying) {
      toggle();
      return;
    }
    // Announce first when in setlist mode with TTS, then start
    if (
      activeSong && ttsEnabled && mode === 'setlist' &&
      announcedSongRef.current !== activeSong.id
    ) {
      announcedSongRef.current = activeSong.id;
      await announceSong(activeSong);
    }
    toggle();
  }, [isPlaying, toggle, activeSong, ttsEnabled, mode, announceSong]);

  // Timer logic
  useEffect(() => {
    if (isPlaying && activeSong?.duration && !isSeeking) {
      startTimeRef.current = Date.now() - elapsed * 1000;
      songEndedRef.current = false;

      intervalRef.current = window.setInterval(() => {
        const e = (Date.now() - (startTimeRef.current || Date.now())) / 1000;
        const capped = Math.min(e, totalDuration);
        setElapsed(capped);

        if (capped < countInDuration) setPhase('count-in');
        else if (capped < totalDuration) setPhase('playing');

        if (capped >= totalDuration && !songEndedRef.current) {
          songEndedRef.current = true;
          if (onSongEnd && mode === 'setlist') onSongEnd();
        }
      }, 50);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!isPlaying) setPhase('idle');
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, activeSong?.id, activeSong?.duration, countInDuration, totalDuration, mode, onSongEnd, isSeeking]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seeking
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

  const onPointerUp = useCallback(() => setIsSeeking(false), []);

  const overallProgress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
  const songElapsed = Math.max(0, elapsed - countInDuration);
  const countInRemaining = phase === 'count-in'
    ? Math.ceil((countInDuration - elapsed) / (60 / bpm))
    : 0;
  const phaseBarPulse = isPlaying && phase !== 'idle' ? 'animate-[pulse_1s_ease-in-out_infinite]' : '';
  const coverBg = activeSong?.coverArt;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 overflow-hidden">
      {coverBg && (
        <div className="absolute inset-0 bg-cover bg-center opacity-[0.12] blur-sm pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${coverBg})` }} />
      )}
      <div className="absolute inset-0 glass pointer-events-none" />

      {/* Seekable progress bar */}
      {activeSong?.duration && (
        <div ref={progressBarRef}
          className="relative h-3 cursor-pointer group z-10 touch-none"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          <div className="absolute inset-0 flex">
            {countInDuration > 0 && (
              <div className="h-full bg-accent/15" style={{ width: `${(countInDuration / totalDuration) * 100}%` }} />
            )}
            <div className="h-full bg-primary/10 flex-1" />
          </div>
          <div className="absolute inset-0 flex">
            {countInDuration > 0 && (
              <div className="h-full overflow-hidden" style={{ width: `${(countInDuration / totalDuration) * 100}%` }}>
                <div className={cn("h-full bg-accent", phase === 'count-in' && phaseBarPulse)}
                  style={{ width: `${Math.min(100, (elapsed / countInDuration) * 100)}%`, transition: isSeeking ? 'none' : 'width 80ms linear' }} />
              </div>
            )}
            <div className="h-full overflow-hidden flex-1">
              <div className={cn("h-full bg-primary", phase === 'playing' && phaseBarPulse)}
                style={{ width: `${activeSong.duration ? Math.min(100, (songElapsed / activeSong.duration) * 100) : 0}%`, transition: isSeeking ? 'none' : 'width 80ms linear' }} />
            </div>
          </div>
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 rounded-full bg-primary border-2 border-primary-foreground shadow-lg pointer-events-none transition-all",
            isSeeking ? "w-5 h-5 opacity-100 scale-110" : "w-4 h-4 opacity-0 group-hover:opacity-100"
          )} style={{ left: `calc(${overallProgress}% - ${isSeeking ? 10 : 8}px)` }} />
          {phase === 'count-in' && (
            <span className="absolute top-full left-2 text-[9px] text-accent font-bold z-10 whitespace-nowrap mt-0.5 animate-fade-in">
              ⏳ COUNT IN · {countInRemaining} beats
            </span>
          )}
        </div>
      )}

      {/* Mobile */}
      <div className="sm:hidden px-3 py-2 space-y-1.5 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" size="icon"
              className={cn("h-7 w-7 active:pulse-active", isPlaying && mode === 'setlist' && "pulse-active")}
              onClick={onPrev} disabled={mode === 'free'}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={handlePlayClick} size="icon"
              className={cn("rounded-full h-9 w-9 glow-purple", isPlaying && "pulse-active")}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              className={cn("h-7 w-7 active:pulse-active", isPlaying && mode === 'setlist' && "pulse-active")}
              onClick={onNext} disabled={mode === 'free'}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </Button>
          </div>
          <BeatIndicator beatsPerMeasure={beatsPerMeasure} currentBeat={currentBeat} compact />
          <div className="flex items-center gap-1.5">
            <span className="text-sm tabular-nums font-semibold">{bpm}</span>
            <Button variant="outline" size="sm"
              onClick={() => setMode(mode === 'free' ? 'setlist' : 'free')}
              className={cn('text-[10px] h-6 px-2', mode === 'setlist' && 'border-primary text-primary')}>
              {mode === 'free' ? 'BPM Livre' : 'Modo Setlist'}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeSong?.coverArt && (
            <img src={activeSong.coverArt} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 shadow-md" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium truncate">
              {announcing && <span className="text-primary font-bold mr-1 animate-pulse">🎤</span>}
              {phase === 'count-in' && <span className="text-accent font-bold mr-1 animate-pulse">⏳ IN</span>}
              {activeSong ? activeSong.name : 'BPM Livre'}
            </div>
            {activeSong?.artist && <div className="text-[9px] text-muted-foreground truncate">{activeSong.artist}</div>}
          </div>
          {activeSong?.duration && isPlaying && (
            <span className="text-[10px] tabular-nums text-primary font-mono shrink-0">
              {formatTime(Math.min(songElapsed, activeSong.duration))}/{formatTime(activeSong.duration)}
            </span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <Volume2 className="w-3 h-3 text-muted-foreground" />
            <Slider value={[masterVolume]} onValueChange={([v]) => setMasterVolume(v)} min={0} max={1} step={0.01} className="w-16" />
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden sm:block px-4 py-2.5 relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3 min-w-0 w-40 md:w-56">
            {activeSong?.coverArt && (
              <img src={activeSong.coverArt} alt="" className="w-11 h-11 md:w-12 md:h-12 rounded-lg object-cover shrink-0 shadow-lg ring-1 ring-border/30" />
            )}
            <div className="min-w-0">
              {activeSong ? (
                <>
                  <div className="text-xs md:text-sm font-medium truncate flex items-center gap-1.5">
                    {announcing && (
                      <span className="text-[9px] text-primary font-bold animate-pulse bg-primary/15 px-1.5 py-0.5 rounded-full">🎤</span>
                    )}
                    {phase === 'count-in' && (
                      <span className="text-[9px] text-accent font-bold animate-pulse bg-accent/15 px-1.5 py-0.5 rounded-full">
                        IN {countInRemaining}
                      </span>
                    )}
                    <span className="truncate">{activeSong.name}</span>
                  </div>
                  <div className="text-[10px] md:text-xs text-muted-foreground truncate">
                    {activeSong.artist && <span className="text-primary/70">{activeSong.artist} · </span>}
                    {activeSong.bpm} BPM · {activeSong.timeSignature}
                  </div>
                  {activeSong.duration && isPlaying && (
                    <div className="text-[10px] text-primary font-mono mt-0.5">
                      {formatTime(Math.min(songElapsed, activeSong.duration))} / {formatTime(activeSong.duration)}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-muted-foreground">BPM Livre</div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost" size="icon"
              className={cn("h-7 w-7 md:h-8 md:w-8 active:pulse-active", isPlaying && mode === 'setlist' && "pulse-active")}
              onClick={onPrev} disabled={mode === 'free'}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={handlePlayClick} size="icon"
              className={cn("rounded-full h-10 w-10 md:h-11 md:w-11 glow-purple", isPlaying && "pulse-active")}
            >
              {isPlaying ? <Pause className="w-4 h-4 md:w-5 md:h-5" /> : <Play className="w-4 h-4 md:w-5 md:h-5" />}
            </Button>
            <Button
              variant="ghost" size="icon"
              className={cn("h-7 w-7 md:h-8 md:w-8 active:pulse-active", isPlaying && mode === 'setlist' && "pulse-active")}
              onClick={onNext} disabled={mode === 'free'}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <BeatIndicator beatsPerMeasure={beatsPerMeasure} currentBeat={currentBeat} compact showLabels />
            <span className="text-sm tabular-nums font-semibold text-foreground">{bpm}</span>
          </div>

          <div className="flex items-center gap-2 w-24 md:w-28">
            <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider value={[masterVolume]} onValueChange={([v]) => setMasterVolume(v)} min={0} max={1} step={0.01} />
          </div>

          {/* Count-in + TTS toggle */}
          <div className="hidden md:flex items-center gap-1">
            <Button
              variant={countIn ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCountIn(!countIn)}
              className={cn(
                "text-[10px] h-7 gap-1 px-2 transition-all",
                countIn && "pulse-active"
              )}
              title="Count-in: 2 compassos antes de iniciar"
            >
              <Timer className="w-3 h-3" /> Count In
            </Button>
            <Button
              variant={ttsEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={cn(
                "text-[10px] h-7 gap-1 px-2 transition-all",
                ttsEnabled && "pulse-active",
                announcing && "border-primary bg-primary/20"
              )}
              title={ttsEnabled ? "Anúncio por voz ativado (toca antes de cada música)" : "Anúncio por voz desativado"}
            >
              {ttsEnabled ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              TTS
            </Button>
          </div>

          {/* Pan */}
          <div className="hidden lg:flex items-center gap-1">
            {[{ label: 'L', val: -1 }, { label: 'C', val: 0 }, { label: 'R', val: 1 }].map(({ label, val }) => (
              <Button key={label}
                variant={Math.abs(pan - val) < 0.1 ? 'default' : 'outline'}
                size="sm" className="h-7 w-7 text-xs p-0"
                onClick={() => setPan(val)}>
                {label}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm"
            onClick={() => setMode(mode === 'free' ? 'setlist' : 'free')}
            className={cn('text-xs whitespace-nowrap h-7 md:h-8',
              mode === 'setlist' && 'border-primary text-primary')}>
            {mode === 'free' ? 'BPM Livre' : 'Modo Setlist'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FooterPlayer;
