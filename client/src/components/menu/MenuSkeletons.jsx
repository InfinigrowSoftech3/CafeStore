export function PopularSkeleton() {
  return (
    <div className="flex gap-3.5 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 min-[390px]:-mx-5 min-[390px]:px-5 sm:mx-0 sm:px-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square w-[170px] min-w-[170px] min-[390px]:w-[185px] min-[390px]:min-w-[185px] sm:w-[205px] sm:min-w-[205px] shrink-0 rounded-[20px] sm:rounded-[24px] bg-[#0F3D2E]/8 border border-[#0F3D2E]/10 animate-pulse relative overflow-hidden"
        >
          <div className="absolute top-2.5 left-2.5 w-4 h-4 rounded bg-[#0F3D2E]/15" />
          <div className="absolute top-2.5 right-2.5 w-10 h-4 rounded-full bg-[#0F3D2E]/15" />
          <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between">
            <div className="space-y-1 w-2/3">
              <div className="h-4 bg-[#0F3D2E]/20 rounded w-full" />
              <div className="h-4 bg-[#0F3D2E]/20 rounded w-1/2" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#0F3D2E]/20 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 min-[390px]:gap-3.5 sm:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square w-full rounded-[20px] sm:rounded-[24px] bg-[#0F3D2E]/8 border border-[#0F3D2E]/10 animate-pulse relative overflow-hidden"
        >
          <div className="absolute top-2.5 left-2.5 w-4 h-4 rounded bg-[#0F3D2E]/15" />
          <div className="absolute top-2.5 right-2.5 w-10 h-4 rounded-full bg-[#0F3D2E]/15" />
          <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between">
            <div className="space-y-1 w-2/3">
              <div className="h-4 bg-[#0F3D2E]/20 rounded w-full" />
              <div className="h-4 bg-[#0F3D2E]/20 rounded w-1/2" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#0F3D2E]/20 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
