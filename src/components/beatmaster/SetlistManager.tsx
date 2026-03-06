import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit2, Check, X, Download, Upload, ChevronUp, ChevronDown, Music, Search } from 'lucide-react';
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

const timeSignatures = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '7/4', '9/8', '12/8', '13/8'];

const SetlistManager: React.FC<SetlistManagerProps> = ({
  playlists, setPlaylists, activePlaylistId, setActivePlaylistId, activeSongId, onSelectSong,
}) => {
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Song>>({});
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || null;

  const filteredSongs = activePlaylist?.songs.filter(s =>
    !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.notes.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
    const song: Song = { id: crypto.randomUUID(), name: 'Nova Música', bpm: 120, timeSignature: '4/4', notes: '' };
    updateSongs([...activePlaylist.songs, song]);
  };

  const deleteSong = (id: string) => {
    if (!activePlaylist) return;
    updateSongs(activePlaylist.songs.filter(s => s.id !== id));
  };

  const startEdit = (song: Song) => {
    setEditingSongId(song.id);
    setEditForm(song);
  };

  const saveEdit = () => {
    if (!activePlaylist || !editingSongId) return;
    updateSongs(activePlaylist.songs.map(s => s.id === editingSongId ? { ...s, ...editForm } as Song : s));
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

  const exportXlsx = async () => {
    if (!activePlaylist) return;
    const XLSX = await import('xlsx');
    const data = activePlaylist.songs.map((s, i) => ({
      '#': i + 1, Nome: s.name, BPM: s.bpm, Compasso: s.timeSignature, Notas: s.notes,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activePlaylist.name);
    XLSX.writeFile(wb, `${activePlaylist.name}.xlsx`);
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
        bpm: Number(r.BPM || r.bpm) || 120,
        timeSignature: r.Compasso || r.timeSignature || r['Time Signature'] || '4/4',
        notes: r.Notas || r.notes || r.Notes || '',
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

      {/* Playlist tabs - scrollable */}
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
        <Button variant="outline" size="sm" onClick={exportXlsx} disabled={!activePlaylist} className="text-[10px] sm:text-xs gap-1 h-7">
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
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar música..."
              className="h-7 text-xs pl-7"
            />
          </div>
        )}
        {activePlaylist && (
          <span className="text-[10px] text-muted-foreground">{filteredSongs.length} músicas</span>
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
                  activeSongId === song.id
                    ? 'border-primary bg-primary/10 glow-purple'
                    : 'border-border bg-muted/30 hover:bg-muted/50'
                )}
                onClick={() => { if (editingSongId !== song.id) onSelectSong(song); }}
              >
                {editingSongId === song.id ? (
                  <div className="space-y-2">
                    <Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nome" className="h-7 sm:h-8 text-xs sm:text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" value={editForm.bpm || 120} onChange={e => setEditForm({ ...editForm, bpm: +e.target.value })} className="h-7 sm:h-8 text-xs sm:text-sm" />
                      <Select value={editForm.timeSignature || '4/4'} onValueChange={v => setEditForm({ ...editForm, timeSignature: v })}>
                        <SelectTrigger className="h-7 sm:h-8 text-xs sm:text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{timeSignatures.map(ts => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}</SelectContent>
                      </Select>
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
                      <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-xs sm:text-sm truncate">{song.name}</div>
                        <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {song.bpm} BPM · {song.timeSignature}{song.notes ? ` · ${song.notes}` : ''}
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
          <Button variant="outline" size="sm" onClick={addSong} className="w-full text-[10px] sm:text-xs gap-1 h-7 sm:h-8">
            <Plus className="w-3 h-3" /> Adicionar Música
          </Button>
        </div>
      )}

      {!activePlaylist && (
        <div className="text-center text-muted-foreground text-xs sm:text-sm py-6 sm:py-8">
          Crie ou selecione uma playlist para começar.
        </div>
      )}
    </div>
  );
};

export default SetlistManager;
