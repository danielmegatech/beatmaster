import React, { useState, useMemo } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Check, Download, Upload, Music, Search, Clock, Coffee, Globe, Loader2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Song, Playlist } from '@/types/beatmaster';
import SongCard from './SongCard';

interface SetlistManagerProps {
  playlists: Playlist[];
  setPlaylists: (p: Playlist[] | ((prev: Playlist[]) => Playlist[])) => void;
  activePlaylistId: string | null;
  setActivePlaylistId: (id: string | null) => void;
  activeSongId: string | null;
  onSelectSong: (song: Song) => void;
  selectedBand: string;
  setSelectedBand: (b: string) => void;
}

interface MBResult {
  id: string;
  name: string;
  artist: string;
  duration?: number;
  timeSignature: string;
  bpm: number;
  album: string;
  year: string;
  coverArt?: string;
}

const coverArtCache = new Map<string, string | undefined>();
const ALL_BANDS = '__all__';

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

const SetlistManager: React.FC<SetlistManagerProps> = ({
  playlists, setPlaylists, activePlaylistId, setActivePlaylistId, activeSongId, onSelectSong,
  selectedBand, setSelectedBand,
}) => {
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Song>>({});
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [durationInput, setDurationInput] = useState('');

  const [mbSearchOpen, setMbSearchOpen] = useState(false);
  const [mbQuery, setMbQuery] = useState('');
  const [mbResults, setMbResults] = useState<MBResult[]>([]);
  const [mbLoading, setMbLoading] = useState(false);
  const [mbError, setMbError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Bands list (unique, sorted)
  const bands = useMemo(() => {
    const set = new Set(playlists.map(p => p.band || 'Geral'));
    return Array.from(set).sort();
  }, [playlists]);

  // Filtered playlists by selected band
  const visiblePlaylists = useMemo(() => {
    if (selectedBand === ALL_BANDS) return playlists;
    return playlists.filter(p => (p.band || 'Geral') === selectedBand);
  }, [playlists, selectedBand]);

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || null;

  const filteredSongs = activePlaylist?.songs.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.artist || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.notes.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalDuration = activePlaylist?.songs.reduce((acc, s) => acc + (s.duration || 0), 0) || 0;

  const addPlaylist = () => {
    const name = newPlaylistName.trim() || `Setlist ${playlists.length + 1}`;
    const band = selectedBand === ALL_BANDS ? 'Geral' : selectedBand;
    const pl: Playlist = { id: crypto.randomUUID(), name, songs: [], band };
    setPlaylists(prev => [...prev, pl]);
    setActivePlaylistId(pl.id);
    setNewPlaylistName('');
  };

  const deletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (activePlaylistId === id) {
      const remaining = visiblePlaylists.filter(p => p.id !== id);
      setActivePlaylistId(remaining[0]?.id || null);
    }
  };

  const updateSongs = (songs: Song[]) => {
    setPlaylists(prev => prev.map(p => p.id === activePlaylistId ? { ...p, songs } : p));
  };

  const addSong = () => {
    if (!activePlaylist) return;
    const song: Song = { id: crypto.randomUUID(), name: 'Nova Música', bpm: 120, timeSignature: '4/4', notes: '', artist: '' };
    updateSongs([...activePlaylist.songs, song]);
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
    updateSongs([...activePlaylist.songs, pause]);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activePlaylist) return;
    const oldIdx = activePlaylist.songs.findIndex(s => s.id === active.id);
    const newIdx = activePlaylist.songs.findIndex(s => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    updateSongs(arrayMove(activePlaylist.songs, oldIdx, newIdx));
  };

  const searchMusicBrainz = async () => {
    if (!mbQuery.trim()) return;
    setMbLoading(true);
    setMbError('');
    setMbResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('musicbrainz-search', {
        body: { query: mbQuery.trim(), limit: 15 },
      });
      if (error) throw error;
      const results: MBResult[] = data?.results || [];
      results.forEach(r => { if (r.coverArt) coverArtCache.set(r.id, r.coverArt); });
      setMbResults(results);
      if (!results.length) setMbError('Nenhum resultado encontrado.');
    } catch (err: any) {
      setMbError(err.message || 'Erro ao buscar.');
    } finally {
      setMbLoading(false);
    }
  };

  const addFromMB = (result: MBResult) => {
    if (!activePlaylist) return;
    const song: Song = {
      id: crypto.randomUUID(),
      name: result.name,
      artist: result.artist,
      bpm: result.bpm,
      timeSignature: result.timeSignature,
      duration: result.duration,
      coverArt: result.coverArt || coverArtCache.get(result.id),
      album: result.album,
      notes: result.album ? `Álbum: ${result.album}${result.year ? ` (${result.year})` : ''}` : '',
    };
    updateSongs([...activePlaylist.songs, song]);
  };

  const exportXlsx = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    for (const pl of playlists) {
      const data = pl.songs.map((s, i) => ({
        '#': i + 1, Banda: pl.band || 'Geral', Nome: s.name, Artista: s.artist || '',
        BPM: s.bpm, Compasso: s.timeSignature,
        'Duração': s.duration ? formatDuration(s.duration) : '',
        Notas: s.notes, Pausa: s.isPause ? 'Sim' : '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, pl.name.substring(0, 31));
    }
    XLSX.writeFile(wb, 'BeatMaster_Setlists.xlsx');
  };

  const importXlsx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data);
    const newPlaylists: Playlist[] = [];
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<any>(ws);
      const songs: Song[] = rows.map((r: any) => ({
        id: crypto.randomUUID(),
        name: r.Nome || r.name || r.Name || 'Sem nome',
        artist: r.Artista || r.artist || r.Artist || '',
        bpm: Number(r.BPM || r.bpm) || 120,
        timeSignature: r.Compasso || r.timeSignature || r['Time Signature'] || '4/4',
        duration: r['Duração'] ? parseDuration(String(r['Duração'])) : undefined,
        notes: r.Notas || r.notes || r.Notes || '',
        isPause: (r.Pausa === 'Sim' || r.isPause === true) ? true : undefined,
      }));
      const band = rows[0]?.Banda || rows[0]?.band || 'Geral';
      if (songs.length > 0) {
        newPlaylists.push({ id: crypto.randomUUID(), name: sheetName, songs, band });
      }
    }
    if (newPlaylists.length > 0) {
      setPlaylists(prev => [...prev, ...newPlaylists]);
      setActivePlaylistId(newPlaylists[0].id);
    }
    e.target.value = '';
  };

  return (
    <div className="glass rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4 min-w-0">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-base sm:text-lg font-semibold text-primary">📋 Setlist Manager</h2>

        {/* Band selector */}
        <div className="flex items-center gap-1.5 min-w-0">
          <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Select value={selectedBand} onValueChange={setSelectedBand}>
            <SelectTrigger className="h-8 text-xs w-[160px] sm:w-[200px]">
              <SelectValue placeholder="Banda" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              <SelectItem value={ALL_BANDS}>🎵 Todas as Bandas</SelectItem>
              {bands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Playlist tabs (filtered by band) */}
      <ScrollArea className="w-full">
        <div className="flex gap-1.5 sm:gap-2 items-center pb-2 min-w-max">
          {visiblePlaylists.map(pl => (
            <div key={pl.id} className="flex items-center gap-0.5 shrink-0">
              <Button
                variant={activePlaylistId === pl.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePlaylistId(pl.id)}
                className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
              >
                {pl.name}
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={() => deletePlaylist(pl.id)}>
                <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-1 shrink-0">
            <Input placeholder="Nova setlist..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} className="h-7 sm:h-8 w-24 sm:w-32 text-xs" />
            <Button size="icon" variant="outline" className="h-7 w-7 sm:h-8 sm:w-8" onClick={addPlaylist}><Plus className="w-3 h-3" /></Button>
          </div>
        </div>
      </ScrollArea>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button variant="outline" size="sm" onClick={exportXlsx} disabled={playlists.length === 0} className="text-[10px] sm:text-xs gap-1 h-7">
          <Download className="w-3 h-3" /> Exportar
        </Button>
        <label>
          <Button variant="outline" size="sm" asChild className="text-[10px] sm:text-xs gap-1 cursor-pointer h-7">
            <span><Upload className="w-3 h-3" /> Importar</span>
          </Button>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={importXlsx} />
        </label>
        {activePlaylist && (
          <Button variant="outline" size="sm"
            onClick={() => { setMbSearchOpen(true); setMbQuery(''); setMbResults([]); setMbError(''); }}
            className="text-[10px] sm:text-xs gap-1 h-7">
            <Globe className="w-3 h-3" /> Buscar Online
          </Button>
        )}
        {activePlaylist && (
          <div className="flex-1 min-w-[120px] relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar música ou artista..." className="h-7 text-xs pl-7" />
          </div>
        )}
        {activePlaylist && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{filteredSongs.length} músicas</span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />{formatDuration(totalDuration)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Song list with DnD */}
      {activePlaylist && (
        <div className="space-y-1.5 sm:space-y-2 max-h-[40vh] sm:max-h-[45vh] overflow-y-auto pr-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredSongs.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {filteredSongs.map((song) => {
                const idx = activePlaylist.songs.findIndex(s => s.id === song.id);
                return (
                  <SongCard
                    key={song.id}
                    song={song}
                    index={idx}
                    isActive={activeSongId === song.id}
                    isEditing={editingSongId === song.id}
                    editForm={editForm}
                    setEditForm={setEditForm}
                    durationInput={durationInput}
                    setDurationInput={setDurationInput}
                    onSelect={() => onSelectSong(song)}
                    onStartEdit={() => startEdit(song)}
                    onSaveEdit={saveEdit}
                    onCancelEdit={() => setEditingSongId(null)}
                    onDelete={() => deleteSong(song.id)}
                  />
                );
              })}
            </SortableContext>
          </DndContext>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={addSong} className="flex-1 text-xs gap-1 h-8">
              <Plus className="w-3 h-3" /> Adicionar Música
            </Button>
            <Button variant="outline" size="sm" onClick={addPause} className="text-xs gap-1 h-8">
              <Coffee className="w-3 h-3" /> Pausa
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground/60 text-center pt-1">
            💡 Arraste o ⋮⋮ para reordenar · Segure 0,5s ou clique direito para editar
          </p>
        </div>
      )}

      {!activePlaylist && (
        <div className="text-center text-muted-foreground text-xs sm:text-sm py-6 sm:py-8">
          Crie ou selecione uma setlist para começar.
        </div>
      )}

      {/* MusicBrainz Search */}
      <Dialog open={mbSearchOpen} onOpenChange={setMbSearchOpen}>
        <DialogContent className="glass border-border max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Buscar Música Online
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={mbQuery} onChange={e => setMbQuery(e.target.value)}
              placeholder="Nome da música ou artista..." className="text-sm"
              onKeyDown={e => { if (e.key === 'Enter') searchMusicBrainz(); }} />
            <Button onClick={searchMusicBrainz} disabled={mbLoading || !mbQuery.trim()} className="gap-1 shrink-0">
              {mbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </Button>
          </div>
          {mbError && <p className="text-xs text-destructive">{mbError}</p>}
          {mbLoading && (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-2.5">
                  <Skeleton className="w-10 h-10 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <ScrollArea className="flex-1 max-h-[400px]">
            <div className="space-y-1.5 pr-2">
              {mbResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in">
                  {result.coverArt ? (
                    <img src={result.coverArt} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-sm" loading="lazy" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Music className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{result.name}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {result.artist && <span className="text-primary/70">{result.artist}</span>}
                      {result.album && <span> · {result.album}</span>}
                      {result.year && <span> ({result.year})</span>}
                      {result.duration && <span> · {formatDuration(result.duration)}</span>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1 shrink-0" onClick={() => addFromMB(result)}>
                    <Plus className="w-3 h-3" /> Adicionar
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
          <p className="text-[9px] text-muted-foreground text-center">
            Dados via MusicBrainz · BPM padrão: 120 (ajuste manualmente)
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SetlistManager;
