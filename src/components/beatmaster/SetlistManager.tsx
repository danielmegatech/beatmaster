import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit2, Check, X, Download, Upload, ChevronUp, ChevronDown, Music, Search, Clock, Coffee, Globe, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Song, Playlist } from '@/types/beatmaster';
import { cn } from '@/lib/utils';

interface SetlistManagerProps {
  playlists: Playlist[];
  setPlaylists: (p: Playlist[] | ((prev: Playlist[]) => Playlist[])) => void;
  activePlaylistId: string | null;
  setActivePlaylistId: (id: string | null) => void;
  activeSongId: string | null;
  onSelectSong: (song: Song) => void;
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

const timeSignatures = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '7/4', '9/8', '12/8', '13/8'];

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseDuration(str: string): number | undefined {
  if (!str) return undefined;
  const parts = str.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  const n = parseInt(str);
  return isNaN(n) ? undefined : n;
}

const SetlistManager: React.FC<SetlistManagerProps> = ({
  playlists, setPlaylists, activePlaylistId, setActivePlaylistId, activeSongId, onSelectSong,
}) => {
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Song>>({});
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [durationInput, setDurationInput] = useState('');

  // MusicBrainz search
  const [mbSearchOpen, setMbSearchOpen] = useState(false);
  const [mbQuery, setMbQuery] = useState('');
  const [mbResults, setMbResults] = useState<MBResult[]>([]);
  const [mbLoading, setMbLoading] = useState(false);
  const [mbError, setMbError] = useState('');

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || null;

  const filteredSongs = activePlaylist?.songs.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.artist || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.notes.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalDuration = activePlaylist?.songs.reduce((acc, s) => acc + (s.duration || 0), 0) || 0;

  const addPlaylist = () => {
    const name = newPlaylistName.trim() || `Setlist ${playlists.length + 1}`;
    const pl: Playlist = { id: crypto.randomUUID(), name, songs: [] };
    setPlaylists(prev => [...prev, pl]);
    setActivePlaylistId(pl.id);
    setNewPlaylistName('');
  };

  const deletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (activePlaylistId === id) setActivePlaylistId(playlists.length > 1 ? playlists.find(p => p.id !== id)?.id || null : null);
  };

  const renamePlaylist = (id: string) => {
    setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: renameVal } : p));
    setRenamingId(null);
  };

  const updateSongs = (songs: Song[]) => {
    setPlaylists(prev => prev.map(p => p.id === activePlaylistId ? { ...p, songs } : p));
  };

  const addSong = () => {
    if (!activePlaylist) return;
    const song: Song = { id: crypto.randomUUID(), name: 'Nova Música', bpm: 120, timeSignature: '4/4', notes: '', artist: '' };
    updateSongs([...activePlaylist.songs, song]);
  };

  const addPause = () => {
    if (!activePlaylist) return;
    const pause: Song = {
      id: crypto.randomUUID(),
      name: '☕ INTERVALO',
      bpm: 0,
      timeSignature: '4/4',
      notes: 'Pausa de 5 minutos',
      isPause: true,
      duration: 300,
    };
    updateSongs([...activePlaylist.songs, pause]);
  };

  const deleteSong = (id: string) => {
    if (!activePlaylist) return;
    updateSongs(activePlaylist.songs.filter(s => s.id !== id));
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

  const moveSong = (index: number, dir: -1 | 1) => {
    if (!activePlaylist) return;
    const songs = [...activePlaylist.songs];
    const newIdx = index + dir;
    if (newIdx < 0 || newIdx >= songs.length) return;
    [songs[index], songs[newIdx]] = [songs[newIdx], songs[index]];
    updateSongs(songs);
  };

  // MusicBrainz search
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
      setMbResults(data?.results || []);
      if (!data?.results?.length) setMbError('Nenhum resultado encontrado.');
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
      coverArt: result.coverArt,
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
        '#': i + 1,
        Nome: s.name,
        Artista: s.artist || '',
        BPM: s.bpm,
        Compasso: s.timeSignature,
        'Duração': s.duration ? formatDuration(s.duration) : '',
        Notas: s.notes,
        Pausa: s.isPause ? 'Sim' : '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const sheetName = pl.name.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
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
      if (songs.length > 0) {
        newPlaylists.push({ id: crypto.randomUUID(), name: sheetName, songs });
      }
    }
    if (newPlaylists.length > 0) {
      setPlaylists(prev => [...prev, ...newPlaylists]);
      setActivePlaylistId(newPlaylists[0].id);
    }
    e.target.value = '';
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4">
      <h2 className="text-base sm:text-lg font-semibold text-primary">📋 Setlist Manager</h2>

      {/* Playlist tabs */}
      <ScrollArea className="w-full">
        <div className="flex gap-1.5 sm:gap-2 items-center pb-2 min-w-max">
          {playlists.map(pl => (
            <div key={pl.id} className="flex items-center gap-0.5 shrink-0">
              {renamingId === pl.id ? (
                <div className="flex gap-1">
                  <Input value={renameVal} onChange={e => setRenameVal(e.target.value)} className="h-7 w-28 text-xs" />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => renamePlaylist(pl.id)}><Check className="w-3 h-3" /></Button>
                </div>
              ) : (
                <Button
                  variant={activePlaylistId === pl.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActivePlaylistId(pl.id)}
                  onDoubleClick={() => { setRenamingId(pl.id); setRenameVal(pl.name); }}
                  className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                >
                  {pl.name}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={() => deletePlaylist(pl.id)}>
                <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-1 shrink-0">
            <Input placeholder="Nova..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} className="h-7 sm:h-8 w-20 sm:w-28 text-xs" />
            <Button size="icon" variant="outline" className="h-7 w-7 sm:h-8 sm:w-8" onClick={addPlaylist}><Plus className="w-3 h-3" /></Button>
          </div>
        </div>
      </ScrollArea>

      {/* Import/Export + Search */}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setMbSearchOpen(true); setMbQuery(''); setMbResults([]); setMbError(''); }}
            className="text-[10px] sm:text-xs gap-1 h-7"
          >
            <Globe className="w-3 h-3" /> Buscar Online
          </Button>
        )}
        {activePlaylist && (
          <div className="flex-1 min-w-[120px] relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar música ou artista..."
              className="h-7 text-xs pl-7"
            />
          </div>
        )}
        {activePlaylist && (
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{filteredSongs.length} músicas</span>
            {totalDuration > 0 && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatDuration(totalDuration)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Song list */}
      {activePlaylist && (
        <div className="space-y-1.5 sm:space-y-2 max-h-[350px] sm:max-h-[400px] overflow-y-auto pr-1">
          {filteredSongs.map((song) => {
            const idx = activePlaylist.songs.findIndex(s => s.id === song.id);
            return (
              <div
                key={song.id}
                className={cn(
                  'rounded-lg sm:rounded-xl p-2 sm:p-3 border transition-all cursor-pointer',
                  song.isPause
                    ? 'border-accent bg-accent/10 opacity-70'
                    : activeSongId === song.id
                      ? 'border-primary bg-primary/10 glow-purple'
                      : 'border-border bg-muted/30 hover:bg-muted/50'
                )}
                onClick={() => { if (editingSongId !== song.id && !song.isPause) onSelectSong(song); }}
              >
                {editingSongId === song.id ? (
                  <div className="space-y-2">
                    <Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nome" className="h-7 sm:h-8 text-xs sm:text-sm" />
                    <Input value={editForm.artist || ''} onChange={e => setEditForm({ ...editForm, artist: e.target.value })} placeholder="Artista" className="h-7 sm:h-8 text-xs sm:text-sm" />
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" value={editForm.bpm || 120} onChange={e => setEditForm({ ...editForm, bpm: +e.target.value })} placeholder="BPM" className="h-7 sm:h-8 text-xs sm:text-sm" />
                      <Select value={editForm.timeSignature || '4/4'} onValueChange={v => setEditForm({ ...editForm, timeSignature: v })}>
                        <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{timeSignatures.map(ts => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input
                        value={durationInput}
                        onChange={e => setDurationInput(e.target.value)}
                        placeholder="m:ss"
                        className="h-7 sm:h-8 text-xs sm:text-sm"
                      />
                    </div>
                    <Textarea value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Notas..." className="text-xs sm:text-sm min-h-[36px]" />
                    <div className="flex gap-1">
                      <Button size="sm" onClick={saveEdit} className="text-[10px] sm:text-xs gap-1 h-7"><Check className="w-3 h-3" /> Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSongId(null)} className="text-[10px] sm:text-xs gap-1 h-7"><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <span className="text-[10px] sm:text-xs text-muted-foreground w-4 sm:w-5 text-right shrink-0">{idx + 1}</span>
                      {song.isPause ? (
                        <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent shrink-0" />
                      ) : (
                        <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-xs sm:text-sm truncate">{song.name}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {song.isPause
                            ? formatDuration(song.duration)
                            : <>
                                {song.artist && <span className="text-primary/70">{song.artist} · </span>}
                                {song.bpm} BPM · {song.timeSignature}
                                {song.duration ? ` · ${formatDuration(song.duration)}` : ''}
                                {song.notes ? ` · ${song.notes}` : ''}
                              </>
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={(e) => { e.stopPropagation(); moveSong(idx, -1); }}>
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={(e) => { e.stopPropagation(); moveSong(idx, 1); }}>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={(e) => { e.stopPropagation(); startEdit(song); }}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={(e) => { e.stopPropagation(); deleteSong(song.id); }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addSong} className="flex-1 text-[10px] sm:text-xs gap-1 h-7 sm:h-8">
              <Plus className="w-3 h-3" /> Adicionar Música
            </Button>
            <Button variant="outline" size="sm" onClick={addPause} className="text-[10px] sm:text-xs gap-1 h-7 sm:h-8">
              <Coffee className="w-3 h-3" /> Pausa
            </Button>
          </div>
        </div>
      )}

      {!activePlaylist && (
        <div className="text-center text-muted-foreground text-xs sm:text-sm py-6 sm:py-8">
          Crie ou selecione uma playlist para começar.
        </div>
      )}

      {/* MusicBrainz Search Modal */}
      <Dialog open={mbSearchOpen} onOpenChange={setMbSearchOpen}>
        <DialogContent className="glass border-border max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Buscar Música Online
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={mbQuery}
              onChange={e => setMbQuery(e.target.value)}
              placeholder="Nome da música ou artista..."
              className="text-sm"
              onKeyDown={e => { if (e.key === 'Enter') searchMusicBrainz(); }}
            />
            <Button onClick={searchMusicBrainz} disabled={mbLoading || !mbQuery.trim()} className="gap-1 shrink-0">
              {mbLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </Button>
          </div>

          {mbError && (
            <p className="text-xs text-destructive">{mbError}</p>
          )}

          <ScrollArea className="flex-1 max-h-[400px]">
            <div className="space-y-1.5 pr-2">
              {mbResults.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{result.name}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {result.artist && <span className="text-primary/70">{result.artist}</span>}
                      {result.album && <span> · {result.album}</span>}
                      {result.year && <span> ({result.year})</span>}
                      {result.duration && <span> · {formatDuration(result.duration)}</span>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1 shrink-0"
                    onClick={() => addFromMB(result)}
                  >
                    <Plus className="w-3 h-3" /> Adicionar
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>

          <p className="text-[9px] text-muted-foreground text-center">
            Dados fornecidos por MusicBrainz · BPM padrão: 120 (ajuste manualmente)
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SetlistManager;
