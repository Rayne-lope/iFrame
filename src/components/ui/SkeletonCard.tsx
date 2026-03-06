export default function SkeletonCard() {
  return (
    <div className="w-full">
      <div className="aspect-[2/3] w-full rounded-xl border border-border/80 bg-gradient-to-r from-muted/80 via-muted to-muted/80 animate-pulse" />
      <div className="mt-2 h-3.5 w-5/6 rounded bg-muted animate-pulse" />
      <div className="mt-1.5 h-3 w-2/5 rounded bg-muted/80 animate-pulse" />
    </div>
  )
}
