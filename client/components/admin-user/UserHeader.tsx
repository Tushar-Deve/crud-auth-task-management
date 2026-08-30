import { ChevronRight, Users2 } from "lucide-react";

export interface UserHeaderProps {
  title?: string;
  subtitle?: string;
  breadcrumbLabel?: string;
}

export default function UserHeader({
  title = "User Management",
  subtitle = "Manage all registered users from one place.",
  breadcrumbLabel = "Dashboard / User Management",
}: UserHeaderProps) {
  const breadcrumbItems = breadcrumbLabel.split(" / ");

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm shadow-zinc-200/60 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/70 dark:shadow-none">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
            <Users2 className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          </div>
        </div>

        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400"
        >
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;

            return (
              <div key={`${item}-${index}`} className="flex items-center gap-2">
                <span
                  className={
                    isLast
                      ? "font-medium text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-500 dark:text-zinc-400"
                  }
                >
                  {item}
                </span>
                {!isLast && (
                  <ChevronRight className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
