import { LayoutGrid } from 'lucide-react';
import { getCategoryVisual } from '../../utils/categoryIcons';

export default function CustomerCategoryCircles({
  categories = [],
  selectedCategory = 'all',
  onSelectCategory,
}) {
  return (
    <div className="w-full">
      <div className="flex items-start gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory px-1 -mx-1">
        {/* "All" circular button */}
        <div className="flex flex-col items-center shrink-0 snap-start">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            aria-label="View all categories"
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-[#2B1810] text-[#FFFDF9] shadow-[0_6px_18px_rgba(43,24,16,0.3)] ring-2 ring-[#2B1810] ring-offset-2 ring-offset-[#FBF6EF]'
                : 'bg-[#FFFDF9] text-[#7B6B5F] border border-[#EFE4D6] shadow-[0_4px_12px_rgba(90,50,20,0.06)] hover:border-[#7A3316]/40'
            }`}
          >
            <LayoutGrid size={22} strokeWidth={2.4} />
          </button>
          <span className="text-xs font-bold text-[#2B1810] mt-1.5 tracking-tight">
            All
          </span>
        </div>

        {/* Dynamic Café Categories */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat._id;
          const visual = getCategoryVisual(cat);

          return (
            <div key={cat._id} className="flex flex-col items-center shrink-0 snap-start">
              <button
                type="button"
                onClick={() => onSelectCategory(cat._id)}
                aria-label={`View ${cat.name} category`}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? 'bg-[#7A3316] text-[#FFFDF9] shadow-[0_6px_18px_rgba(122,51,22,0.35)] ring-2 ring-[#7A3316] ring-offset-2 ring-offset-[#FBF6EF]'
                    : 'bg-[#FFFDF9] text-[#2B1810] border border-[#EFE4D6] shadow-[0_4px_12px_rgba(90,50,20,0.06)] hover:border-[#7A3316]/40 hover:bg-white'
                }`}
              >
                <span>{visual}</span>
              </button>
              <span className="text-xs font-semibold text-[#2B1810] mt-1.5 tracking-tight max-w-[70px] truncate text-center">
                {cat.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
