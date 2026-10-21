/**
 * Favorites persistence in localStorage per café slug.
 * All storage operations are wrapped in try/catch to guard against storage restrictions.
 */
export function getFavorites(cafeSlug) {
  if (typeof window === 'undefined') return [];
  const safeSlug = String(cafeSlug || 'default').toLowerCase().trim();
  try {
    const raw = localStorage.getItem(`customer:${safeSlug}:favorites`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(cafeSlug, productId) {
  if (typeof window === 'undefined' || !productId) return false;
  const safeSlug = String(cafeSlug || 'default').toLowerCase().trim();
  try {
    const list = getFavorites(safeSlug);
    const id = String(productId);
    const exists = list.includes(id);
    const updated = exists ? list.filter((item) => item !== id) : [...list, id];
    localStorage.setItem(`customer:${safeSlug}:favorites`, JSON.stringify(updated));
    return !exists;
  } catch {
    return false;
  }
}
