import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: "green" | "blue" | "orange" | "purple";
}

export default function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  color = "green",
}: KPICardProps) {
  const colorClasses = {
    green: {
      icon: "bg-emerald-500",
      iconRing: "ring-emerald-100",
    },
    blue: {
      icon: "bg-sky-500",
      iconRing: "ring-sky-100",
    },
    orange: {
      icon: "bg-amber-500",
      iconRing: "ring-amber-100",
    },
    purple: {
      icon: "bg-purple-500",
      iconRing: "ring-purple-100",
    },
  };

  const isPositive = trend && trend > 0;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight tabular-nums">
            {value}
          </h3>
        </div>
        <div
          className={`w-12 h-12 rounded-2xl ${colorClasses[color].icon} flex items-center justify-center ring-4 ${colorClasses[color].iconRing} transition-transform group-hover:scale-110`}
        >
          <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold ${
              isPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" strokeWidth={3} />
            ) : (
              <TrendingDown className="w-4 h-4" strokeWidth={3} />
            )}
            <span className="tabular-nums">{Math.abs(trend)}%</span>
          </div>
          {trendLabel && <span className="text-sm text-slate-500 font-semibold">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
