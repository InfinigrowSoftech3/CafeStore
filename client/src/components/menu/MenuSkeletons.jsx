export function PopularSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 min-[390px]:-mx-5 min-[390px]:px-5 sm:mx-0 sm:px-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="w-[180px] min-w-[180px] sm:w-[210px] sm:min-w-[210px] shrink-0 rounded-none bg-white border border-stone-200 animate-pulse overflow-hidden flex flex-col justify-between"
        >
          <div className="w-full aspect-square bg-stone-100 border-b border-stone-200 relative">
            <div className="absolute top-2.5 left-2.5 w-4 h-4 rounded-none bg-stone-200" />
            <div className="absolute top-2.5 right-2.5 w-12 h-4 rounded-none bg-stone-200" />
          </div>
          <div className="p-3 space-y-2">
            <div className="h-4 bg-stone-200 rounded-none w-3/4" />
            <div className="h-3.5 bg-stone-200 rounded-none w-1/3" />
            <div className="h-3 bg-stone-100 rounded-none w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="bg-white border border-stone-200 divide-y divide-stone-200 rounded-none shadow-2xs">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="p-4 sm:p-5 flex items-start justify-between gap-4 animate-pulse bg-white"
        >
          <div className="flex-1 space-y-2.5 pr-2">
            <div className="w-4 h-4 bg-stone-200 rounded-none" />
            <div className="h-5 bg-stone-200 rounded-none w-1/2" />
            <div className="h-4 bg-stone-200 rounded-none w-1/4" />
            <div className="h-3.5 bg-stone-100 rounded-none w-4/5" />
            <div className="h-3.5 bg-stone-100 rounded-none w-3/5" />
          </div>
          <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 aspect-square bg-stone-100 border border-stone-200 rounded-none shrink-0" />
        </div>
      ))}
    </div>
  );
}
