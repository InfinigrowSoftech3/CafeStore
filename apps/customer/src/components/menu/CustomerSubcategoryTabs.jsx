export default function CustomerSubcategoryTabs({
  subcategories = [],
  selectedSubcategory = 'all',
  onSelectSubcategory,
}) {
  if (!subcategories || subcategories.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full py-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x pr-8">
        <button
          type="button"
          onClick={() => onSelectSubcategory('all')}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
            selectedSubcategory === 'all'
              ? 'bg-[#7A3316] text-[#FFFDF9] shadow-xs'
              : 'bg-[#F3E9DC] text-[#2B1810] hover:bg-[#EFE4D6]'
          }`}
        >
          All
        </button>

        {subcategories.map((sub) => {
          const id = typeof sub === 'string' ? sub : sub._id || sub.id || sub.name;
          const label = typeof sub === 'string' ? sub : sub.name || sub.title;
          const isSelected = selectedSubcategory === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectSubcategory(id)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                isSelected
                  ? 'bg-[#7A3316] text-[#FFFDF9] shadow-xs'
                  : 'bg-[#F3E9DC] text-[#2B1810] hover:bg-[#EFE4D6]'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Right Edge Gradient Fade */}
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#FFFDF9] to-transparent"
        aria-hidden="true"
      />
    </div>
  );
}
