export function PopularSkeleton() {
  return (
    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 no-scrollbar overscroll-x-contain">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="w-[185px] min-w-[185px] sm:w-[210px] sm:min-w-[210px] shrink-0 rounded-2xl bg-[#FFFDF9] border border-[#EFE4D6] animate-pulse overflow-hidden flex flex-col justify-between shadow-2xs"
        >
          <div className="w-full aspect-square bg-[#F3E9DC] border-b border-[#EFE4D6] relative rounded-t-2xl">
            <div className="absolute top-2.5 left-2.5 w-4 h-4 rounded-md bg-stone-200" />
            <div className="absolute top-2.5 right-2.5 w-12 h-4 rounded-full bg-stone-200" />
          </div>
          <div className="p-3 space-y-2">
            <div className="h-4 bg-stone-200 rounded-full w-3/4" />
            <div className="h-3.5 bg-stone-200 rounded-full w-1/3" />
            <div className="h-3 bg-[#F3E9DC] rounded-full w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-[#FFFDF9] border border-[#EFE4D6] rounded-2xl overflow-hidden animate-pulse shadow-2xs"
        >
          <div className="w-full h-44 sm:h-52 md:h-64 bg-[#F3E9DC] border-b border-[#EFE4D6] rounded-t-2xl" />
          <div className="p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-stone-200 rounded-md" />
              <div className="w-20 h-4 bg-stone-200 rounded-full" />
              <div className="w-14 h-4 bg-stone-200 rounded-full" />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-stone-200 rounded-full w-1/3" />
                <div className="h-4 bg-stone-200 rounded-full w-1/5" />
                <div className="h-3.5 bg-[#F3E9DC] rounded-full w-4/5" />
              </div>
              <div className="w-20 h-9 bg-stone-200 rounded-full shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
