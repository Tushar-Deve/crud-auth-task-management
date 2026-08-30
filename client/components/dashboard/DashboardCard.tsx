import type { LucideIcon } from "lucide-react";

export interface DashboardCardProps {
  title: string;
  value: number | string;
  growthText: string;
  icon: LucideIcon;
  iconClassName?: string;
  iconWrapperClassName?: string;
}

export default function DashboardCard({
  title,
  value,
  growthText,
  icon: Icon,
  iconClassName = "text-indigo-600 dark:text-indigo-400",
  iconWrapperClassName = "bg-indigo-50 dark:bg-indigo-950/50",
}: DashboardCardProps) {
  return (
    <article className="group rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {value}
          </p>
          <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {growthText}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${iconWrapperClassName}`}
        >
          <Icon className={`h-6 w-6 ${iconClassName}`} aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}
