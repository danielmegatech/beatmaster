import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
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
  mode: AppMode;
  setMode: (m: AppMode) => void;
  activeSong: Song | null;
  onPrev: () => void;
  onNext: () => void;
}

const FooterPlayer: React.FC<FooterPlayerProps> = ({
  isPlaying, toggle, bpm, currentBeat, beatsPerMeasure,
  masterVolume, setMasterVolume, mode, setMode,
  activeSong, onPrev, onNext,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Song info */}
        <div className="hidden sm:flex flex-col min-w-0 w-36">
          {activeSong ? (
            <>
              <div className="text-sm font-medium truncate">{activeSong.name}</div>
              <div className="text-xs text-muted-foreground">{activeSong.bpm} BPM · {activeSong.timeSignature}</div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">Modo Livre</div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} disabled={mode === 'free'}>
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button onClick={toggle} size="icon" className="rounded-full h-10 w-10 glow-purple">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext} disabled={mode === 'free'}>
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Beat indicator + BPM */}
        <div className="flex items-center gap-3">
          <BeatIndicator beatsPerMeasure={beatsPerMeasure} currentBeat={currentBeat} compact />
          <span className="text-sm tabular-nums font-semibold text-foreground">{bpm}</span>
        </div>

        {/* Master volume */}
        <div className="hidden sm:flex items-center gap-2 w-32">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <Slider value={[masterVolume]} onValueChange={([v]) => setMasterVolume(v)} min={0} max={1} step={0.01} />
        </div>

        {/* Mode toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMode(mode === 'free' ? 'setlist' : 'free')}
          className={cn(
            'text-xs whitespace-nowrap',
            mode === 'setlist' && 'border-primary text-primary'
          )}
        >
          {mode === 'free' ? 'Livre' : 'Setlist'}
        </Button>
      </div>
    </div>
  );
};

export default FooterPlayer;
