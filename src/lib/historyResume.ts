import type { WatchedItem } from "@/store/historyStore";

type MediaTarget = {
  id: number;
  media_type?: "movie" | "tv";
};

function contentKey(item: {
  id: number;
  media_type: "movie" | "tv";
}): string {
  return `${item.media_type}:${item.id}`;
}

export function historyWatchUrl(item: WatchedItem): string {
  if (item.media_type === "tv") {
    return `/watch/tv/${item.id}/${item.season ?? 1}/${item.episode ?? 1}`;
  }
  return `/watch/movie/${item.id}`;
}

export function buildTVResumeMap(
  historyItems: WatchedItem[],
): Map<number, WatchedItem> {
  const map = new Map<number, WatchedItem>();
  historyItems.forEach((item) => {
    if (item.media_type === "tv" && !map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return map;
}

export function getTVResumeItem(
  historyItems: WatchedItem[],
  showId: number,
): WatchedItem | undefined {
  for (const item of historyItems) {
    if (item.media_type === "tv" && item.id === showId) {
      return item;
    }
  }
  return undefined;
}

export function getWatchUrlWithResume(
  item: MediaTarget,
  tvResumeMap: Map<number, WatchedItem>,
): string {
  if (item.media_type === "tv") {
    const resume = tvResumeMap.get(item.id);
    return `/watch/tv/${item.id}/${resume?.season ?? 1}/${resume?.episode ?? 1}`;
  }

  return `/watch/movie/${item.id}`;
}

export function getContinueWatchingItems(
  historyItems: WatchedItem[],
): WatchedItem[] {
  const deduped = new Map<string, WatchedItem>();

  historyItems.forEach((item) => {
    if ((item.position_seconds ?? 0) <= 0 || item.completed === true) return;

    const key = contentKey(item);
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  });

  return Array.from(deduped.values());
}
