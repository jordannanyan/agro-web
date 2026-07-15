import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface AlertCardProps {
  type: "critical" | "warning" | "info";
  message: string;
  time?: string;
}

export default function AlertCard({ type, message, time }: AlertCardProps) {
  const configs = {
    critical: {
      icon: AlertCircle,
      bg: "bg-red-50",
      border: "border-red-200",
      icon: "text-red-600",
      text: "text-red-900",
      dot: "bg-red-500",
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconColor: "text-amber-600",
      text: "text-amber-900",
      dot: "bg-amber-500",
    },
    info: {
      icon: Info,
      bg: "bg-sky-50",
      border: "border-sky-200",
      iconColor: "text-sky-600",
      text: "text-sky-900",
      dot: "bg-sky-500",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} ${config.border} border rounded-2xl p-5 flex items-start gap-4 hover:shadow-lg hover:shadow-slate-200/40 transition-all`}
    >
      <div className="relative mt-0.5">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0`} strokeWidth={2.5} />
        <span className={`absolute -top-1 -right-1 w-2 h-2 ${config.dot} rounded-full ring-2 ring-white shadow-sm`}></span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${config.text} font-semibold leading-relaxed`}>{message}</p>
        {time && <p className="text-xs text-slate-600 mt-2 font-mono font-medium">{time}</p>}
      </div>
    </div>
  );
}
