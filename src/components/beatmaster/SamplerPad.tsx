import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Square, Volume2, Settings, Upload, Link, ChevronDown, ChevronUp } from 'lucide-react';
import type { PadConfig } from '@/types/beatmaster';
import { defaultPadConfigs } from '@/data/defaultPresets';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';

interface SamplerPadProps {
  getAudioContext: () => AudioContext;
  getMasterGain: () => GainNode;
  padTrigger?: { padId: number; type: 'down' | 'up' } | null;
}

const padColors = [
  'from-red-500/30 to-red-700/10 border-red-500/40 hover:border-red-400',
  'from-orange-500/30 to-orange-700/10 border-orange-500/40 hover:border-orange-400',
  'from-yellow-500/30 to-yellow-700/10 border-yellow-500/40 hover:border-yellow-400',
  'from-cyan-500/30 to-cyan-700/10 border-cyan-500/40 hover:border-cyan-400',
  'from-purple-500/30 to-purple-700/10 border-purple-500/40 hover:border-purple-400',
];

const SamplerPad: React.FC<SamplerPadProps> = ({ getAudioContext, getMasterGain, padTrigger }) => {
  const [padConfigs, setPadConfigs] = useLocalStorage<Omit<PadConfig, 'audioBuffer'>[]>(
    'bm-pad-configs',
    defaultPadConfigs.map(({ audioBuffer, ...rest }) => rest)
  );
  const [buffers, setBuffers] = useState<Record<number, AudioBuffer>>({});
  const [activePads, setActivePads] = useState<Record<number, boolean>>({});
  const [configPadId, setConfigPadId] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [editName, setEditName] = useState('');
  const [mixerOpen, setMixerOpen] = useState(false);

  const activeSourcesRef = useRef<Record<number, { source: AudioBufferSourceNode; gain: GainNode }>>({});
  const loopSourcesRef = useRef<Record<number, { source: AudioBufferSourceNode; interval: number }>>({});

  // Load audio from URLs on mount
  useEffect(() => {
    padConfigs.forEach(pad => {
      if (pad.audioUrl && !buffers[pad.id]) {
        loadFromUrl(pad.audioUrl, pad.id);
      }
    });
  }, []); // Only on mount

  const loadFromUrl = async (url: string, padId: number) => {
    try {
      const ctx = getAudioContext();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      setBuffers(prev => ({ ...prev, [padId]: audioBuffer }));
    } catch (err) {
      console.error(`Failed to load audio from ${url}:`, err);
    }
  };

  const loadFromFile = async (file: File, padId: number) => {
    const ctx = getAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    setBuffers(prev => ({ ...prev, [padId]: audioBuffer }));
    setPadConfigs(prev => prev.map(p => p.id === padId ? { ...p, fileName: file.name, audioUrl: undefined } : p));
  };

  const playSampler = useCallback((padId: number) => {
    const buffer = buffers[padId];
    if (!buffer) return;
    const pad = padConfigs.find(p => p.id === padId);
    if (!pad) return;
    const ctx = getAudioContext();
    const mg = getMasterGain();
    const gain = ctx.createGain();
    gain.gain.value = pad.volume;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pad.pan;
    gain.connect(panner);
    panner.connect(mg);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start();
    activeSourcesRef.current[padId] = { source, gain };
    setActivePads(prev => ({ ...prev, [padId]: true }));
    source.onended = () => {
      setActivePads(prev => { const n = { ...prev }; delete n[padId]; return n; });
    };
  }, [buffers, padConfigs, getAudioContext, getMasterGain]);

  const stopSampler = useCallback((padId: number) => {
    const active = activeSourcesRef.current[padId];
    if (active) {
      const ctx = getAudioContext();
      active.gain.gain.setValueAtTime(active.gain.gain.value, ctx.currentTime);
      active.gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      setTimeout(() => {
        try { active.source.stop(); } catch {}
      }, 60);
      delete activeSourcesRef.current[padId];
      setActivePads(prev => { const n = { ...prev }; delete n[padId]; return n; });
    }
  }, [getAudioContext]);

  const toggleLoop = useCallback((padId: number) => {
    if (loopSourcesRef.current[padId]) {
      loopSourcesRef.current[padId].source.stop();
      clearInterval(loopSourcesRef.current[padId].interval);
      delete loopSourcesRef.current[padId];
      setLoopProgress(prev => { const n = { ...prev }; delete n[padId]; return n; });
      return;
    }
    const buffer = buffers[padId];
    if (!buffer) return;
    const pad = padConfigs.find(p => p.id === padId);
    if (!pad) return;
    const ctx = getAudioContext();
    const mg = getMasterGain();
    const gain = ctx.createGain();
    gain.gain.value = pad.volume;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pad.pan;
    gain.connect(panner);
    panner.connect(mg);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start();
    const startTime = ctx.currentTime;
    const dur = buffer.duration;
    const interval = window.setInterval(() => {
      const elapsed = (ctx.currentTime - startTime) % dur;
      setLoopProgress(prev => ({ ...prev, [padId]: elapsed / dur }));
    }, 50);
    loopSourcesRef.current[padId] = { source, interval };
  }, [buffers, padConfigs, getAudioContext, getMasterGain]);

  const stopAll = () => {
    Object.keys(loopSourcesRef.current).forEach(k => {
      const id = Number(k);
      try { loopSourcesRef.current[id].source.stop(); } catch {}
      clearInterval(loopSourcesRef.current[id].interval);
      delete loopSourcesRef.current[id];
    });
    Object.keys(activeSourcesRef.current).forEach(k => stopSampler(Number(k)));
    setActivePads({});
  };

  // Toggle: press once = play, press again = stop (sample mode for all)
  const togglePad = useCallback((padId: number) => {
    if (activeSourcesRef.current[padId]) {
      stopSampler(padId);
    } else {
      playSampler(padId);
    }
  }, [playSampler, stopSampler]);

  // Handle keyboard triggers (only on key down -> toggle)
  useEffect(() => {
    if (!padTrigger) return;
    if (padTrigger.type === 'down') togglePad(padTrigger.padId);
  }, [padTrigger]); // eslint-disable-line

  const handlePadClick = (padId: number) => {
    togglePad(padId);
  };

  const openConfig = (padId: number) => {
    const pad = padConfigs.find(p => p.id === padId);
    if (pad) {
      setEditName(pad.name);
      setUrlInput(pad.audioUrl || '');
    }
    setConfigPadId(padId);
  };

  const saveConfig = () => {
    if (configPadId === null) return;
    setPadConfigs(prev => prev.map(p =>
      p.id === configPadId ? { ...p, name: editName || p.name } : p
    ));
    if (urlInput && urlInput !== padConfigs.find(p => p.id === configPadId)?.audioUrl) {
      setPadConfigs(prev => prev.map(p =>
        p.id === configPadId ? { ...p, audioUrl: urlInput, fileName: undefined } : p
      ));
      loadFromUrl(urlInput, configPadId);
    }
    setConfigPadId(null);
  };

  const configPad = configPadId !== null ? padConfigs.find(p => p.id === configPadId) : null;

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-primary">🎹 Sampler</h2>
        <Button variant="destructive" size="sm" onClick={stopAll} className="text-xs gap-1 h-7 sm:h-8">
          <Square className="w-3 h-3" /> Stop All
        </Button>
      </div>

      {/* 5 Pads - responsive grid with max size */}
      <div className="flex justify-center gap-1.5 sm:gap-2">
        {padConfigs.map((pad, i) => {
          const isActive = !!activePads[pad.id];
          return (
            <div key={pad.id} className="relative flex flex-col items-center gap-0.5 sm:gap-1 w-16 sm:w-20 md:w-24 max-w-[100px]">
              <button
                onClick={() => handlePadClick(pad.id)}
                onTouchStart={(e) => { e.preventDefault(); handlePadClick(pad.id); }}
                className={cn(
                  `w-full aspect-square bg-gradient-to-b border rounded-lg sm:rounded-xl flex flex-col items-center justify-center font-bold transition-all active:scale-95 active:brightness-125`,
                  'text-[10px] sm:text-xs',
                  padColors[i],
                  !buffers[pad.id] && 'opacity-40',
                  isActive && 'pulse-active brightness-125 ring-2 ring-primary'
                )}
              >
                <span className="truncate w-full px-0.5 sm:px-1">{pad.fileName || pad.name}</span>
                <span className="text-[8px] sm:text-[9px] text-muted-foreground opacity-60 mt-0.5">[{i + 1}]</span>
              </button>
              {/* Settings icon */}
              <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={() => openConfig(pad.id)}>
                <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Collapsible Mixer */}
      <div>
        <button
          onClick={() => setMixerOpen(!mixerOpen)}
          className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-1"
        >
          {mixerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span className="font-medium">Mixer</span>
          <div className="flex-1 h-px bg-border" />
        </button>

        {mixerOpen && (
          <div className="space-y-1.5 pt-1 animate-in slide-in-from-top-2 duration-200">
            {padConfigs.map((pad) => (
              <div key={pad.id} className="flex items-center gap-1.5 sm:gap-2 text-xs">
                <span className="w-12 sm:w-14 text-muted-foreground truncate text-[10px] sm:text-xs">{pad.name}</span>
                <Volume2 className="w-3 h-3 text-muted-foreground shrink-0" />
                <Slider
                  value={[pad.volume]}
                  onValueChange={([v]) => setPadConfigs(prev => prev.map(p => p.id === pad.id ? { ...p, volume: v } : p))}
                  min={0} max={1} step={0.01} className="flex-1 min-w-0"
                />
                <span className="text-muted-foreground text-[10px] w-4 shrink-0">Pan</span>
                <Slider
                  value={[pad.pan]}
                  onValueChange={([v]) => setPadConfigs(prev => prev.map(p => p.id === pad.id ? { ...p, pan: v } : p))}
                  min={-1} max={1} step={0.01} className="w-16 sm:w-20 shrink-0"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Config Modal */}
      <Dialog open={configPadId !== null} onOpenChange={(open) => { if (!open) setConfigPadId(null); }}>
        <DialogContent className="glass border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar Pad: {configPad?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nome</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                <Link className="w-3 h-3 inline mr-1" />URL do áudio
              </label>
              <Input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://..." className="h-8 text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                <Upload className="w-3 h-3 inline mr-1" />Arquivo local
              </label>
              <Input
                type="file"
                accept="audio/*"
                className="h-8 text-sm"
                onChange={e => {
                  if (e.target.files?.[0] && configPadId !== null) {
                    loadFromFile(e.target.files[0], configPadId);
                  }
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveConfig}>Salvar</Button>
              <Button size="sm" variant="outline" onClick={() => setConfigPadId(null)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SamplerPad;
