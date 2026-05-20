import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Trash2, Download, Upload, Clock, Coffee, Pencil, Check, X,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Song, Playlist } from '@/types/beatmaster';
import SongCard from './SongCard';

interface SetlistManagerProps {
  playlists: Playlist[];
  setPlaylists: (p: Playlist[] | ((prev: Playlist[]) => Playlist[])) => void;
  activePlaylistId: string | null;
  setActivePlaylistId: (id: string | null) => void;
  activeSongId: string | null;
  selectedSongId: string | null;
  onSelectSong: (song: Song) => void;
  onPlaySong: (song: Song) => void;
  currentBpm: number;
  currentTimeSignature: string;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseDuration(str: string): number | undefined {
  if (!str) return undefined;
  const parts = str.split(':');
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  const n = parseInt(str);
  return isNaN(n) ? undefined : n;
}

// Normalize for dedupe comparison
function songKey(s: { name?: string; artist?: string }): string {
  return `${(s.name || '').trim().toLowerCase()}::${(s.artist || '').trim().toLowerCase()}`;
}

const SetlistManager: React.FC<SetlistManagerProps> = ({
  playlists, setPlaylists, activePlaylistId, setActivePlaylistId,
  activeSongId, selectedSongId, onSelectSong, onPlaySong,
  currentBpm, currentTimeSignature,
}) => {
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Song>>({});
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || null;
  const activeIdx = playlists.findIndex(p => p.id === activePlaylistId);
  const filteredSongs = activePlaylist?.songs || [];
  const totalDuration = activePlaylist?.songs.reduce((acc, s) => acc + (s.duration || 0), 0) || 0;

  const addPlaylist = () => {
    const name = newPlaylistName.trim() || `Setlist ${playlists.length + 1}`;
    const pl: Playlist = { id: crypto.randomUUID(), name, songs: [], band: 'Geral' };
    setPlaylists(prev => [...prev, pl]);
    setActivePlaylistId(pl.id);
    setNewPlaylistName('');
    setShowNewInput(false);
  };

  const deletePlaylist = () => {
    if (!activePlaylistId) return;
    const remaining = playlists.filter(p => p.id !== activePlaylistId);
    setPlaylists(prev => prev.filter(p => p.id !== activePlaylistId));
    setActivePlaylistId(remaining[0]?.id || null);
    setConfirmDelete(false);
    toast({ title: 'Setlist removida', description: activePlaylist?.name });
  };

  const startRename = () => {
    if (!activePlaylist) return;
    setRenameValue(activePlaylist.name);
    setRenaming(true);
  };

  const saveRename = () => {
    const name = renameValue.trim();
    if (!name || !activePlaylistId) { setRenaming(false); return; }
    setPlaylists(prev => prev.map(p => p.id === activePlaylistId ? { ...p, name } : p));
    setRenaming(false);
  };

  const movePlaylist = (dir: -1 | 1) => {
    if (activeIdx < 0) return;
    const newIdx = activeIdx + dir;
    if (newIdx < 0 || newIdx >= playlists.length) return;
    setPlaylists(prev => {
      const arr = [...prev];
      const [item] = arr.splice(activeIdx, 1);
      arr.splice(newIdx, 0, item);
      return arr;
    });
  };

  const updateSongs = (songs: Song[]) => {
    setPlaylists(prev => prev.map(p => p.id === activePlaylistId ? { ...p, songs } : p));
  };

  const addSong = () => {
    if (!activePlaylist) return;
    const song: Song = { id: crypto.randomUUID(), name: 'Nova Música', bpm: currentBpm || 120, timeSignature: currentTimeSignature || '4/4', notes: '', artist: '' };
    updateSongs([song, ...activePlaylist.songs]);
    setEditingSongId(song.id);
    setEditForm(song);
    setDurationInput('');
  };

  const addPause = () => {
    if (!activePlaylist) return;
    const pause: Song = {
      id: crypto.randomUUID(), name: '☕ INTERVALO', bpm: 0, timeSignature: '4/4',
      notes: 'Pausa de 5 minutos', isPause: true, duration: 300,
    };
    const songs = [...activePlaylist.songs];
    const targetId = selectedSongId || activeSongId;
    const idx = targetId ? songs.findIndex(s => s.id === targetId) : -1;
    if (idx >= 0) songs.splice(idx + 1, 0, pause);
    else songs.push(pause);
    updateSongs(songs);
  };

  const deleteSong = (id: string) => {
    if (!activePlaylist) return;
    updateSongs(activePlaylist.songs.filter(s => s.id !== id));
    if (editingSongId === id) setEditingSongId(null);
  };

  const startEdit = (song: Song) => {
    setEditingSongId(song.id);
    setEditForm(song);
    setDurationInput(song.duration ? formatDuration(song.duration) : '');
  };

  const saveEdit = () => {
    if (!activePlaylist || !editingSongId) return;
    const duration = parseDuration(durationInput);
    updateSongs(activePlaylist.songs.map(s => s.id === editingSongId ? { ...s, ...editForm, duration } as Song : s));
    setEditingSongId(null);
  };

  const moveSong = (id: string, dir: 'up' | 'down' | 'top' | 'bottom') => {
    if (!activePlaylist) return;
    const songs = [...activePlaylist.songs];
    const idx = songs.findIndex(s => s.id === id);
    if (idx < 0) return;
    let newIdx = idx;
    if (dir === 'up') newIdx = Math.max(0, idx - 1);
    else if (dir === 'down') newIdx = Math.min(songs.length - 1, idx + 1);
    else if (dir === 'top') newIdx = 0;
    else if (dir === 'bottom') newIdx = songs.length - 1;
    if (newIdx === idx) return;
    const [item] = songs.splice(idx, 1);
    songs.splice(newIdx, 0, item);
    updateSongs(songs);
  };

  const exportXlsx = async () => {
    try {
      if (!playlists.length) {
        toast({ title: 'Nada para exportar', description: 'Sem setlists.', variant: 'destructive' as any });
        return;
      }
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const usedNames = new Set<string>();
      const sanitize = (raw: string, fallback: string) => {
        let n = (raw || fallback).replace(/[:\\/?*\[\]]/g, '_').trim();
        if (!n) n = fallback;
        n = n.substring(0, 31);
        let candidate = n;
        let i = 2;
        while (usedNames.has(candidate.toLowerCase())) {
          const suffix = ` (${i++})`;
          candidate = n.substring(0, 31 - suffix.length) + suffix;
        }
        usedNames.add(candidate.toLowerCase());
        return candidate;
      };
      playlists.forEach((pl, plIdx) => {
        const data = (pl.songs || []).map((s, i) => ({
          '#': i + 1, Banda: pl.band || 'Geral', Nome: s.name, Artista: s.artist || '',
          BPM: s.bpm, Compasso: s.timeSignature,
          'Duração': s.duration ? formatDuration(s.duration) : '',
          Notas: s.notes, Pausa: s.isPause ? 'Sim' : '',
        }));
        const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Nome: '(vazia)' }]);
        XLSX.utils.book_append_sheet(wb, ws, sanitize(pl.name, `Setlist ${plIdx + 1}`));
      });
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      XLSX.writeFile(wb, `BeatMaster_Setlists_${dd}-${mm}-${yyyy}.xlsx`);
      toast({ title: 'Export concluído', description: `${playlists.length} setlists exportadas.` });
    } catch (err: any) {
      console.error('Export XLSX failed:', err);
      toast({ title: 'Erro ao exportar', description: err?.message || 'Falha desconhecida', variant: 'destructive' as any });
    }
  };

  const importXlsx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);

    // Build dedupe set from ALL existing songs
    const existingKeys = new Set<string>();
    for (const pl of playlists) for (const s of pl.songs) existingKeys.add(songKey(s));

    const newPlaylists: Playlist[] = [];
    let totalSongs = 0;
    let skippedDupes = 0;
    let invalidSheets = 0;
    const REQUIRED = ['Nome', 'name', 'Name'];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(ws);
      if (rows.length === 0) continue;

      // Validate required column "Nome"
      const firstRow = rows[0];
      const hasName = REQUIRED.some(k => k in firstRow);
      if (!hasName) {
        invalidSheets++;
        continue;
      }

      const seenInSheet = new Set<string>();
      const songs: Song[] = [];

      for (const r of rows) {
        const name = (r.Nome || r.name || r.Name || '').toString().trim();
        if (!name) continue;
        const artist = (r.Artista || r.artist || r.Artist || '').toString().trim();
        const baseKey = songKey({ name, artist });

        let finalName = name;
        let key = baseKey;
        // Dedupe: if duplicate, suggest related variant ("(v2)", "(v3)"…)
        if (existingKeys.has(key) || seenInSheet.has(key)) {
          let n = 2;
          while (existingKeys.has(songKey({ name: `${name} (v${n})`, artist })) ||
                 seenInSheet.has(songKey({ name: `${name} (v${n})`, artist }))) {
            n++;
          }
          finalName = `${name} (v${n})`;
          key = songKey({ name: finalName, artist });
          skippedDupes++;
        }

        seenInSheet.add(key);
        existingKeys.add(key);

        songs.push({
          id: crypto.randomUUID(),
          name: finalName,
          artist,
          bpm: Number(r.BPM || r.bpm) || 120,
          timeSignature: r.Compasso || r.timeSignature || r['Time Signature'] || '4/4',
          duration: r['Duração'] ? parseDuration(String(r['Duração'])) : undefined,
          notes: r.Notas || r.notes || r.Notes || '',
          isPause: (r.Pausa === 'Sim' || r.isPause === true) ? true : undefined,
        });
      }

      const band = rows[0]?.Banda || rows[0]?.band || 'Geral';
      if (songs.length > 0) {
        newPlaylists.push({ id: crypto.randomUUID(), name: sheetName, songs, band });
        totalSongs += songs.length;
      }
    }

    if (newPlaylists.length > 0) {
      setPlaylists(prev => [...prev, ...newPlaylists]);
      setActivePlaylistId(newPlaylists[0].id);
      const parts = [`${totalSongs} músicas em ${newPlaylists.length} setlist(s)`];
      if (skippedDupes > 0) parts.push(`${skippedDupes} duplicatas renomeadas`);
      if (invalidSheets > 0) parts.push(`${invalidSheets} aba(s) ignorada(s) (sem coluna "Nome")`);
      toast({ title: 'Import concluído', description: parts.join(' · ') });
    } else {
      toast({
        title: 'Nada importado',
        description: invalidSheets > 0
          ? `Arquivo sem coluna obrigatória "Nome" em ${invalidSheets} aba(s).`
          : 'O arquivo não continha músicas válidas.',
        variant: 'destructive',
      });
    }
    e.target.value = '';
  };

  return (
    <div className="glass rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-base sm:text-lg font-semibold text-primary">📋 Setlist</h2>
        {activePlaylist && totalDuration > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />{formatDuration(totalDuration)} · {filteredSongs.length} músicas
          </div>
        )}
      </div>

      {/* Playlist selector: dropdown + actions */}
      <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap min-w-0">
        {renaming ? (
          <>
            <Input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); saveRename(); }
                if (e.key === 'Escape') { e.preventDefault(); setRenaming(false); }
              }}
              className="h-9 flex-1 min-w-0 text-sm"
            />
            <Button size="icon" variant="default" className="h-9 w-9 shrink-0" onClick={saveRename} title="Salvar">
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" onClick={() => setRenaming(false)} title="Cancelar">
              <X className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <Select
              value={activePlaylistId || undefined}
              onValueChange={(v) => setActivePlaylistId(v)}
            >
              <SelectTrigger className="h-9 flex-1 min-w-0 text-sm">
                <SelectValue placeholder="Selecione uma setlist" />
              </SelectTrigger>
              <SelectContent>
                {playlists.map(pl => (
                  <SelectItem key={pl.id} value={pl.id}>
                    {pl.name}{pl.songs.length > 0 ? ` · ${pl.songs.length}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon" variant="outline" className="h-9 w-9 shrink-0"
              disabled={!activePlaylist} onClick={startRename} title="Renomear setlist" aria-label="Renomear setlist"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon" variant="outline" className="h-9 w-9 shrink-0"
              disabled={activeIdx <= 0} onClick={() => movePlaylist(-1)} title="Mover acima" aria-label="Mover setlist para cima"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon" variant="outline" className="h-9 w-9 shrink-0"
              disabled={activeIdx < 0 || activeIdx >= playlists.length - 1}
              onClick={() => movePlaylist(1)} title="Mover abaixo" aria-label="Mover setlist para baixo"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon" variant="outline" className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10"
              disabled={!activePlaylist} onClick={() => setConfirmDelete(true)} title="Excluir setlist" aria-label="Excluir setlist"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon" variant="default" className="h-9 w-9 shrink-0"
              onClick={() => setShowNewInput(v => !v)} title="Nova setlist" aria-label="Nova setlist"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>

      {showNewInput && !renaming && (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            placeholder="Nome da nova setlist…"
            value={newPlaylistName}
            onChange={e => setNewPlaylistName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addPlaylist(); }
              if (e.key === 'Escape') { setShowNewInput(false); setNewPlaylistName(''); }
            }}
            className="h-9 flex-1 text-sm"
          />
          <Button size="sm" onClick={addPlaylist} className="h-9">Criar</Button>
          <Button size="sm" variant="outline" onClick={() => { setShowNewInput(false); setNewPlaylistName(''); }} className="h-9">
            Cancelar
          </Button>
        </div>
      )}

      {/* Action buttons + import/export */}
      {activePlaylist && (
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="default" size="sm" onClick={addSong} className="text-xs gap-1 h-9 flex-1 min-w-[120px]">
            <Plus className="w-3.5 h-3.5" /> Música
          </Button>
          <Button variant="secondary" size="sm" onClick={addPause} className="text-xs gap-1 h-9">
            <Coffee className="w-3.5 h-3.5" /> Pausa
          </Button>
          <Button variant="outline" size="sm" onClick={exportXlsx} className="text-xs gap-1 h-9">
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
          <label>
            <Button variant="outline" size="sm" asChild className="text-xs gap-1 cursor-pointer h-9">
              <span><Upload className="w-3.5 h-3.5" /> Importar</span>
            </Button>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={importXlsx} />
          </label>
        </div>
      )}

      {/* Song list with reorder buttons */}
      {activePlaylist && (
        <div className="space-y-1.5 sm:space-y-2 max-h-[40vh] sm:max-h-[45vh] overflow-y-auto pr-1">
          {filteredSongs.map((song) => {
            const idx = activePlaylist.songs.findIndex(s => s.id === song.id);
            return (
              <SongCard
                key={song.id}
                song={song}
                index={idx}
                total={activePlaylist.songs.length}
                isActive={activeSongId === song.id}
                isSelected={selectedSongId === song.id}
                isEditing={editingSongId === song.id}
                editForm={editForm}
                setEditForm={setEditForm}
                durationInput={durationInput}
                setDurationInput={setDurationInput}
                onSelect={() => onSelectSong(song)}
                onPlay={() => onPlaySong(song)}
                onStartEdit={() => startEdit(song)}
                onSaveEdit={saveEdit}
                onCancelEdit={() => setEditingSongId(null)}
                onDelete={() => deleteSong(song.id)}
                onMove={(dir) => moveSong(song.id, dir)}
              />
            );
          })}
        </div>
      )}

      {!activePlaylist && (
        <div className="text-center text-muted-foreground text-xs sm:text-sm py-6 sm:py-8">
          Crie ou selecione uma setlist para começar.
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir setlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{activePlaylist?.name}</strong>?
              Esta ação removerá {activePlaylist?.songs.length || 0} música(s) e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deletePlaylist} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SetlistManager;
