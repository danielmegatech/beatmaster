import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticPayload {
  app: string;
  url: string;
  route: string;
  timestamp: string;
  language: string;
  timezone: string;
  screen: { width: number; height: number; dpr: number };
  viewport: { width: number; height: number };
  online: boolean;
  platform: string;
  memoryGb?: number;
  cores?: number;
  audio?: { supported: boolean; sampleRate?: number; state?: string };
  storage?: { playlists: number; songs: number; keys: number; approxKb: number };
  settings?: Record<string, unknown>;
  errors?: string[];
}

const SAFE_KEYS = [
  'bm-mode', 'bm-dark-mode', 'bm-skin', 'bm-tts-enabled', 'bm-active-playlist', 'bm-active-song',
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function collectDiagnostics(): DiagnosticPayload {
  const playlists = readJson<Array<{ songs?: unknown[] }>>('bm-playlists', []);
  let approxKb = 0;
  let keys = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      keys++;
      approxKb += (localStorage.getItem(k)?.length ?? 0) / 1024;
    }
  } catch { /* ignore */ }

  let audio: DiagnosticPayload['audio'] = { supported: false };
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    audio = { supported: !!Ctor };
  } catch { /* ignore */ }

  const settings: Record<string, unknown> = {};
  SAFE_KEYS.forEach(k => { settings[k] = readJson<unknown>(k, null); });

  const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };

  return {
    app: 'BeatMaster',
    url: window.location.href,
    route: window.location.pathname,
    timestamp: new Date().toISOString(),
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: { width: window.screen.width, height: window.screen.height, dpr: window.devicePixelRatio },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    online: navigator.onLine,
    platform: nav.platform ?? 'unknown',
    memoryGb: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    audio,
    storage: {
      playlists: playlists.length,
      songs: playlists.reduce((acc, p) => acc + (p.songs?.length ?? 0), 0),
      keys,
      approxKb: Math.round(approxKb * 10) / 10,
    },
    settings,
    errors: getCapturedErrors(),
  };
}

const capturedErrors: string[] = [];

export function initDiagnosticsCapture() {
  const push = (msg: string) => {
    capturedErrors.push(`${new Date().toISOString()} ${msg}`.slice(0, 500));
    if (capturedErrors.length > 20) capturedErrors.shift();
  };
  window.addEventListener('error', e => push(`error: ${e.message}`));
  window.addEventListener('unhandledrejection', e => push(`rejection: ${String((e as PromiseRejectionEvent).reason)}`));
}

export function getCapturedErrors() {
  return [...capturedErrors];
}

export async function sendDiagnostics(note?: string) {
  const payload = collectDiagnostics();
  const { error } = await supabase.from('diagnostics').insert({
    note: note?.slice(0, 2000) || null,
    payload: JSON.parse(JSON.stringify(payload)),
    user_agent: navigator.userAgent.slice(0, 500),
  });
  if (error) throw error;
  return payload;
}
