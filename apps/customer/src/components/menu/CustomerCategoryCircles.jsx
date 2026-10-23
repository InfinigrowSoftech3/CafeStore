import { LayoutGrid } from 'lucide-react';
import { getCategoryFallbackImage, getCategoryImage } from '../../utils/categoryIcons';

export default function CustomerCategoryCircles({
  categories = [],
  selectedCategory = 'all',
  imagesByCategoryId = {},
  onSelectCategory,
}) {
  return (
    <div className="w-full">
      <div className="flex snap-x snap-mandatory items-start gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar">
        {/* "All" circular button */}
        <div className="flex min-w-[84px] shrink-0 snap-start flex-col items-center">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            aria-label="View all categories"
            className={`flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-[#2B1810] text-[#FFFDF9] shadow-[0_6px_18px_rgba(43,24,16,0.3)] ring-2 ring-[#2B1810] ring-offset-2 ring-offset-[#FBF6EF]'
                : 'bg-[#FFFDF9] text-[#7B6B5F] border border-[#EFE4D6] shadow-[0_4px_12px_rgba(90,50,20,0.06)] hover:border-[#7A3316]/40'
            }`}
          >
            <LayoutGrid size={22} strokeWidth={2.4} />
          </button>
          <span className="mt-1.5 min-h-[2.1rem] w-full max-w-[104px] px-1 text-center text-xs font-bold leading-[1.15] tracking-tight text-[#2B1810]">
            All
          </span>
        </div>

        {/* Dynamic Café Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat._id;
          const image = getCategoryImage(cat, imagesByCategoryId);
          const fallbackImage = getCategoryFallbackImage(cat);

          return (
            <div key={cat._id} className="flex min-w-[84px] shrink-0 snap-start flex-col items-center">
              <button
                type="button"
                onClick={() => onSelectCategory(cat._id)}
                aria-label={`View ${cat.name} category`}
                className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border bg-[#F3E9DC] transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? 'border-[#7A3316] shadow-[0_6px_18px_rgba(122,51,22,0.35)] ring-2 ring-[#7A3316] ring-offset-2 ring-offset-[#FBF6EF]'
                    : 'border-[#EFE4D6] shadow-[0_4px_12px_rgba(90,50,20,0.06)] hover:border-[#7A3316]/40'
                }`}
              >
                <img
                  src={image}
                  alt=""
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = fallbackImage;
                  }}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </button>
              <span className="mt-1.5 min-h-[2.1rem] w-full max-w-[104px] break-words px-1 text-center text-xs font-semibold leading-[1.15] tracking-tight text-[#2B1810]">
                {cat.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
