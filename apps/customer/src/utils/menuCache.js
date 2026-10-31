import { getTenantSlug } from './tenantHelper.js';

// Lightweight in-memory + sessionStorage cache for client-side API requests
const memoryCache = new Map();

export const DEFAULT_TTL_MS = 60 * 1000; // 1 minute default for menu queries
export const CATEGORIES_TTL_MS = 5 * 60 * 1000; // 5 minutes for categories

function getTenantPrefix(customSlug) {
  const slug = customSlug || getTenantSlug() || 'anon';
  return `customer:${slug}:cache:`;
}

export function getCached(key, customSlug) {
  const now = Date.now();
  const slug = customSlug || getTenantSlug() || 'anon';
  const memKey = `${slug}:${key}`;

  // 1. Check in-memory cache
  const mem = memoryCache.get(memKey);
  if (mem && now - mem.timestamp < mem.ttl) {
    return mem.data;
  }

  // 2. Check sessionStorage
  try {
    const storageKey = `${getTenantPrefix(slug)}${key}`;
    const raw = sessionStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && now - parsed.timestamp < parsed.ttl) {
        // Hydrate memory cache
        memoryCache.set(memKey, parsed);
        return parsed.data;
      } else {
        sessionStorage.removeItem(storageKey);
      }
    }
  } catch (e) {
    // Ignore sessionStorage errors (e.g. private browsing quota)
  }

  return null;
}

export function setCached(key, data, ttl = DEFAULT_TTL_MS, customSlug) {
  const slug = customSlug || getTenantSlug() || 'anon';
  const memKey = `${slug}:${key}`;
  const entry = {
    timestamp: Date.now(),
    ttl,
    data,
  };

  memoryCache.set(memKey, entry);

  try {
    sessionStorage.setItem(`${getTenantPrefix(slug)}${key}`, JSON.stringify(entry));
  } catch (e) {
    // Ignore quota errors
  }
}

export function clearClientCache(targetSlug) {
  if (targetSlug) {
    const prefix = `${targetSlug}:`;
    for (const k of memoryCache.keys()) {
      if (k.startsWith(prefix)) {
        memoryCache.delete(k);
      }
    }
  } else {
    memoryCache.clear();
  }

  try {
    const normalizedTarget = targetSlug ? String(targetSlug).toLowerCase().trim() : null;
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k) {
        if (!normalizedTarget && (k.startsWith('customer:') || k.startsWith('cafe_cache_') || k.startsWith('brewhaus_cache_'))) {
          sessionStorage.removeItem(k);
        } else if (normalizedTarget && (k.startsWith(`customer:${normalizedTarget}:cache:`) || k.startsWith(`customer:${normalizedTarget}:`))) {
          sessionStorage.removeItem(k);
        }
      }
    }
  } catch { /* Session storage is optional when browser storage is disabled. */ }
}


