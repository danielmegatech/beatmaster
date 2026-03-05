import React from 'react';
import { cn } from '@/lib/utils';

interface BeatIndicatorProps {
  beatsPerMeasure: number;
  currentBeat: number;
  compact?: boolean;
  showLabels?: boolean;
}

const BeatIndicator: React.FC<BeatIndicatorProps> = ({ beatsPerMeasure, currentBeat, compact, showLabels }) => {
  const size = compact ? 'w-3 h-3' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: beatsPerMeasure }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div
            className={cn(
              size,
              'rounded-full transition-all duration-75',
              currentBeat === i
                ? i === 0
                  ? 'bg-[hsl(142,70%,50%)] glow-green scale-125'
                  : 'bg-primary glow-purple scale-110'
                : 'bg-muted border border-border'
            )}
          />
          {showLabels && (
            <span className="text-[9px] text-muted-foreground leading-none">
              {i + 1}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default BeatIndicator;
