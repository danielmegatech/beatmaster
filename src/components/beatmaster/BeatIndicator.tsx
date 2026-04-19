import React from 'react';
import { cn } from '@/lib/utils';

interface BeatIndicatorProps {
  beatsPerMeasure: number;
  currentBeat: number;
  compact?: boolean;
  showLabels?: boolean;
}

const BeatIndicator: React.FC<BeatIndicatorProps> = ({ beatsPerMeasure, currentBeat, compact, showLabels }) => {
  const size = compact ? 'w-4 h-4' : 'w-9 h-9 sm:w-10 sm:h-10';

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {Array.from({ length: beatsPerMeasure }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div
            className={cn(
              size,
              'rounded-full transition-all duration-75 border-2',
              currentBeat === i
                ? i === 0
                  ? 'bg-[hsl(15,90%,55%)] border-[hsl(15,90%,70%)] shadow-[0_0_24px_hsl(15,90%,55%/0.8)] scale-125'
                  : 'bg-primary border-primary/60 shadow-[0_0_18px_hsl(var(--primary)/0.7)] scale-110'
                : 'bg-muted/40 border-border'
            )}
          />
          {showLabels && (
            <span className={cn(
              'text-xs font-semibold leading-none tabular-nums',
              currentBeat === i ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {i + 1}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default BeatIndicator;
