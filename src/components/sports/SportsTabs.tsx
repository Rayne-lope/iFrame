import { Flag, Flame, LayoutGrid, Shield, Trophy } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { sportHref } from "@/lib/sports";
import type { SportSlug, SportTab } from "@/types/sports";

const tabs: SportTab[] = [
  { key: "all", label: "All", icon: LayoutGrid },
  { key: "f1", label: "F1", icon: Flag },
  { key: "football", label: "Football", icon: Shield },
  { key: "nba", label: "NBA", icon: Trophy },
  { key: "ufc", label: "UFC", icon: Flame },
];

interface SportsTabsProps {
  activeSport: SportSlug;
  liveCounts?: Partial<Record<SportSlug, number>>;
}

export default function SportsTabs({
  activeSport,
  liveCounts,
}: SportsTabsProps) {
  return (
    <div className="overflow-x-auto scrollbar-hidden">
      <div className="inline-flex min-w-full gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSport === tab.key;
          const liveCount = liveCounts?.[tab.key];

          return (
            <NavLink
              key={tab.key}
              to={sportHref(tab.key)}
              className={cn(
                "inline-flex min-w-fit items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300",
                isActive
                  ? "bg-accent text-black shadow-[0_0_24px_rgba(243,188,22,0.28)]"
                  : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {typeof liveCount === "number" && liveCount > 0 && (
                <span
                  className={cn(
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    isActive
                      ? "bg-black/15 text-black"
                      : "bg-red-500/20 text-red-200",
                  )}
                >
                  {liveCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
