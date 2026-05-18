// Bump versione cache per invalidare dati locali non coerenti dopo cambio DB/ambiente.
const CACHE_KEY = 'mz_activities_cache_v5';
// 6 ore: i dati Garmin cambiamo al massimo una volta al giorno.
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

type ActivityCacheType = 'running' | 'trekking';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCacheKey(type: ActivityCacheType): string {
  return `${CACHE_KEY}_${type}`;
}

export function getCachedActivities<T>(type: ActivityCacheType): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(getCacheKey(type));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.timestamp !== 'number') {
      return null;
    }

    const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION_MS;
    if (isExpired) {
      localStorage.removeItem(getCacheKey(type));
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error('[cache] Read error', error);
    return null;
  }
}

export function setCachedActivities<T>(data: T, type: ActivityCacheType): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const payload: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(getCacheKey(type), JSON.stringify(payload));
  } catch (error) {
    console.error('[cache] Write error', error);
  }
}

export function clearCache(type?: ActivityCacheType): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (type) {
      localStorage.removeItem(getCacheKey(type));
      return;
    }

    localStorage.removeItem(getCacheKey('running'));
    localStorage.removeItem(getCacheKey('trekking'));
  } catch (error) {
    console.error('[cache] Clear error', error);
  }
}

export function getCacheStatus(type: ActivityCacheType): { isCached: boolean; expiresIn: number } {
  if (typeof window === 'undefined') {
    return { isCached: false, expiresIn: 0 };
  }

  try {
    const raw = localStorage.getItem(getCacheKey(type));
    if (!raw) {
      return { isCached: false, expiresIn: 0 };
    }

    const parsed = JSON.parse(raw) as CacheEntry<unknown>;
    const expiresIn = CACHE_DURATION_MS - (Date.now() - parsed.timestamp);

    if (expiresIn <= 0) {
      localStorage.removeItem(getCacheKey(type));
      return { isCached: false, expiresIn: 0 };
    }

    return {
      isCached: true,
      expiresIn,
    };
  } catch {
    return { isCached: false, expiresIn: 0 };
  }
}
