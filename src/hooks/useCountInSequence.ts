import { useCallback, useRef, useState } from 'react';
import type { Song, AppMode } from '@/types/beatmaster';

export type CountInPhase = 'idle' | 'announcing' | 'counting';

interface MetroLike {
  isPlaying: boolean;
  bpm: number;
  start: () => void;
  stop: () => void;
  setBpm: (v: number) => void;
  setTimeSignature: (v: string) => void;
  setCountIn: (v: boolean) => void;
}

interface Args {
  metro: MetroLike;
  mode: AppMode;
  activeSong: Song | null;
  ttsEnabled: boolean;
}

function speak(text: string, rate = 1.0): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return resolve();
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = rate;
      u.pitch = 1;
      u.volume = 1;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
    } catch {
      resolve();
    }
  });
}

export function useCountInSequence({ metro, mode, activeSong, ttsEnabled }: Args) {
  const [phase, setPhase] = useState<CountInPhase>('idle');
  const [currentNumber, setCurrentNumber] = useState(0);
  const [announcement, setAnnouncement] = useState<string>('');
  const activeRef = useRef(false);
  const timeoutsRef = useRef<number[]>([]);

  const cancel = useCallback(() => {
    activeRef.current = false;
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    }
    setPhase('idle');
    setCurrentNumber(0);
    setAnnouncement('');
  }, []);

  const wait = (ms: number) =>
    new Promise<void>((r) => {
      const t = window.setTimeout(r, ms);
      timeoutsRef.current.push(t);
    });

  const trigger = useCallback(async () => {
    cancel();
    if (metro.isPlaying) metro.stop();
    metro.setCountIn(false);

    activeRef.current = true;

    const useSong = mode === 'setlist' && !!activeSong && !activeSong.isPause;
    const targetBpm = useSong && activeSong ? activeSong.bpm : metro.bpm;
    const text = useSong && activeSong
      ? (activeSong.artist
          ? `Now playing: ${activeSong.name}, by ${activeSong.artist}.`
          : `Now playing: ${activeSong.name}.`)
      : `BPM: ${metro.bpm}.`;

    if (useSong && activeSong) {
      metro.setBpm(activeSong.bpm);
      metro.setTimeSignature(activeSong.timeSignature);
    }

    setAnnouncement(text);
    setPhase('announcing');
    if (ttsEnabled) {
      await speak(text, 1.0);
    } else {
      await wait(700);
    }
    if (!activeRef.current) return;

    await wait(500);
    if (!activeRef.current) return;

    setPhase('counting');
    const beatMs = 60000 / targetBpm;
    const words = ['one', 'two', 'three', 'four'];
    const speechRate = beatMs >= 600 ? 1.0 : beatMs >= 400 ? 1.3 : 1.6;

    for (let i = 0; i < 4; i++) {
      if (!activeRef.current) return;
      setCurrentNumber(i + 1);
      try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
      void speak(words[i], speechRate);
      await wait(beatMs);
    }
    if (!activeRef.current) return;

    setPhase('idle');
    setCurrentNumber(0);
    setAnnouncement('');
    activeRef.current = false;
    metro.start();
  }, [cancel, metro, mode, activeSong, ttsEnabled]);

  const isActive = phase !== 'idle';

  return { trigger, cancel, phase, currentNumber, announcement, isActive };
}
