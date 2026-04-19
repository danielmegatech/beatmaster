import React, { useState, useCallback, useEffect } from 'react';
import { useMetronome } from '@/hooks/useMetronome';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import Metronome from '@/components/beatmaster/Metronome';
import SetlistManager from '@/components/beatmaster/SetlistManager';
import SamplerPad from '@/components/beatmaster/SamplerPad';
import FooterPlayer from '@/components/beatmaster/FooterPlayer';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Palette } from 'lucide-react';
import { defaultPlaylists } from '@/data/defaultPresets';
import type { Playlist, Song, AppMode } from '@/types/beatmaster';

type SkinColor = 'purple' | 'blue' | 'green' | 'red' | 'orange';

const skins: { id: SkinColor; label: string; color: string }[] = [
  { id: 'purple', label: 'Violeta', color: 'bg-purple-500' },
  { id: 'blue', label: 'Azul', color: 'bg-blue-500' },
  { id: 'green', label: 'Verde', color: 'bg-emerald-500' },
  { id: 'red', label: 'Vermelho', color: 'bg-red-500' },
  { id: 'orange', label: 'Laranja', color: 'bg-orange-500' },
];

const ALL_BANDS = '__all__';

const Index = () => {
  const metro = useMetronome();
  const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('bm-playlists', []);
  const [activePlaylistId, setActivePlaylistId] = useLocalStorage<string | null>('bm-active-playlist', null);
  const [activeSongId, setActiveSongId] = useLocalStorage<string | null>('bm-active-song', null);
  const [mode, setMode] = useLocalStorage<AppMode>('bm-mode', 'free');
  const [isDark, setIsDark] = useLocalStorage<boolean>('bm-dark-mode', true);
  const [skin, setSkin] = useLocalStorage<SkinColor>('bm-skin', 'purple');
  const [selectedBand, setSelectedBand] = useLocalStorage<string>('bm-selected-band', ALL_BANDS);
  const [ttsEnabled, setTtsEnabled] = useLocalStorage<boolean>('bm-tts-enabled', true);
  const [showSkinPicker, setShowSkinPicker] = useState(false);
  const [padTrigger, setPadTrigger] = useState<{ padId: number; type: 'down' | 'up' } | null>(null);

  // Seed defaults
  useEffect(() => {
    if (playlists.length === 0) {
      setPlaylists(defaultPlaylists);
      setActivePlaylistId(defaultPlaylists[0].id);
    }
  }, []); // eslint-disable-line

  // Migrate: ensure all playlists have a band
  useEffect(() => {
    const hasMissing = playlists.some(p => !p.band);
    if (hasMissing) {
      setPlaylists(prev => prev.map(p => p.band ? p : { ...p, band: 'Geral' }));
    }
  }, [playlists, setPlaylists]);

  // Theme + skin
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', !isDark);
    root.classList.remove('skin-blue', 'skin-green', 'skin-red', 'skin-orange');
    if (skin !== 'purple') root.classList.add(`skin-${skin}`);
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
    };
  }, [isDark, skin]);

  const activePlaylist = playlists.find(p => p.id === activePlaylistId) || null;
  const activeSong = activePlaylist?.songs.find(s => s.id === activeSongId) || null;

  const onSelectSong = useCallback((song: Song) => {
    setActiveSongId(song.id);
    if (mode === 'setlist') {
      metro.setBpm(song.bpm);
      metro.setTimeSignature(song.timeSignature);
    }
  }, [mode, metro, setActiveSongId]);

  const navigateSong = useCallback((dir: 1 | -1) => {
    if (!activePlaylist || mode === 'free') return;
    const idx = activePlaylist.songs.findIndex(s => s.id === activeSongId);
    const next = idx + dir;
    if (next >= 0 && next < activePlaylist.songs.length) {
      onSelectSong(activePlaylist.songs[next]);
    }
  }, [activePlaylist, activeSongId, mode, onSelectSong]);

  const handleSongEnd = useCallback(() => {
    if (!activePlaylist || mode !== 'setlist') return;
    const idx = activePlaylist.songs.findIndex(s => s.id === activeSongId);
    const next = idx + 1;
    if (next < activePlaylist.songs.length) {
      onSelectSong(activePlaylist.songs[next]);
    } else {
      metro.stop();
    }
  }, [activePlaylist, activeSongId, mode, onSelectSong, metro]);

  const cyclePlaylist = useCallback(() => {
    if (playlists.length <= 1) return;
    const idx = playlists.findIndex(p => p.id === activePlaylistId);
    const next = (idx + 1) % playlists.length;
    setActivePlaylistId(playlists[next].id);
  }, [playlists, activePlaylistId, setActivePlaylistId]);

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
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-2 py-2 sm:py-3 px-3 sm:px-4 max-w-6xl mx-auto w-full shrink-0">
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl md:text-2xl font-bold text-primary truncate">🎵 BeatMaster</h1>
          <p className="hidden sm:block text-[10px] text-muted-foreground mt-0.5 truncate">Metrônomo · Setlist · Sampler</p>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setShowSkinPicker(!showSkinPicker)} className="h-9 w-9 sm:h-10 sm:w-10">
              <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            {showSkinPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSkinPicker(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 glass rounded-xl p-3 min-w-[140px] space-y-2 animate-scale-in">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Skin</p>
                  {skins.map(s => (
                    <button key={s.id}
                      onClick={() => { setSkin(s.id); setShowSkinPicker(false); }}
                      className={`flex items-center gap-2 w-full text-xs py-1.5 px-2 rounded-lg transition-colors hover:bg-secondary/50 ${skin === s.id ? 'bg-secondary text-foreground' : 'text-muted-foreground'}`}>
                      <div className={`w-3 h-3 rounded-full ${s.color}`} />{s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="h-9 w-9 sm:h-10 sm:w-10">
            {isDark ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-[88px] sm:pb-[72px] px-2 sm:px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr] gap-3 sm:gap-4 min-w-0">
          <div className="lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100dvh-140px)] lg:overflow-y-auto min-w-0">
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
              countIn={metro.countIn}
              setCountIn={metro.setCountIn}
              isCountingIn={metro.isCountingIn}
            />
          </div>

          <div className="space-y-3 sm:space-y-4 min-w-0">
            <SetlistManager
              playlists={playlists}
              setPlaylists={setPlaylists}
              activePlaylistId={activePlaylistId}
              setActivePlaylistId={setActivePlaylistId}
              activeSongId={activeSongId}
              onSelectSong={onSelectSong}
              selectedBand={selectedBand}
              setSelectedBand={setSelectedBand}
            />
            <SamplerPad
              getAudioContext={metro.getAudioContext}
              getMasterGain={metro.getMasterGain}
              padTrigger={padTrigger}
            />
          </div>
        </div>
      </main>

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
        countIn={metro.countIn}
        setCountIn={metro.setCountIn}
        onSongEnd={handleSongEnd}
        ttsEnabled={ttsEnabled}
        setTtsEnabled={setTtsEnabled}
      />
    </div>
  );
};

export default Index;
