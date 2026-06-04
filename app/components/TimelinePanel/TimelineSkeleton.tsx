export function TimelineSkeleton() {
  return (
    <div className="space-y-3 pl-5" aria-hidden>
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex animate-pulse gap-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="size-12 shrink-0 rounded-lg bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 w-2/3 rounded bg-muted" />
            <div className="h-2.5 w-1/2 rounded bg-muted" />
            <div className="h-2.5 w-full rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}
