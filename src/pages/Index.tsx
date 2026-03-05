import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useMetronome } from '@/hooks/useMetronome';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import Metronome from '@/components/beatmaster/Metronome';
import SetlistManager from '@/components/beatmaster/SetlistManager';
import SamplerPad from '@/components/beatmaster/SamplerPad';
import FooterPlayer from '@/components/beatmaster/FooterPlayer';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { defaultPlaylistSongs, DEFAULT_PLAYLIST_NAME } from '@/data/defaultPresets';
import type { Playlist, Song, AppMode } from '@/types/beatmaster';

const Index = () => {
  const metro = useMetronome();
  const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('bm-playlists', []);
  const [activePlaylistId, setActivePlaylistId] = useLocalStorage<string | null>('bm-active-playlist', null);
  const [activeSongId, setActiveSongId] = useLocalStorage<string | null>('bm-active-song', null);
  const [mode, setMode] = useLocalStorage<AppMode>('bm-mode', 'free');
  const [isDark, setIsDark] = useState(true);
  const [padTrigger, setPadTrigger] = useState<{ padId: number; type: 'down' | 'up' } | null>(null);

  // Seed default playlist on first load
  useEffect(() => {
    if (playlists.length === 0) {
      const defaultPlaylist: Playlist = {
        id: crypto.randomUUID(),
        name: DEFAULT_PLAYLIST_NAME,
        songs: defaultPlaylistSongs,
      };
      setPlaylists([defaultPlaylist]);
      setActivePlaylistId(defaultPlaylist.id);
    }
  }, []);

  // Theme toggle
  useEffect(() => {
    document.documentElement.classList.toggle('light', !isDark);
  }, [isDark]);

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || null;
  const activeSong = activePlaylist?.songs.find(s => s.id === activeSongId) || null;

  const onSelectSong = useCallback((song: Song) => {
    setActiveSongId(song.id);
    if (mode === 'setlist') {
      metro.setBpm(song.bpm);
      metro.setTimeSignature(song.timeSignature);
    }
  }, [mode, metro]);

  const navigateSong = useCallback((dir: 1 | -1) => {
    if (!activePlaylist || mode === 'free') return;
    const idx = activePlaylist.songs.findIndex(s => s.id === activeSongId);
    const next = idx + dir;
    if (next >= 0 && next < activePlaylist.songs.length) {
      onSelectSong(activePlaylist.songs[next]);
    }
  }, [activePlaylist, activeSongId, mode, onSelectSong]);

  const cyclePlaylist = useCallback(() => {
    if (playlists.length <= 1) return;
    const idx = playlists.findIndex(p => p.id === activePlaylistId);
    const next = (idx + 1) % playlists.length;
    setActivePlaylistId(playlists[next].id);
  }, [playlists, activePlaylistId]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onPadTrigger: (padId, type) => setPadTrigger({ padId, type }),
    onToggleMetronome: metro.toggle,
    onTapTempo: metro.tapTempo,
    onNavigateSong: navigateSong,
    onBpmChange: (delta) => metro.setBpm(Math.min(240, Math.max(40, metro.bpm + delta))),
    onMasterVolumeChange: (delta) => metro.setMasterVolume(Math.min(1, Math.max(0, metro.masterVolume + delta))),
    onPanSet: metro.setPan,
    onCyclePlaylist: cyclePlaylist,
    mode,
  });

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="flex items-center justify-between py-6 px-4 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            🎵 BeatMaster
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Metrônomo · Setlist · Sampler</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="h-9 w-9">
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </header>

      {/* Main: Desktop = left col fixed metronome, right col sampler+setlist */}
      <main className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* Left: Metronome (sticky on desktop) */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <Metronome
              isPlaying={metro.isPlaying}
              bpm={metro.bpm}
              setBpm={metro.setBpm}
              timeSignature={metro.timeSignature}
              setTimeSignature={metro.setTimeSignature}
              subdivision={metro.subdivision}
              setSubdivision={metro.setSubdivision}
              sound={metro.sound}
              setSound={metro.setSound}
              volume={metro.volume}
              setVolume={metro.setVolume}
              pan={metro.pan}
              setPan={metro.setPan}
              currentBeat={metro.currentBeat}
              beatsPerMeasure={metro.beatsPerMeasure}
              toggle={metro.toggle}
              tapTempo={metro.tapTempo}
            />
          </div>

          {/* Right: Sampler + Setlist */}
          <div className="space-y-6">
            <SamplerPad
              getAudioContext={metro.getAudioContext}
              getMasterGain={metro.getMasterGain}
              padTrigger={padTrigger}
            />
            <SetlistManager
              playlists={playlists}
              setPlaylists={setPlaylists}
              activePlaylistId={activePlaylistId}
              setActivePlaylistId={setActivePlaylistId}
              activeSongId={activeSongId}
              onSelectSong={onSelectSong}
            />
          </div>
        </div>
      </main>

      {/* Footer Player */}
      <FooterPlayer
        isPlaying={metro.isPlaying}
        toggle={metro.toggle}
        bpm={metro.bpm}
        currentBeat={metro.currentBeat}
        beatsPerMeasure={metro.beatsPerMeasure}
        masterVolume={metro.masterVolume}
        setMasterVolume={metro.setMasterVolume}
        pan={metro.pan}
        setPan={metro.setPan}
        mode={mode}
        setMode={setMode}
        activeSong={activeSong}
        onPrev={() => navigateSong(-1)}
        onNext={() => navigateSong(1)}
      />
    </div>
  );
};

export default Index;
