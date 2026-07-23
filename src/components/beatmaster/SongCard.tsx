import React, { useRef, useCallback, useState, useEffect, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Trash2, Edit2, Check, X, Coffee,
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

  // Auto-fetch cover art when not present (and not a pause).
  const [autoCover, setAutoCover] = useState<string | null>(null);
  useEffect(() => {
    if (song.isPause || song.coverArt) { setAutoCover(null); return; }
    let cancelled = false;
    fetchCoverArt(song.name, song.artist).then(url => {
      if (!cancelled) setAutoCover(url);
    });
    return () => { cancelled = true; };
  }, [song.id, song.name, song.artist, song.coverArt, song.isPause]);

  const cover = song.coverArt || autoCover;
  const initial = (song.artist || song.name || '?').charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'rounded-xl p-2 sm:p-3 border transition-all relative overflow-hidden group/song touch-manipulation',
        song.isPause
          ? 'border-accent bg-accent/10 opacity-70'
          : isActive
            ? 'border-primary bg-primary/15 glow-purple ring-2 ring-primary/40'
            : isSelected
              ? 'border-white/80 bg-muted/40 ring-1 ring-white/40'
              : 'border-border bg-muted/30 hover:bg-muted/50',
      )}
    >
      {/* Active indicator stripe */}
      {isActive && !song.isPause && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" aria-hidden />
      )}

      {isEditing ? (
        <div className="space-y-2 relative z-10">
          <label htmlFor={`song-name-${song.id}`} className="sr-only">Nome</label>
          <Input id={`song-name-${song.id}`} value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nome" className="h-8 text-sm" />
          <label htmlFor={`song-artist-${song.id}`} className="sr-only">Artista</label>
          <Input id={`song-artist-${song.id}`} value={editForm.artist || ''} onChange={e => setEditForm({ ...editForm, artist: e.target.value })} placeholder="Artista" className="h-8 text-sm" />
          <div className="grid grid-cols-3 gap-2">
            <label htmlFor={`song-bpm-${song.id}`} className="sr-only">BPM</label>
            <Input id={`song-bpm-${song.id}`} type="number" value={editForm.bpm || 120} onChange={e => setEditForm({ ...editForm, bpm: +e.target.value })} placeholder="BPM" className="h-8 text-sm" />
            <Select value={editForm.timeSignature || '4/4'} onValueChange={v => setEditForm({ ...editForm, timeSignature: v })}>
              <SelectTrigger className="h-8 text-sm" aria-label="Compasso"><SelectValue /></SelectTrigger>
              <SelectContent>{timeSignatures.map(ts => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}</SelectContent>
            </Select>
            <label htmlFor={`song-duration-${song.id}`} className="sr-only">Duração</label>
            <Input id={`song-duration-${song.id}`} value={durationInput} onChange={e => setDurationInput(e.target.value)} placeholder="m:ss" className="h-8 text-sm" />
          </div>
          <label htmlFor={`song-cover-${song.id}`} className="sr-only">URL da capa</label>
          <Input
            id={`song-cover-${song.id}`}
            value={editForm.coverArt || ''}
            onChange={e => setEditForm({ ...editForm, coverArt: e.target.value })}
            placeholder="URL da capa (jpg/png/gif/webp)"
            className="h-8 text-sm"
          />
          {(editForm.coverArt) && (
            <img src={editForm.coverArt} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
          )}
          <label htmlFor={`song-notes-${song.id}`} className="sr-only">Notas</label>
          <Textarea id={`song-notes-${song.id}`} value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Notas..." className="text-sm min-h-[40px]" />
          <div className="flex gap-1">
            <Button size="sm" onClick={onSaveEdit} className="text-xs gap-1 h-7" aria-label="Salvar música"><Check className="w-3 h-3" /> Salvar</Button>
            <Button size="sm" variant="ghost" onClick={onCancelEdit} className="text-xs gap-1 h-7" aria-label="Cancelar edição"><X className="w-3 h-3" /></Button>
            <Button size="sm" variant="ghost" onClick={onDelete} className="text-xs gap-1 h-7 text-destructive ml-auto" aria-label="Excluir música"><Trash2 className="w-3 h-3" /></Button>
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
                "relative w-9 h-9 sm:w-11 sm:h-11 rounded-lg overflow-hidden shrink-0 group/cover",
                isActive ? "ring-2 ring-primary" : "ring-1 ring-border/40"
              )}>
                {cover ? (
                  <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy"
                    onError={() => setAutoCover(null)} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/40 to-accent/40 text-primary-foreground font-bold text-sm">
                    {initial}
                  </div>
                )}
                {onPlay && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPlay(); }}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-100 sm:opacity-0 sm:group-hover/cover:opacity-100 focus:opacity-100 transition-opacity"
                    title="Tocar agora"
                    aria-label={`Tocar ${song.name}`}
                  >
                    <Play className="w-4 h-4 text-white fill-white" />
                  </button>
                )}
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
              onClick={(e) => { e.stopPropagation(); onMove('top'); }} title="Mover para o início" aria-label="Mover música para o início">
              <ChevronsUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-6" disabled={isFirst}
              onClick={(e) => { e.stopPropagation(); onMove('up'); }} title="Mover para cima" aria-label="Mover música para cima">
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-6" disabled={isLast}
              onClick={(e) => { e.stopPropagation(); onMove('down'); }} title="Mover para baixo" aria-label="Mover música para baixo">
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-6" disabled={isLast}
              onClick={(e) => { e.stopPropagation(); onMove('bottom'); }} title="Mover para o fim" aria-label="Mover música para o fim">
              <ChevronsDown className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-1" onClick={(e) => { e.stopPropagation(); onStartEdit(); }} title="Editar" aria-label="Editar música">
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Remover" aria-label="Remover música">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SongCard;
