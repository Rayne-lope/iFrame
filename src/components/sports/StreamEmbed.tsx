import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MonitorPlay, X } from "lucide-react";
import { streamed } from "@/api/streamed";
import type { StreamSource, StreamedMatch } from "@/types/sports";

interface StreamEmbedProps {
  match: StreamedMatch;
  onClose: () => void;
}

function sourceLabel(source: StreamSource, index: number): string {
  return source.label || `Source ${index + 1}`;
}

export default function StreamEmbed({ match, onClose }: StreamEmbedProps) {
  const [activeSourceId, setActiveSourceId] = useState<string | null>(
    match.sources?.[0]?.id ?? null,
  );
  const [activeStreamNo, setActiveStreamNo] = useState<number>(
    match.sources?.[0]?.streamNo ?? 1,
  );

  const sourcesQuery = useQuery({
    queryKey: ["sports", "stream-sources", match.id],
    queryFn: () => streamed.getStreamSources(match.id),
    enabled: Boolean(match.id),
    retry: false,
    staleTime: 30 * 1000,
  });

  const sources = useMemo(
    () =>
      sourcesQuery.data && sourcesQuery.data.length > 0
        ? sourcesQuery.data
        : match.sources ?? [],
    [match.sources, sourcesQuery.data],
  );

  useEffect(() => {
    if (sources.length === 0) return;
    setActiveSourceId((current) => current ?? sources[0].id);
    setActiveStreamNo((current) => current || sources[0].streamNo || 1);
  }, [sources]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const iframeUrl = streamed.getEmbedUrl(
    match.id,
    activeSourceId ?? undefined,
    activeStreamNo,
  );

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md">
      <div className="flex h-full flex-col px-3 py-3 sm:px-5 sm:py-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Stream Embed
            </div>
            <h2 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
              {match.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={iframeUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              <ExternalLink className="h-4 w-4" />
              Open Direct
            </a>
            <button type="button" onClick={onClose} className="btn-secondary">
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {sources.length > 0 ? (
            sources.map((source, index) => {
              const active = source.id === activeSourceId;
              return (
                <button
                  key={`${source.id}-${source.streamNo}`}
                  type="button"
                  onClick={() => {
                    setActiveSourceId(source.id);
                    setActiveStreamNo(source.streamNo);
                  }}
                  className={
                    active
                      ? "btn-primary !px-4"
                      : "btn-secondary !px-4"
                  }
                >
                  {sourceLabel(source, index)}
                </button>
              );
            })
          ) : (
            <span className="muted-chip">
              <MonitorPlay className="h-3.5 w-3.5" />
              Using direct embed fallback
            </span>
          )}

          {sourcesQuery.isError && (
            <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200">
              Source list unavailable. Falling back to direct embed.
            </span>
          )}
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-black">
          <iframe
            src={iframeUrl}
            title={match.title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}
