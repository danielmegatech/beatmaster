import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Square, Download, Upload, Volume2 } from 'lucide-react';
import type { PadConfig } from '@/types/beatmaster';

interface SamplerPadProps {
  getAudioContext: () => AudioContext;
  getMasterGain: () => GainNode;
}

const defaultPads: PadConfig[] = [
  { id: 0, name: 'Kick', volume: 0.8, pan: 0 },
  { id: 1, name: 'Snare', volume: 0.8, pan: 0 },
  { id: 2, name: 'Clap', volume: 0.8, pan: 0 },
  { id: 3, name: 'Hi-Hat', volume: 0.8, pan: 0 },
  { id: 4, name: 'Cymbal', volume: 0.8, pan: 0 },
];

const defaultLoops: PadConfig[] = [
  { id: 0, name: 'Loop 1', volume: 0.8, pan: 0 },
  { id: 1, name: 'Loop 2', volume: 0.8, pan: 0 },
  { id: 2, name: 'Loop 3', volume: 0.8, pan: 0 },
  { id: 3, name: 'Loop 4', volume: 0.8, pan: 0 },
  { id: 4, name: 'Loop 5', volume: 0.8, pan: 0 },
];

// Synthesize one-shot sounds
function synthPadSound(ctx: AudioContext, padId: number, gain: GainNode) {
  const now = ctx.currentTime;
  const g = ctx.createGain();
  g.connect(gain);

  switch (padId) {
    case 0: { // Kick
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      g.gain.setValueAtTime(1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(g);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }
    case 1: { // Snare
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 200;
      const noiseLen = ctx.sampleRate * 0.1;
      const buf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.6, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      noise.connect(ng);
      ng.connect(gain);
      g.gain.setValueAtTime(0.7, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(g);
      osc.start(now); osc.stop(now + 0.1);
      noise.start(now); noise.stop(now + 0.12);
      break;
    }
    case 2: { // Clap
      const noiseLen = ctx.sampleRate * 0.15;
      const buf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.value = 2000;
      bpf.Q.value = 1;
      g.gain.setValueAtTime(0.8, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      noise.connect(bpf);
      bpf.connect(g);
      noise.start(now);
      noise.stop(now + 0.15);
      break;
    }
    case 3: { // Hi-Hat
      const noiseLen = ctx.sampleRate * 0.05;
      const buf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 7000;
      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      noise.connect(hpf);
      hpf.connect(g);
      noise.start(now);
      noise.stop(now + 0.06);
      break;
    }
    case 4: { // Cymbal
      const noiseLen = ctx.sampleRate * 0.4;
      const buf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 5000;
      g.gain.setValueAtTime(0.5, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      noise.connect(hpf);
      hpf.connect(g);
      noise.start(now);
      noise.stop(now + 0.5);
      break;
    }
  }
}

const padColors = [
  'from-red-500/30 to-red-700/10 border-red-500/40 hover:border-red-400',
  'from-orange-500/30 to-orange-700/10 border-orange-500/40 hover:border-orange-400',
  'from-yellow-500/30 to-yellow-700/10 border-yellow-500/40 hover:border-yellow-400',
  'from-cyan-500/30 to-cyan-700/10 border-cyan-500/40 hover:border-cyan-400',
  'from-purple-500/30 to-purple-700/10 border-purple-500/40 hover:border-purple-400',
];

const SamplerPad: React.FC<SamplerPadProps> = ({ getAudioContext, getMasterGain }) => {
  const [pads, setPads] = useState<PadConfig[]>(defaultPads);
  const [loops, setLoops] = useState<PadConfig[]>(defaultLoops);
  const [loopProgress, setLoopProgress] = useState<Record<number, number>>({});
  const loopSourcesRef = useRef<Record<number, AudioBufferSourceNode>>({});
  const loopIntervalsRef = useRef<Record<number, number>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const playPad = (padId: number) => {
    const ctx = getAudioContext();
    const mg = getMasterGain();
    const pad = pads[padId];
    const g = ctx.createGain();
    g.gain.value = pad.volume;
    const p = ctx.createStereoPanner();
    p.pan.value = pad.pan;
    g.connect(p);
    p.connect(mg);

    if (pad.audioBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = pad.audioBuffer;
      src.connect(g);
      src.start();
    } else {
      synthPadSound(ctx, padId, g);
    }
  };

  const playLoop = (loopId: number) => {
    const loop = loops[loopId];
    if (!loop.audioBuffer) return;
    stopLoop(loopId);
    const ctx = getAudioContext();
    const mg = getMasterGain();
    const g = ctx.createGain();
    g.gain.value = loop.volume;
    const p = ctx.createStereoPanner();
    p.pan.value = loop.pan;
    g.connect(p);
    p.connect(mg);
    const src = ctx.createBufferSource();
    src.buffer = loop.audioBuffer;
    src.loop = true;
    src.connect(g);
    src.start();
    loopSourcesRef.current[loopId] = src;
    const startTime = ctx.currentTime;
    const dur = loop.audioBuffer.duration;
    loopIntervalsRef.current[loopId] = window.setInterval(() => {
      const elapsed = (ctx.currentTime - startTime) % dur;
      setLoopProgress(prev => ({ ...prev, [loopId]: elapsed / dur }));
    }, 50);
  };

  const stopLoop = (loopId: number) => {
    loopSourcesRef.current[loopId]?.stop();
    delete loopSourcesRef.current[loopId];
    if (loopIntervalsRef.current[loopId]) clearInterval(loopIntervalsRef.current[loopId]);
    delete loopIntervalsRef.current[loopId];
    setLoopProgress(prev => { const n = { ...prev }; delete n[loopId]; return n; });
  };

  const stopAll = () => {
    Object.keys(loopSourcesRef.current).forEach(k => stopLoop(Number(k)));
  };

  const loadAudio = async (file: File, target: 'pad' | 'loop', id: number) => {
    const ctx = getAudioContext();
    const buf = await file.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(buf);
    if (target === 'pad') {
      setPads(prev => prev.map(p => p.id === id ? { ...p, audioBuffer, fileName: file.name } : p));
    } else {
      setLoops(prev => prev.map(l => l.id === id ? { ...l, audioBuffer, fileName: file.name } : l));
    }
  };

  const exportBank = async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const meta = { pads: pads.map(p => ({ ...p, audioBuffer: undefined })), loops: loops.map(l => ({ ...l, audioBuffer: undefined })) };
    zip.file('meta.json', JSON.stringify(meta));
    // Note: actual audio files would need to be stored as blobs
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'beatmaster-bank.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">🎹 Sampler</h2>
        <Button variant="destructive" size="sm" onClick={stopAll} className="text-xs gap-1">
          <Square className="w-3 h-3" /> Stop All
        </Button>
      </div>

      <Tabs defaultValue="pads">
        <TabsList className="w-full">
          <TabsTrigger value="pads" className="flex-1">Pads</TabsTrigger>
          <TabsTrigger value="sampler" className="flex-1">Sampler</TabsTrigger>
        </TabsList>

        <TabsContent value="pads" className="space-y-3 mt-4">
          <div className="grid grid-cols-5 gap-2">
            {pads.map((pad, i) => (
              <button
                key={pad.id}
                onClick={() => playPad(pad.id)}
                className={`bg-gradient-to-b ${padColors[i]} border rounded-xl p-4 text-center font-bold text-sm transition-all active:scale-95 active:brightness-125`}
              >
                {pad.fileName || pad.name}
              </button>
            ))}
          </div>
          {pads.map((pad, i) => (
            <div key={pad.id} className="flex items-center gap-2 text-xs">
              <span className="w-14 text-muted-foreground">{pad.name}</span>
              <Volume2 className="w-3 h-3 text-muted-foreground" />
              <Slider value={[pad.volume]} onValueChange={([v]) => setPads(prev => prev.map(p => p.id === pad.id ? { ...p, volume: v } : p))} min={0} max={1} step={0.01} className="flex-1" />
              <span className="text-muted-foreground text-[10px] w-6">Pan</span>
              <Slider value={[pad.pan]} onValueChange={([v]) => setPads(prev => prev.map(p => p.id === pad.id ? { ...p, pan: v } : p))} min={-1} max={1} step={0.01} className="w-20" />
              <label className="cursor-pointer">
                <Upload className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                <input type="file" accept="audio/*" className="hidden" onChange={e => { if (e.target.files?.[0]) loadAudio(e.target.files[0], 'pad', pad.id); }} />
              </label>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="sampler" className="space-y-3 mt-4">
          <div className="grid grid-cols-5 gap-2">
            {loops.map((loop, i) => (
              <div key={loop.id} className="relative">
                <button
                  onClick={() => loop.audioBuffer ? playLoop(loop.id) : undefined}
                  className={`w-full bg-gradient-to-b ${padColors[i]} border rounded-xl p-4 text-center font-bold text-sm transition-all active:scale-95 ${!loop.audioBuffer ? 'opacity-40' : ''}`}
                >
                  {loop.fileName || loop.name}
                </button>
                {loopProgress[loop.id] !== undefined && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted rounded-b-xl overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${(loopProgress[loop.id] || 0) * 100}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {loops.map((loop, i) => (
            <div key={loop.id} className="flex items-center gap-2 text-xs">
              <span className="w-14 text-muted-foreground">{loop.name}</span>
              <Volume2 className="w-3 h-3 text-muted-foreground" />
              <Slider value={[loop.volume]} onValueChange={([v]) => setLoops(prev => prev.map(l => l.id === loop.id ? { ...l, volume: v } : l))} min={0} max={1} step={0.01} className="flex-1" />
              <span className="text-muted-foreground text-[10px] w-6">Pan</span>
              <Slider value={[loop.pan]} onValueChange={([v]) => setLoops(prev => prev.map(l => l.id === loop.id ? { ...l, pan: v } : l))} min={-1} max={1} step={0.01} className="w-20" />
              <label className="cursor-pointer">
                <Upload className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                <input type="file" accept="audio/*" className="hidden" onChange={e => { if (e.target.files?.[0]) loadAudio(e.target.files[0], 'loop', loop.id); }} />
              </label>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={exportBank} className="text-xs gap-1">
          <Download className="w-3 h-3" /> Exportar Banco
        </Button>
      </div>
    </div>
  );
};

export default SamplerPad;
