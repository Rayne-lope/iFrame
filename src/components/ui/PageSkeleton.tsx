export default function PageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="page-block px-6 py-5 flex items-center gap-3">
        <div className="w-9 h-9 border-[3px] border-accent border-t-transparent rounded-full animate-spin" />
        <div>
          <p className="text-sm font-semibold text-foreground">Loading page</p>
          <p className="text-xs text-muted-foreground">Preparing cinematic view...</p>
        </div>
      </div>
    </div>
  )
}
