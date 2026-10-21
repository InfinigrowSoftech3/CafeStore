/**
 * Resolves a category visual icon or emoji based on category metadata and keywords.
 * Defaults to 🍽️ per the design spec.
 */
export function getCategoryVisual(category) {
  if (!category) return '🍽️';
  if (category.icon && typeof category.icon === 'string' && category.icon.trim()) {
    return category.icon.trim();
  }
  const name = String(category.name || '').toLowerCase();
  if (name.includes('coffee') || name.includes('brew') || name.includes('tea') || name.includes('espresso') || name.includes('cappuccino')) return '☕';
  if (name.includes('snack') || name.includes('burger') || name.includes('sandwich') || name.includes('finger') || name.includes('bite') || name.includes('wrap')) return '🍔';
  if (name.includes('beverage') || name.includes('drink') || name.includes('cold') || name.includes('shake') || name.includes('smoothie') || name.includes('juice') || name.includes('soda') || name.includes('mojito')) return '🥤';
  if (name.includes('dessert') || name.includes('cake') || name.includes('sweet') || name.includes('bakery') || name.includes('pastry') || name.includes('brownie')) return '🍰';
  if (name.includes('pizza')) return '🍕';
  if (name.includes('pancake') || name.includes('waffle') || name.includes('toast') || name.includes('breakfast')) return '🥞';
  if (name.includes('salad') || name.includes('healthy') || name.includes('bowl')) return '🥗';
  if (name.includes('pasta') || name.includes('noodle')) return '🍝';
  return '🍽️';
}
