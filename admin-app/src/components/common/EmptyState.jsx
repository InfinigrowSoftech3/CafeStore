export default function EmptyState({
  icon: Icon,
  title = 'No items found',
  description = 'There are no records to display here yet.',
  action,
  actionLabel,
  onAction,
  secondaryAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-none border-2 border-dashed border-slate-200 bg-white py-14 px-6 text-center shadow-2xs">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#0F3D2E] border border-emerald-100 shadow-2xs">
          <Icon size={26} strokeWidth={1.8} />
        </div>
      )}
      <h3 className="font-display text-lg font-bold text-slate-900">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
        {description}
      </p>
      {(action || (actionLabel && onAction)) && (
        <div className="mt-5 flex items-center gap-3">
          {action ? (
            action
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-2 rounded-md bg-[#0F3D2E] text-white hover:bg-[#165a44] px-4 py-2 text-xs font-bold shadow-2xs transition"
            >
              {actionLabel}
            </button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
