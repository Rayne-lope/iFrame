import { cn } from '@/lib/utils'

interface Source {
  label: string
  url: string
  unstable?: boolean
}

interface SourceSelectorProps {
  sources: Source[]
  active: string
  onChange: (url: string) => void
}

export default function SourceSelector({ sources, active, onChange }: SourceSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-muted-foreground text-sm font-medium">Source:</span>
      {sources.map((source) => (
        <button
          key={source.url}
          onClick={() => onChange(source.url)}
          title={source.unstable ? 'This source recently failed and may be unstable' : source.label}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
            source.url === active
              ? 'bg-accent text-black border-accent shadow-[0_0_18px_rgba(243,188,22,0.28)]'
              : source.unstable
                ? 'bg-surface/85 text-amber-300 border-amber-500/40 hover:border-amber-400'
                : 'bg-surface/80 text-muted-foreground border-border hover:border-accent/45 hover:text-foreground',
          )}
        >
          {source.label}
          {source.unstable && <span className="text-[10px] leading-none">unstable</span>}
        </button>
      ))}
    </div>
  )
}
