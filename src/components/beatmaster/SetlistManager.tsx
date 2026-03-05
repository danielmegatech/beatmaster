import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, Check, X, Download, Upload, ChevronUp, ChevronDown, Music } from 'lucide-react';
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

const timeSignatures = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '7/4', '12/8', '13/8'];

const SetlistManager: React.FC<SetlistManagerProps> = ({
  playlists, setPlaylists, activePlaylistId, setActivePlaylistId, activeSongId, onSelectSong,
}) => {
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Song>>({});
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || null;

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

    // Multi-sheet: each sheet becomes a playlist
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
    <div className="glass rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-primary">📋 Setlist Manager</h2>

      {/* Playlist tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        {playlists.map(pl => (
          <div key={pl.id} className="flex items-center gap-1">
            {renamingId === pl.id ? (
              <div className="flex gap-1">
                <Input value={renameVal} onChange={e => setRenameVal(e.target.value)} className="h-8 w-32 text-xs" />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => renamePlaylist(pl.id)}><Check className="w-3 h-3" /></Button>
              </div>
            ) : (
              <Button
                variant={activePlaylistId === pl.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivePlaylistId(pl.id)}
                onDoubleClick={() => { setRenamingId(pl.id); setRenameVal(pl.name); }}
                className="text-xs"
              >
                {pl.name}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deletePlaylist(pl.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <div className="flex gap-1">
          <Input placeholder="Nova playlist..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} className="h-8 w-28 text-xs" />
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={addPlaylist}><Plus className="w-3 h-3" /></Button>
        </div>
      </div>

      {/* Import/Export */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={exportXlsx} disabled={!activePlaylist} className="text-xs gap-1">
          <Download className="w-3 h-3" /> Exportar .xlsx
        </Button>
        <label>
          <Button variant="outline" size="sm" asChild className="text-xs gap-1 cursor-pointer">
            <span><Upload className="w-3 h-3" /> Importar .xlsx</span>
          </Button>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={importXlsx} />
        </label>
      </div>

      {/* Song list */}
      {activePlaylist && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {activePlaylist.songs.map((song, idx) => (
            <div
              key={song.id}
              className={cn(
                'rounded-xl p-3 border transition-all cursor-pointer',
                activeSongId === song.id
                  ? 'border-primary bg-primary/10 glow-purple'
                  : 'border-border bg-muted/30 hover:bg-muted/50'
              )}
              onClick={() => { if (editingSongId !== song.id) onSelectSong(song); }}
            >
              {editingSongId === song.id ? (
                <div className="space-y-2">
                  <Input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nome" className="h-8 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" value={editForm.bpm || 120} onChange={e => setEditForm({ ...editForm, bpm: +e.target.value })} className="h-8 text-sm" />
                    <Select value={editForm.timeSignature || '4/4'} onValueChange={v => setEditForm({ ...editForm, timeSignature: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{timeSignatures.map(ts => <SelectItem key={ts} value={ts}>{ts}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Textarea value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Notas..." className="text-sm min-h-[40px]" />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={saveEdit} className="text-xs gap-1"><Check className="w-3 h-3" /> Salvar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingSongId(null)} className="text-xs gap-1"><X className="w-3 h-3" /></Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-5 text-right">{idx + 1}</span>
                    <Music className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{song.name}</div>
                      <div className="text-xs text-muted-foreground">{song.bpm} BPM · {song.timeSignature}{song.notes ? ` · ${song.notes}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveSong(idx, -1); }}><ChevronUp className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveSong(idx, 1); }}><ChevronDown className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); startEdit(song); }}><Edit2 className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); deleteSong(song.id); }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addSong} className="w-full text-xs gap-1">
            <Plus className="w-3 h-3" /> Adicionar Música
          </Button>
        </div>
      )}

      {!activePlaylist && (
        <div className="text-center text-muted-foreground text-sm py-8">
          Crie ou selecione uma playlist para começar.
        </div>
      )}
    </div>
  );
};

export default SetlistManager;
