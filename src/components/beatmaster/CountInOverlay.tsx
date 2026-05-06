import React from 'react';
import { cn } from '@/lib/utils';
import type { CountInPhase } from '@/hooks/useCountInSequence';

interface Props {
  phase: CountInPhase;
  currentNumber: number;
  announcement: string;
}

const CountInOverlay: React.FC<Props> = ({ phase, currentNumber, announcement }) => {
  if (phase === 'idle') return null;
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in">
      <div className="text-center px-6">
        {phase === 'announcing' && (
          <>
            <div className="text-xs sm:text-sm uppercase tracking-[0.3em] text-primary font-bold mb-3 animate-pulse">
              🎤 Announcing...
            </div>
            <div className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground max-w-2xl">
              {announcement}
            </div>
          </>
        )}
        {phase === 'counting' && currentNumber > 0 && (
          <div
            key={currentNumber}
            className={cn(
              'font-bold tabular-nums leading-none animate-scale-in',
              'text-[28vh] sm:text-[34vh]',
              currentNumber === 1 ? 'text-accent drop-shadow-[0_0_40px_hsl(var(--accent))]'
                                  : 'text-primary drop-shadow-[0_0_40px_hsl(var(--primary))]'
            )}
          >
            {currentNumber}
          </div>
        )}
      </div>
    </div>
  );
};

export default CountInOverlay;
