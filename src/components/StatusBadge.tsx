import { t } from "@/lib/strings";
import type { CardStatus } from "@/lib/types";

const STYLES: Record<CardStatus, string> = {
  named:
    "bg-emerald-100 text-emerald-900 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-400/20",
  pending:
    "bg-amber-100 text-amber-900 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-400/20",
  unnamed:
    "bg-neutral-200 text-neutral-700 ring-neutral-500/20 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-400/20",
};

const LABELS: Record<CardStatus, string> = {
  named: t.status.named,
  pending: t.status.pending,
  unnamed: t.status.unnamed,
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: CardStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status]} ${className}`}
    >
      {LABELS[status]}
    </span>
  );
}

/** A bare dot for dense contexts where the full badge would crowd the card. */
export function StatusDot({ status }: { status: CardStatus }) {
  const colour =
    status === "named"
      ? "bg-emerald-500"
      : status === "pending"
        ? "bg-amber-500"
        : "bg-neutral-400";
  return (
    <span
      aria-label={LABELS[status]}
      title={LABELS[status]}
      className={`inline-block size-2.5 shrink-0 rounded-full ${colour}`}
    />
  );
}
