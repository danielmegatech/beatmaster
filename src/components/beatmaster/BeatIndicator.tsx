import React from 'react';
import { cn } from '@/lib/utils';

interface BeatIndicatorProps {
  beatsPerMeasure: number;
  currentBeat: number;
  compact?: boolean;
}

const BeatIndicator: React.FC<BeatIndicatorProps> = ({ beatsPerMeasure, currentBeat, compact }) => {
  const size = compact ? 'w-3 h-3' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: beatsPerMeasure }).map((_, i) => (
        <div
          key={i}
          className={cn(
            size,
            'rounded-full transition-all duration-75',
            currentBeat === i
              ? i === 0
                ? 'bg-[hsl(45,90%,60%)] glow-beat scale-125'
                : 'bg-primary glow-purple scale-110'
              : 'bg-muted border border-border'
          )}
        />
      ))}
    </div>
  );
};

export default BeatIndicator;
