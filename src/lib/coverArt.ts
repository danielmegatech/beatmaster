// Cover art lookup with iTunes → MusicBrainz fallback + localStorage cache.
const CACHE_KEY = 'bm-cover-cache-v1';

type CoverCache = Record<string, string>; // key -> url

function loadCache(): CoverCache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveCache(c: CoverCache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* quota */ }
}

function keyFor(artist: string, title: string) {
  return `${(artist || '').toLowerCase().trim()}|${title.toLowerCase().trim()}`;
}

async function searchItunes(artist: string, title: string): Promise<string | null> {
  try {
    const term = encodeURIComponent(`${artist} ${title}`.trim());
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=1`);
    if (!res.ok) return null;
    const data = await res.json();
    const url: string | undefined = data?.results?.[0]?.artworkUrl100;
    if (!url) return null;
    // Upgrade to higher resolution
    return url.replace('100x100', '300x300');
  } catch {
    return null;
  }
}

// Deterministic picsum fallback so each song still gets a unique-looking cover.
function picsumFallback(title: string, artist?: string): string {
  const seed = encodeURIComponent(`${(artist || '').toLowerCase()}-${title.toLowerCase()}`.slice(0, 60) || 'song');
  return `https://picsum.photos/seed/${seed}/300/300`;
}

export async function fetchCoverArt(
  title: string,
  artist?: string,
): Promise<string | null> {
  if (!title) return null;
  const cache = loadCache();
  const k = keyFor(artist || '', title);
  if (cache[k]) return cache[k];

  const url = await searchItunes(artist || '', title);
  if (url) {
    cache[k] = url;
    saveCache(cache);
    return url;
  }
  // Fallback: deterministic placeholder cover (cached)
  const fallback = picsumFallback(title, artist);
  cache[k] = fallback;
  saveCache(cache);
  return fallback;
}

export function setCachedCover(title: string, artist: string | undefined, url: string) {
  const cache = loadCache();
  cache[keyFor(artist || '', title)] = url;
  saveCache(cache);
}
