import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { ResettableSlider } from '@/components/ui/resettable-slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Square, Volume2, VolumeX, Settings, Upload, Link, ChevronDown, ChevronUp } from 'lucide-react';
import type { PadConfig } from '@/types/beatmaster';
import { defaultPadConfigs } from '@/data/defaultPresets';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';

interface SamplerPadProps {
  getAudioContext: () => AudioContext;
  getMasterGain: () => GainNode;
  padTrigger?: { padId: number; type: 'down' | 'up' } | null;
}

// MPC-style: solid resting color + solid active color (no glow, no pulse).
const padColors: { idle: string; active: string }[] = [
  { idle: 'bg-red-900/70 border-red-700',       active: 'bg-red-500 border-red-300' },
  { idle: 'bg-orange-900/70 border-orange-700', active: 'bg-orange-500 border-orange-300' },
  { idle: 'bg-yellow-900/70 border-yellow-700', active: 'bg-yellow-400 border-yellow-200' },
  { idle: 'bg-cyan-900/70 border-cyan-700',     active: 'bg-cyan-400 border-cyan-200' },
  { idle: 'bg-purple-900/70 border-purple-700', active: 'bg-purple-500 border-purple-300' },
];

const padBorderColors = [
  'border-red-500/40',
  'border-orange-500/40',
  'border-yellow-500/40',
  'border-cyan-500/40',
  'border-purple-500/40',
];

type PadCfg = Omit<PadConfig, 'audioBuffer'>;

// ============== Memoized Pad Button ==============
interface PadButtonProps {
  pad: PadCfg;
  index: number;
  isActive: boolean;
  hasBuffer: boolean;
  onTrigger: (id: number) => void;
  onConfig: (id: number) => void;
}

const PadButton = memo(({ pad, index, isActive, hasBuffer, onTrigger, onConfig }: PadButtonProps) => {
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    onTrigger(pad.id);
  }, [pad.id, onTrigger]);

  const handleConfig = useCallback(() => onConfig(pad.id), [pad.id, onConfig]);

  return (
    <div className="relative flex flex-col items-center gap-0.5 sm:gap-1 w-16 sm:w-20 md:w-24 max-w-[100px]">
      <button
        onPointerDown={handlePointerDown}
        className={cn(
          'w-full aspect-square border-2 rounded-md flex flex-col items-center justify-center font-bold transition-colors duration-75 active:translate-y-px touch-none select-none text-[10px] sm:text-xs',
          isActive ? padColors[index].active : padColors[index].idle,
          isActive ? 'text-black' : 'text-white/80',
          !hasBuffer && 'opacity-40'
        )}
      >
        <span className="truncate w-full px-0.5 sm:px-1">{pad.fileName || pad.name}</span>
        <span className={cn('text-[8px] sm:text-[9px] mt-0.5', isActive ? 'text-black/70' : 'text-white/50')}>[{index + 1}]</span>
      </button>
      <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={handleConfig}>
        <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
      </Button>
    </div>
  );
});
PadButton.displayName = 'PadButton';

// ============== Mixer Row (matches reference design) ==============
interface MixerControlProps {
  pad: PadCfg;
  index: number;
  onCommit: (id: number, patch: Partial<PadCfg>) => void;
}

const MixerControl = memo(({ pad, index, onCommit }: MixerControlProps) => {
  const [vol, setVol] = useState(pad.volume);
  const [pan, setPan] = useState(pad.pan);
  const muted = !!pad.muted;

  useEffect(() => { setVol(pad.volume); }, [pad.volume]);
  useEffect(() => { setPan(pad.pan); }, [pad.pan]);

  return (
    <div className="grid grid-cols-[80px_auto_auto_1fr_auto_140px] sm:grid-cols-[100px_auto_auto_1fr_auto_180px] items-center gap-2 sm:gap-3 text-xs">
      {/* Pad name */}
      <span className={cn(
        'truncate font-medium text-[11px] sm:text-xs pl-1 border-l-2',
        padBorderColors[index],
        muted && 'opacity-50 line-through'
      )}>
        {pad.name}
      </span>

      {/* Mute toggle */}
      <Switch
        checked={!muted}
        onCheckedChange={(on) => onCommit(pad.id, { muted: !on })}
        className="scale-75 data-[state=checked]:bg-primary"
        title={muted ? 'Unmute' : 'Mute'}
      />

      {/* Volume icon */}
      {muted
        ? <VolumeX className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
        : <Volume2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}

      {/* Volume slider (large, takes remaining space) */}
      <ResettableSlider
        resetValue={0.8}
        value={[vol]}
        onValueChange={([v]) => setVol(v)}
        onValueCommit={([v]) => onCommit(pad.id, { volume: v })}
        onReset={(v) => { setVol(v); onCommit(pad.id, { volume: v }); }}
        min={0} max={1} step={0.01}
        className={cn('min-w-0', muted && 'opacity-40')}
      />

      {/* Pan label */}
      <span className="text-[10px] text-muted-foreground shrink-0">Pan</span>

      {/* Pan slider (compact) */}
      <ResettableSlider
        resetValue={0}
        value={[pan]}
        onValueChange={([v]) => setPan(v)}
        onValueCommit={([v]) => onCommit(pad.id, { pan: v })}
        onReset={(v) => { setPan(v); onCommit(pad.id, { pan: v }); }}
        min={-1} max={1} step={0.01}
        className={cn(muted && 'opacity-40')}
      />
    </div>
  );
});
MixerControl.displayName = 'MixerControl';

