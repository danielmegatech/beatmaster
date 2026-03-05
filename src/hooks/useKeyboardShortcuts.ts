import { useEffect, useCallback, useRef } from 'react';
import type { AppMode } from '@/types/beatmaster';

interface KeyboardShortcutsConfig {
  onPadTrigger: (padId: number, type: 'down' | 'up') => void;
  onToggleMetronome: () => void;
  onTapTempo: () => void;
  onNavigateSong: (dir: 1 | -1) => void;
  onBpmChange: (delta: number) => void;
  onMasterVolumeChange: (delta: number) => void;
  onPanSet: (value: number) => void;
  onCyclePlaylist: () => void;
  mode: AppMode;
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const configRef = useRef(config);
  configRef.current = config;

  const pressedPads = useRef<Set<string>>(new Set());

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const c = configRef.current;
    const key = e.key;

    // Pads 1-5
    if (key >= '1' && key <= '5' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const padId = parseInt(key) - 1;
      if (!pressedPads.current.has(key)) {
        pressedPads.current.add(key);
        c.onPadTrigger(padId, 'down');
      }
      return;
    }

    // Space - toggle metronome
    if (key === ' ') {
      e.preventDefault();
      c.onToggleMetronome();
      return;
    }

    // T - tap tempo
    if (key === 't' || key === 'T') {
      e.preventDefault();
      c.onTapTempo();
      return;
    }

    // Arrows
    if (key === 'ArrowLeft') {
      e.preventDefault();
      if (c.mode === 'setlist') c.onNavigateSong(-1);
      else c.onBpmChange(-10);
      return;
    }
    if (key === 'ArrowRight') {
      e.preventDefault();
      if (c.mode === 'setlist') c.onNavigateSong(1);
      else c.onBpmChange(10);
      return;
    }
    if (key === 'ArrowUp') {
      e.preventDefault();
      c.onMasterVolumeChange(0.05);
      return;
    }
    if (key === 'ArrowDown') {
      e.preventDefault();
      c.onMasterVolumeChange(-0.05);
      return;
    }

    // L/C/R - pan
    if (key === 'l' || key === 'L') { e.preventDefault(); c.onPanSet(-1); return; }
    if (key === 'c' || key === 'C') { e.preventDefault(); c.onPanSet(0); return; }
    if (key === 'r' || key === 'R') { e.preventDefault(); c.onPanSet(1); return; }

    // Ctrl+P - cycle playlists
    if ((e.ctrlKey || e.metaKey) && (key === 'p' || key === 'P')) {
      e.preventDefault();
      c.onCyclePlaylist();
      return;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    if (key >= '1' && key <= '5') {
      pressedPads.current.delete(key);
      configRef.current.onPadTrigger(parseInt(key) - 1, 'up');
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
