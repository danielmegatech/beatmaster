import { useRef, useCallback, useState, useEffect } from 'react';
import type { SoundTimbre, Subdivision } from '@/types/beatmaster';

function getBeatsPerMeasure(ts: string): number {
  const n = parseInt(ts.split('/')[0]);
  return n;
}

function getSubdivisionMultiplier(sub: Subdivision): number {
  switch (sub) {
    case 'quarter': return 1;
    case 'eighth': return 2;
    case 'triplet': return 3;
    case 'sixteenth': return 4;
  }
}

function playClick(
  ctx: AudioContext,
  time: number,
  isAccent: boolean,
  timbre: SoundTimbre,
  volume: number,
  pan: number,
  masterGain: GainNode
) {
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  gain.connect(panner);
  panner.connect(masterGain);

  const clickVol = isAccent ? volume : volume * 0.6;

  switch (timbre) {
    case 'triangle':
    case 'sine':
    case 'square':
    case 'sawtooth': {
      const osc = ctx.createOscillator();
      osc.type = timbre;
      osc.frequency.value = isAccent ? 1000 : 800;
      gain.gain.setValueAtTime(clickVol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + 0.05);
      break;
    }
    case 'woodblock': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = isAccent ? 800 : 650;
      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.value = isAccent ? 800 : 650;
      bpf.Q.value = 20;
      gain.gain.setValueAtTime(clickVol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      osc.connect(bpf);
      bpf.connect(gain);
      osc.start(time);
      osc.stop(time + 0.05);
      break;
    }
    case 'cowbell': {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'square';
      osc2.type = 'square';
      osc1.frequency.value = isAccent ? 800 : 540;
      osc2.frequency.value = isAccent ? 540 : 400;
      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.value = 800;
      bpf.Q.value = 3;
      gain.gain.setValueAtTime(clickVol * 0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      osc1.connect(bpf);
      osc2.connect(bpf);
      bpf.connect(gain);
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 0.15);
      osc2.stop(time + 0.15);
      break;
    }
    case 'hihat': {
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = isAccent ? 8000 : 6000;
      gain.gain.setValueAtTime(clickVol * 0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      noise.connect(hpf);
      hpf.connect(gain);
      noise.start(time);
      noise.stop(time + 0.06);
      break;
    }
    case 'rim': {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = isAccent ? 1700 : 1400;
      gain.gain.setValueAtTime(clickVol * 0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + 0.02);
      break;
    }
    case 'clave': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = isAccent ? 2500 : 2000;
      gain.gain.setValueAtTime(clickVol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + 0.03);
      break;
    }
    case 'click': {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = isAccent ? 1500 : 1200;
      gain.gain.setValueAtTime(clickVol * 0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.01);
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + 0.015);
      break;
    }
    case 'bell': {
      // Bell: two sine partials with long decay
      const f1 = isAccent ? 880 : 660;
      const f2 = f1 * 2.76;
      [f1, f2].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(clickVol * (i === 0 ? 0.7 : 0.3), time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
        osc.connect(g);
        g.connect(gain);
        osc.start(time);
        osc.stop(time + 0.65);
      });
      gain.gain.setValueAtTime(1, time);
      break;
    }
    case 'bongo': {
      // Bongo: pitched membrane (sine + quick decay + body)
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const baseFreq = isAccent ? 280 : 180;
      osc.frequency.setValueAtTime(baseFreq * 2, time);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.05);
      gain.gain.setValueAtTime(clickVol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + 0.22);
      break;
    }
    case 'beep': {
      // Beep: clean sine, electronic
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = isAccent ? 2000 : 1500;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(clickVol, time + 0.005);
      gain.gain.setValueAtTime(clickVol, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + 0.1);
      break;
    }
  }
}

