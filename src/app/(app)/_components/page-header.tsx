export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8">
      <div className="text-[11px] font-medium uppercase tracking-[1.5px] text-accent mb-2">
        {eyebrow}
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="text-text-muted mt-3 max-w-3xl leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

export function SectionDivider({
  title,
  sub,
}: {
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline justify-between pb-3 mb-5 border-b border-border">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {sub && (
        <div className="text-xs uppercase tracking-wider text-text-muted">
          {sub}
        </div>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-4">
      <div className="text-[11px] uppercase tracking-wider text-text-dim mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {sublabel && (
        <div className="text-xs text-text-dim mt-1">{sublabel}</div>
      )}
    </div>
  );
}
