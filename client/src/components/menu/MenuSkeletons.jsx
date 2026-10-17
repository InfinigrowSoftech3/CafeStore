export function PopularSkeleton() {
  return (
    <div className="flex gap-3.5 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 min-[390px]:-mx-5 min-[390px]:px-5 sm:mx-0 sm:px-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="w-[185px] min-w-[185px] min-[390px]:w-[200px] min-[390px]:min-w-[200px] sm:w-[215px] sm:min-w-[215px] shrink-0 rounded-[24px] bg-white p-2.5 min-[390px]:p-3 shadow-xs border border-[#0F3D2E]/8 animate-pulse flex flex-col justify-between"
        >
          <div>
            <div className="w-full h-[116px] min-[390px]:h-[126px] rounded-[18px] bg-[#0F3D2E]/8 mb-2.5" />
            <div className="h-4 bg-[#0F3D2E]/10 rounded-md w-3/4 mb-1.5" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#0F3D2E]/6 mt-2">
            <div className="h-5 bg-[#0F3D2E]/10 rounded-md w-14" />
            <div className="w-9 h-9 rounded-full bg-[#0F3D2E]/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-[24px] sm:rounded-[26px] p-2.5 min-[390px]:p-3 sm:p-3.5 flex items-center gap-2.5 min-[390px]:gap-3 sm:gap-4 shadow-xs border border-[#0F3D2E]/8 animate-pulse"
        >
          <div className="w-[84px] h-[84px] min-w-[84px] min-h-[84px] min-[390px]:w-[92px] min-[390px]:h-[92px] min-[390px]:min-w-[92px] min-[390px]:min-h-[92px] lg:w-[98px] lg:h-[98px] rounded-[18px] min-[390px]:rounded-[22px] bg-[#0F3D2E]/8 shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-3.5 h-3.5 rounded-[4px] bg-[#0F3D2E]/10 shrink-0" />
                <div className="h-4 bg-[#0F3D2E]/10 rounded-md w-1/2" />
              </div>
              <div className="h-3 bg-[#0F3D2E]/8 rounded-md w-3/4 mb-2" />
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#0F3D2E]/6">
              <div className="h-5 bg-[#0F3D2E]/10 rounded-md w-14" />
              <div className="h-8 bg-[#0F3D2E]/10 rounded-full w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
