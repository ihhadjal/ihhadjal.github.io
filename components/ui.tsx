export function SectionLabel({ children, className = "mb-5" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`font-mono text-xs font-normal tracking-[.12em] text-hi uppercase ${className}`}>{children}</h2>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-amber/10 px-2.5 py-1 font-mono text-[11.5px] leading-normal text-amber">
      {children}
    </span>
  );
}

export function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((t) => (
        <Tag key={t}>{t}</Tag>
      ))}
    </div>
  );
}

export function Hi({ children }: { children: React.ReactNode }) {
  return <span className="text-hi">{children}</span>;
}
