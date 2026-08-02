import { fmt, percent, t } from "@/lib/strings";

export function ProgressBar({
  total,
  needs,
  showCaption = true,
  size = "md",
}: {
  total: number;
  needs: number;
  showCaption?: boolean;
  size?: "sm" | "md";
}) {
  const named = total - needs;
  const pct = total === 0 ? 0 : (named / total) * 100;

  return (
    <div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={named}
        aria-valuetext={t.progress.ofTotal(named, total)}
        className={`w-full overflow-hidden rounded-full bg-line ${
          size === "sm" ? "h-1.5" : "h-2"
        }`}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showCaption && (
        <p className="mt-1.5 text-xs text-muted tabular-nums">
          {percent(named, total)}% · {fmt(named)} {t.progress.named} ·{" "}
          {fmt(needs)} {t.progress.needs}
        </p>
      )}
    </div>
  );
}
