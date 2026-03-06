import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ControlCenterCardProps {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export default function ControlCenterCard({
  title,
  subtitle,
  badge,
  children,
  className,
  bodyClassName,
}: ControlCenterCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="section-title-mini !text-xl">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {badge}
      </div>

      <div className={cn("min-h-0", bodyClassName)}>{children}</div>
    </div>
  );
}
