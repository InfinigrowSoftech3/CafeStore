import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KpiCard({
  icon: Icon,
  label,
  value,
  sublabel,
  change,
  changeLabel = 'vs yesterday',
  accentColor = 'brand',
  onClick,
  badge,
}) {
  const isPositive = typeof change === 'number' && change > 0;
  const isNegative = typeof change === 'number' && change < 0;
  const isNeutral = typeof change === 'number' && change === 0;

  return (
    <div
      onClick={onClick}
      className={`rounded-none border border-slate-200 bg-white p-3.5 sm:p-5 shadow-2xs transition-all hover:border-slate-300 ${
        onClick ? 'cursor-pointer hover:bg-slate-50/50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              {label}
            </span>
            {badge && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-800 border border-emerald-200 shrink-0">
                {badge}
              </span>
            )}
          </div>

          <div className="mt-1.5 sm:mt-2 text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums truncate">
            {value}
          </div>

          {sublabel && (
            <div className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-slate-500 truncate font-medium">
              {sublabel}
            </div>
          )}
        </div>

        {Icon && (
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <Icon size={18} className="text-slate-800 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>

      {typeof change === 'number' && (
        <div className="mt-2.5 sm:mt-3 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-1">
          <div className={`inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold shrink-0 ${
            isPositive
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : isNegative
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-slate-50 text-slate-600 border border-slate-200'
          }`}>
            {isPositive && <TrendingUp size={12} />}
            {isNegative && <TrendingDown size={12} />}
            {isNeutral && <Minus size={12} />}
            <span>{isPositive ? '+' : ''}{change}%</span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold truncate text-right">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
