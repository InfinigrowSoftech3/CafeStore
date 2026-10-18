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
      className={`rounded-none border border-slate-200 bg-white p-5 shadow-2xs transition-all hover:border-slate-300 ${
        onClick ? 'cursor-pointer hover:bg-slate-50/50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              {label}
            </span>
            {badge && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                {badge}
              </span>
            )}
          </div>

          <div className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {value}
          </div>

          {sublabel && (
            <div className="mt-1 text-xs text-slate-500 truncate font-medium">
              {sublabel}
            </div>
          )}
        </div>

        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            <Icon size={20} className="text-slate-800" />
          </div>
        )}
      </div>

      {typeof change === 'number' && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
            isPositive
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : isNegative
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-slate-50 text-slate-600 border border-slate-200'
          }`}>
            {isPositive && <TrendingUp size={13} />}
            {isNegative && <TrendingDown size={13} />}
            {isNeutral && <Minus size={13} />}
            <span>{isPositive ? '+' : ''}{change}%</span>
          </div>
          <span className="text-[11px] text-slate-400 font-semibold">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}
