import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trash2, Edit2, Check, X, Music, Coffee,
  ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, Play,
} from 'lucide-react';
import type { Song } from '@/types/beatmaster';
import { cn } from '@/lib/utils';
import { fetchCoverArt } from '@/lib/coverArt';

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
  total: number;
  isActive: boolean;
  isSelected?: boolean;
  isEditing: boolean;
  editForm: Partial<Song>;
  setEditForm: (s: Partial<Song>) => void;
  durationInput: string;
  setDurationInput: (v: string) => void;
  onSelect: () => void;
  onPlay?: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onMove: (dir: 'up' | 'down' | 'top' | 'bottom') => void;
}

const SongCard: React.FC<Props> = ({
  song, index, total, isActive, isSelected, isEditing,
  editForm, setEditForm, durationInput, setDurationInput,
  onSelect, onPlay, onStartEdit, onSaveEdit, onCancelEdit, onDelete, onMove,
}) => {
  // Long-press for editing on mobile
  const pressTimerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);

  const startPress = useCallback(() => {
    longPressedRef.current = false;
    pressTimerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      onStartEdit();
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

  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div
      className={cn(
        'rounded-xl p-2 sm:p-3 border transition-all relative overflow-hidden group/song touch-manipulation',
        song.isPause
          ? 'border-accent bg-accent/10 opacity-70'
          : isActive
            ? 'border-primary bg-primary/15 glow-purple ring-2 ring-primary/40'
            : 'border-border bg-muted/30 hover:bg-muted/50',
      )}
    >
      {/* Active indicator stripe */}
      {isActive && !song.isPause && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" aria-hidden />
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
            <span className={cn(
              "text-[10px] sm:text-xs w-5 sm:w-6 text-right shrink-0 tabular-nums",
              isActive ? "text-primary font-bold" : "text-muted-foreground"
            )}>
              {isActive && !song.isPause ? <Play className="w-3 h-3 inline fill-primary text-primary" /> : index + 1}
            </span>
            {song.isPause ? (
              <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent shrink-0" />
            ) : (
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0",
                isActive ? "bg-primary/20" : "bg-muted/50"
              )}>
                <Music className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isActive ? "text-primary" : "text-muted-foreground")} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className={cn("font-medium text-xs sm:text-sm truncate", isActive && !song.isPause && "text-primary")}>
                {song.name}
              </div>
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
            </div>
          </div>

          {/* Reorder + actions buttons */}
          <div className="flex items-center gap-0 shrink-0 opacity-70 group-hover/song:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-6" disabled={isFirst}
              onClick={(e) => { e.stopPropagation(); onMove('top'); }} title="Mover para o início">
              <ChevronsUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-6" disabled={isFirst}
              onClick={(e) => { e.stopPropagation(); onMove('up'); }} title="Mover para cima">
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-6" disabled={isLast}
              onClick={(e) => { e.stopPropagation(); onMove('down'); }} title="Mover para baixo">
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-6" disabled={isLast}
              onClick={(e) => { e.stopPropagation(); onMove('bottom'); }} title="Mover para o fim">
              <ChevronsDown className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={(e) => { e.stopPropagation(); onStartEdit(); }} title="Editar">
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Remover">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SongCard;
