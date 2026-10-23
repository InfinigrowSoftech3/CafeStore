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

const DEFAULT_CATEGORY_IMAGE = '/images/food/brewhaus-brunch-platter-veg.jpg';

const CATEGORY_IMAGE_RULES = [
  { match: /coffee|brew|espresso|tea|chai|latte|cappuccino/i, image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80' },
  { match: /burger|sandwich|wrap/i, image: '/images/food/classic-veg-burger.jpg' },
  { match: /pizza/i, image: '/images/food/farmhouse-pizza-veg.jpg' },
  { match: /snack|starter|fries|nacho|bite/i, image: '/images/food/loaded-veg-nachos.jpg' },
  { match: /dessert|bakery|cake|pastry|waffle|sweet|brownie/i, image: '/images/food/butter-croissant.jpg' },
  { match: /pancake|waffle|toast|breakfast/i, image: '/images/food/fluffy-veg-pancakes.jpg' },
  { match: /salad|healthy|bowl/i, image: '/images/food/fresh-veg-salad.jpg' },
  { match: /pasta|noodle/i, image: '/images/food/creamy-pesto-pasta.jpg' },
  { match: /special|platter|thali|brunch/i, image: '/images/food/brewhaus-brunch-platter-veg.jpg' },
];

/**
 * Resolves a real photo for a category, preferring the category's own image,
 * then the first available product photo, and finally a local food fallback.
 */
export function getCategoryImage(category, imagesByCategoryId = {}) {
  if (!category) return DEFAULT_CATEGORY_IMAGE;

  const categoryImage = category.image || category.imageUrl;
  if (typeof categoryImage === 'string' && categoryImage.trim()) {
    return categoryImage.trim();
  }

  const productImage = category._id ? imagesByCategoryId[String(category._id)] : null;
  if (typeof productImage === 'string' && productImage.trim()) {
    return productImage.trim();
  }

  return getCategoryFallbackImage(category);
}

export function getCategoryFallbackImage(category) {
  const name = String(category?.name || '');
  const rule = CATEGORY_IMAGE_RULES.find(({ match }) => match.test(name));
  return rule ? rule.image : DEFAULT_CATEGORY_IMAGE;
}