export function useMetronome() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [subdivision, setSubdivision] = useState<Subdivision>('quarter');
  const [sound, setSound] = useState<SoundTimbre>('click');
  const [volume, setVolume] = useState(0.8);
  const [pan, setPan] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [countIn, setCountIn] = useState(false);
  const [isCountingIn, setIsCountingIn] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const nextBeatTimeRef = useRef(0);
  const currentBeatRef = useRef(0);
  const countInBeatRef = useRef(0);
  const isCountInPhaseRef = useRef(false);
  const COUNT_IN_MEASURES = 2;
  const scheduleAheadTime = 0.1;
  const lookahead = 25; // ms

  // Refs for latest values to avoid stale closures
  const bpmRef = useRef(bpm);
  const tsRef = useRef(timeSignature);
  const subRef = useRef(subdivision);
  const soundRef = useRef(sound);
  const volumeRef = useRef(volume);
  const panRef = useRef(pan);
  const countInRef = useRef(countIn);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { tsRef.current = timeSignature; }, [timeSignature]);
  useEffect(() => { subRef.current = subdivision; }, [subdivision]);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { countInRef.current = countIn; }, [countIn]);
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = masterVolume;
    }
  }, [masterVolume]);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      masterGainRef.current = ctxRef.current.createGain();
      masterGainRef.current.gain.value = masterVolume;
      masterGainRef.current.connect(ctxRef.current.destination);
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const scheduler = useCallback(() => {
    const ctx = ctxRef.current!;
    const mg = masterGainRef.current!;
    while (nextBeatTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const beats = getBeatsPerMeasure(tsRef.current);

      // Count-in phase: 2 full measures of accented clicks (cowbell)
      if (isCountInPhaseRef.current) {
        const totalCountInBeats = beats * COUNT_IN_MEASURES;
        const beatInMeasure = countInBeatRef.current % beats;
        const isAccent = beatInMeasure === 0;
        playClick(ctx, nextBeatTimeRef.current, isAccent, 'cowbell', volumeRef.current, panRef.current, mg);

        const beatIdx = beatInMeasure;
        const delay = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000);
        setTimeout(() => setCurrentBeat(beatIdx), delay);

        const secondsPerBeat = 60.0 / bpmRef.current;
        nextBeatTimeRef.current += secondsPerBeat;
        countInBeatRef.current++;

        if (countInBeatRef.current >= totalCountInBeats) {
          isCountInPhaseRef.current = false;
          currentBeatRef.current = 0;
          const d2 = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000);
          setTimeout(() => setIsCountingIn(false), d2);
        }
        continue;
      }

      const subMul = getSubdivisionMultiplier(subRef.current);
      const totalSubBeats = beats * subMul;
      const isMainBeat = currentBeatRef.current % subMul === 0;
      const mainBeatIndex = Math.floor(currentBeatRef.current / subMul);
      const isAccent = mainBeatIndex === 0 && isMainBeat;

      playClick(ctx, nextBeatTimeRef.current, isAccent, soundRef.current, volumeRef.current, panRef.current, mg);

      // Only update visual on main beats
      if (isMainBeat) {
        const beatIdx = mainBeatIndex;
        const delay = Math.max(0, (nextBeatTimeRef.current - ctx.currentTime) * 1000);
        setTimeout(() => setCurrentBeat(beatIdx), delay);
      }

      const secondsPerBeat = 60.0 / bpmRef.current;
      nextBeatTimeRef.current += secondsPerBeat / subMul;
      currentBeatRef.current = (currentBeatRef.current + 1) % totalSubBeats;
    }
  }, []);

  const start = useCallback(() => {
    const ctx = getCtx();
    currentBeatRef.current = 0;
    nextBeatTimeRef.current = ctx.currentTime + 0.05;
    setIsPlaying(true);
    setCurrentBeat(0);

    // Count-in
    if (countInRef.current) {
      isCountInPhaseRef.current = true;
      countInBeatRef.current = 0;
      setIsCountingIn(true);
    } else {
      isCountInPhaseRef.current = false;
    }

    const loop = () => {
      scheduler();
      timerRef.current = window.setTimeout(loop, lookahead);
    };
    loop();
  }, [getCtx, scheduler]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setIsPlaying(false);
    setCurrentBeat(-1);
    setIsCountingIn(false);
    isCountInPhaseRef.current = false;
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) stop(); else start();
  }, [isPlaying, start, stop]);

  // Tap tempo
  const tapTimesRef = useRef<number[]>([]);
  const tapTempo = useCallback(() => {
    const now = performance.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 5) tapTimesRef.current.shift();
    if (tapTimesRef.current.length >= 2) {
      const last = tapTimesRef.current[tapTimesRef.current.length - 1];
      const prev = tapTimesRef.current[tapTimesRef.current.length - 2];
      if (last - prev > 2000) {
        tapTimesRef.current = [now];
        return;
      }
    }
    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const newBpm = Math.round(60000 / avg);
      if (newBpm >= 40 && newBpm <= 240) setBpm(newBpm);
    }
  }, []);

  // Get AudioContext for sampler
  const getAudioContext = useCallback(() => getCtx(), [getCtx]);
  const getMasterGain = useCallback(() => {
    getCtx();
    return masterGainRef.current!;
  }, [getCtx]);

  return {
    isPlaying, bpm, setBpm, timeSignature, setTimeSignature,
    subdivision, setSubdivision, sound, setSound,
    volume, setVolume, pan, setPan,
    currentBeat, masterVolume, setMasterVolume,
    countIn, setCountIn, isCountingIn,
    start, stop, toggle, tapTempo,
    getAudioContext, getMasterGain,
    beatsPerMeasure: getBeatsPerMeasure(timeSignature),
  };
}
