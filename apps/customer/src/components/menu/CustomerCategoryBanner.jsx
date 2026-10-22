export default function CustomerCategoryBanner({ category }) {
  const catName = category?.name || 'Category';
  const subtitle =
    category?.description ||
    category?.subtitle ||
    'A perfect selection to brighten your day';

  const catImage = category?.image || category?.imageUrl || '/logo.png';

  return (
    <div className="relative w-full overflow-hidden rounded-[24px] bg-gradient-to-br from-[#2B1810] via-[#22130C] to-[#150A05] p-5 shadow-[0_8px_24px_rgba(43,24,16,0.2)] border border-[#3E2419]">
      {/* Warm Ambient Glow */}
      <div
        className="absolute -top-10 -left-10 w-36 h-36 bg-[#B5702F]/20 rounded-full blur-2xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#7A3316]/30 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-center justify-between gap-4">
        {/* Left Side: Serif Cream Title + 1-Line Subtitle */}
        <div className="max-w-[220px] py-1">
          <h2 className="font-display font-bold text-2xl text-[#FFFDF9] leading-tight">
            {catName}
          </h2>
          <p className="text-xs text-[#F3E9DC]/80 mt-1.5 line-clamp-2 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Right Side: Overlapping category / coffee cup image */}
        <div className="shrink-0 w-24 h-24 -mr-3 -my-2 flex items-center justify-center">
          <img
            src={catImage}
            alt={catName}
            className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:scale-105"
          />
        </div>
      </div>
    </div>
  );
}
