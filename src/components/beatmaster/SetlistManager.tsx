import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Download, Upload, Search, Clock, Coffee } from 'lucide-react';
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
  selectedBand,
}) => {
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Song>>({});
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [durationInput, setDurationInput] = useState('');

  // Filtered playlists by selected band (band selector lives in header)
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
      </div>

      {/* Playlist tabs (filtered by band selected in header) */}
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
            <Input
              placeholder="Nova setlist..."
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlaylist(); } }}
              className="h-7 sm:h-8 w-24 sm:w-32 text-xs"
            />
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
                onMove={(dir) => moveSong(song.id, dir)}
              />
            );
          })}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={addSong} className="flex-1 text-xs gap-1 h-8">
              <Plus className="w-3 h-3" /> Adicionar Música
            </Button>
            <Button variant="outline" size="sm" onClick={addPause} className="text-xs gap-1 h-8">
              <Coffee className="w-3 h-3" /> Pausa
            </Button>
          </div>
        </div>
      )}

      {!activePlaylist && (
        <div className="text-center text-muted-foreground text-xs sm:text-sm py-6 sm:py-8">
          Crie ou selecione uma setlist para começar.
        </div>
      )}
    </div>
  );
};

export default SetlistManager;
