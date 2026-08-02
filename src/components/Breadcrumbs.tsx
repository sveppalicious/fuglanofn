import Link from "next/link";

export type Crumb = { label: string; href?: string; italic?: boolean };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Brauðmylsna" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>›</span>}
            {item.href ? (
              <Link
                href={item.href}
                className={`hover:text-accent hover:underline ${item.italic ? "italic" : ""}`}
              >
                {item.label}
              </Link>
            ) : (
              <span className={item.italic ? "italic" : ""}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
