import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ResettableSliderProps extends React.ComponentPropsWithoutRef<typeof Slider> {
  resetValue: number;
  onReset?: (value: number) => void;
}

/**
 * Slider that resets to `resetValue` on double-click, with a brief flash feedback.
 * Calls onReset (or onValueChange) with the reset value.
 */
export const ResettableSlider = React.forwardRef<
  React.ElementRef<typeof Slider>,
  ResettableSliderProps
>(({ resetValue, onReset, onValueChange, className, ...props }, ref) => {
  const [flash, setFlash] = React.useState(false);

  const handleDoubleClick = React.useCallback(() => {
    if (onReset) onReset(resetValue);
    else if (onValueChange) onValueChange([resetValue]);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 320);
  }, [resetValue, onReset, onValueChange]);

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={cn(
        "relative rounded-full transition-all",
        flash && "ring-2 ring-primary/70 shadow-[0_0_18px_hsl(var(--primary)/0.55)]"
      )}
      title="Duplo clique para resetar"
    >
      <Slider ref={ref} className={className} onValueChange={onValueChange} {...props} />
    </div>
  );
});
ResettableSlider.displayName = "ResettableSlider";
