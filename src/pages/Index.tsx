import React, { useState, useCallback } from 'react';
import { useMetronome } from '@/hooks/useMetronome';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import Metronome from '@/components/beatmaster/Metronome';
import SetlistManager from '@/components/beatmaster/SetlistManager';
import SamplerPad from '@/components/beatmaster/SamplerPad';
import FooterPlayer from '@/components/beatmaster/FooterPlayer';
import type { Playlist, Song, AppMode } from '@/types/beatmaster';

const Index = () => {
  const metro = useMetronome();
  const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('bm-playlists', []);
  const [activePlaylistId, setActivePlaylistId] = useLocalStorage<string | null>('bm-active-playlist', null);
  const [activeSongId, setActiveSongId] = useLocalStorage<string | null>('bm-active-song', null);
  const [mode, setMode] = useLocalStorage<AppMode>('bm-mode', 'free');

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

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="text-center py-8 px-4">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          🎵 BeatMaster
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Metrônomo · Setlist · Sampler</p>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Metronome + Sampler side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <SamplerPad
            getAudioContext={metro.getAudioContext}
            getMasterGain={metro.getMasterGain}
          />
        </div>

        {/* Setlist Manager */}
        <SetlistManager
          playlists={playlists}
          setPlaylists={setPlaylists}
          activePlaylistId={activePlaylistId}
          setActivePlaylistId={setActivePlaylistId}
          activeSongId={activeSongId}
          onSelectSong={onSelectSong}
        />
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
