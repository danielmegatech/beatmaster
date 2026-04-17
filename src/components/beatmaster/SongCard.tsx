import React, { useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit2, Check, X, Music, Coffee, GripVertical } from 'lucide-react';
import type { Song } from '@/types/beatmaster';
import { cn } from '@/lib/utils';

const timeSignatures = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '7/4', '9/8', '12/8', '13/8'];

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  song: Song;
  index: number;
  isActive: boolean;
  isEditing: boolean;
  editForm: Partial<Song>;
  setEditForm: (s: Partial<Song>) => void;
  durationInput: string;
  setDurationInput: (v: string) => void;
  onSelect: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}

const SongCard: React.FC<Props> = ({
  song, index, isActive, isEditing,
  editForm, setEditForm, durationInput, setDurationInput,
  onSelect, onStartEdit, onSaveEdit, onCancelEdit, onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: song.id,
    disabled: isEditing,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  // Long-press for editing on mobile / right-click on desktop
  const pressTimerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const startPress = useCallback(() => {
    longPressedRef.current = false;
    pressTimerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      onStartEdit();
      // Haptic feedback if available
      if ('vibrate' in navigator) navigator.vibrate(50);
    }, 500);
  }, [onStartEdit]);

  const cancelPress = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (longPressedRef.current || isEditing || song.isPause) return;
    onSelect();
  }, [isEditing, song.isPause, onSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onStartEdit();
  }, [onStartEdit]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl p-2 sm:p-3 border transition-all relative overflow-hidden group/song touch-manipulation',
        song.isPause
          ? 'border-accent bg-accent/10 opacity-70'
          : isActive
            ? 'border-primary bg-primary/10 glow-purple'
            : 'border-border bg-muted/30 hover:bg-muted/50',
        isDragging && 'shadow-2xl ring-2 ring-primary'
      )}
    >
      {/* Cover art bg for active */}
      {!song.isPause && song.coverArt && isActive && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.08] pointer-events-none"
          style={{ backgroundImage: `url(${song.coverArt})` }}
        />
      )}

      {isEditing ? (
        <div className="space-y-2 relative z-10">
          <Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nome" className="h-8 text-sm" />
          <Input value={editForm.artist || ''} onChange={e => setEditForm({ ...editForm, artist: e.target.value })} placeholder="Artista" className="h-8 text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <Input type="number" value={editForm.bpm || 120} onChange={e => setEditForm({ ...editForm, bpm: +e.target.value })} placeholder="BPM" className="h-8 text-sm" />
            <Select value={editForm.timeSignature || '4/4'} onValueChange={v => setEditForm({ ...editForm, timeSignature: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{timeSignatures.map(ts => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}</SelectContent>
            </Select>
            <Input value={durationInput} onChange={e => setDurationInput(e.target.value)} placeholder="m:ss" className="h-8 text-sm" />
          </div>
          <Textarea value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Notas..." className="text-sm min-h-[40px]" />
          <div className="flex gap-1">
            <Button size="sm" onClick={onSaveEdit} className="text-xs gap-1 h-7"><Check className="w-3 h-3" /> Salvar</Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit} className="text-xs gap-1 h-7"><X className="w-3 h-3" /></Button>
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-xs gap-1 h-7 text-destructive ml-auto"><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center justify-between gap-2 relative z-10 cursor-pointer select-none"
          onClick={handleClick}
          onContextMenu={handleContextMenu}
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Drag handle */}
            <button
              type="button"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="touch-none p-1 -ml-1 text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
              aria-label="Arrastar para reordenar"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] sm:text-xs text-muted-foreground w-4 sm:w-5 text-right shrink-0">{index + 1}</span>
            {song.isPause ? (
              <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent shrink-0" />
            ) : song.coverArt ? (
              <img src={song.coverArt} alt="" className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg object-cover shrink-0 shadow-md ring-1 ring-border/20" loading="lazy" />
            ) : (
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-medium text-xs sm:text-sm truncate">{song.name}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {song.isPause
                  ? formatDuration(song.duration)
                  : <>
                      {song.artist && <span className="text-primary/70">{song.artist} · </span>}
                      {song.bpm} BPM · {song.timeSignature}
                      {song.duration ? ` · ${formatDuration(song.duration)}` : ''}
                    </>
                }
              </div>
              {song.notes && !song.isPause && (
                <div className="text-[9px] text-muted-foreground/60 truncate mt-0.5">{song.notes}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover/song:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onStartEdit(); }} title="Editar (clique direito ou segure)">
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SongCard;