// ============== Main Component ==============
const SamplerPad: React.FC<SamplerPadProps> = ({ getAudioContext, getMasterGain, padTrigger }) => {
  const [padConfigs, setPadConfigs] = useLocalStorage<PadCfg[]>(
    'bm-pad-configs',
    defaultPadConfigs.map(({ audioBuffer, ...rest }) => rest)
  );
  const [buffers, setBuffers] = useState<Record<number, AudioBuffer>>({});
  const [activePads, setActivePads] = useState<Record<number, boolean>>({});
  const [configPadId, setConfigPadId] = useState<number | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [editName, setEditName] = useState('');
  const [mixerOpen, setMixerOpen] = useState(false);

  // Refs mirror state so audio handlers have empty deps and never recreate
  const padConfigsRef = useRef(padConfigs);
  const buffersRef = useRef(buffers);
  useEffect(() => { padConfigsRef.current = padConfigs; }, [padConfigs]);
  useEffect(() => { buffersRef.current = buffers; }, [buffers]);

  const activeSourcesRef = useRef<Record<number, { source: AudioBufferSourceNode; gain: GainNode }>>({});

  // Load audio from URLs on mount
  useEffect(() => {
    padConfigs.forEach(pad => {
      if (pad.audioUrl && !buffers[pad.id]) {
        loadFromUrl(pad.audioUrl, pad.id);
      }
    });
  }, []); // eslint-disable-line

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

  // Stable handlers (empty deps): read from refs
  const playSampler = useCallback((padId: number) => {
    const buffer = buffersRef.current[padId];
    if (!buffer) return;
    const pad = padConfigsRef.current.find(p => p.id === padId);
    if (!pad) return;
    const ctx = getAudioContext();
    const mg = getMasterGain();
    const gain = ctx.createGain();
    gain.gain.value = pad.muted ? 0 : pad.volume;
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
  }, [getAudioContext, getMasterGain]);

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

  const togglePad = useCallback((padId: number) => {
    if (activeSourcesRef.current[padId]) {
      stopSampler(padId);
    } else {
      playSampler(padId);
    }
  }, [playSampler, stopSampler]);

  const stopAll = useCallback(() => {
    Object.keys(activeSourcesRef.current).forEach(k => stopSampler(Number(k)));
    setActivePads({});
  }, [stopSampler]);

  // Keyboard triggers
  useEffect(() => {
    if (!padTrigger) return;
    if (padTrigger.type === 'down') togglePad(padTrigger.padId);
  }, [padTrigger]); // eslint-disable-line

  const openConfig = useCallback((padId: number) => {
    const pad = padConfigsRef.current.find(p => p.id === padId);
    if (pad) {
      setEditName(pad.name);
      setUrlInput(pad.audioUrl || '');
    }
    setConfigPadId(padId);
  }, []);

  const saveConfig = () => {
    if (configPadId === null) return;
    const current = padConfigsRef.current.find(p => p.id === configPadId);
    setPadConfigs(prev => prev.map(p =>
      p.id === configPadId ? { ...p, name: editName || p.name } : p
    ));
    if (urlInput && urlInput !== current?.audioUrl) {
      setPadConfigs(prev => prev.map(p =>
        p.id === configPadId ? { ...p, audioUrl: urlInput, fileName: undefined } : p
      ));
      loadFromUrl(urlInput, configPadId);
    }
    setConfigPadId(null);
  };

  // Commit-only persistence (called on slider drag end)
  const commitPadPatch = useCallback((id: number, patch: Partial<PadCfg>) => {
    setPadConfigs(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }, [setPadConfigs]);

  const configPad = configPadId !== null ? padConfigs.find(p => p.id === configPadId) : null;

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-primary">🎹 Sampler</h2>
        <Button variant="destructive" size="sm" onClick={stopAll} className="text-xs gap-1 h-7 sm:h-8">
          <Square className="w-3 h-3" /> Stop All
        </Button>
      </div>

      {/* 5 Pads */}
      <div className="flex justify-center gap-1.5 sm:gap-2">
        {padConfigs.map((pad, i) => (
          <PadButton
            key={pad.id}
            pad={pad}
            index={i}
            isActive={!!activePads[pad.id]}
            hasBuffer={!!buffers[pad.id]}
            onTrigger={togglePad}
            onConfig={openConfig}
          />
        ))}
      </div>

      {/* Collapsible Mixer Sampler */}
      <div className="rounded-xl border-2 border-primary/40 bg-primary/5">
        <button
          onClick={() => setMixerOpen(!mixerOpen)}
          className="flex items-center gap-2 w-full hover:bg-primary/10 transition-colors py-2 px-3 rounded-t-xl"
        >
          {mixerOpen ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />}
          <span className="text-xs font-bold uppercase tracking-wider text-primary">🎚️ Mixer Sampler</span>
          <div className="flex-1 h-px bg-primary/30" />
          <span className="text-[10px] text-muted-foreground">só pads</span>
        </button>

        {mixerOpen && (
          <div className="p-2 sm:p-3 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
            {padConfigs.map((pad, i) => (
              <MixerControl key={pad.id} pad={pad} index={i} onCommit={commitPadPatch} />
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
