import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileAccordionSectionProps {
  title: string;
  description?: string;
  defaultOpenMobile?: boolean;
  children: ReactNode;
}

export default function MobileAccordionSection({
  title,
  description,
  defaultOpenMobile = false,
  children,
}: MobileAccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpenMobile);

  return (
    <section className="mobile-accordion-section">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mobile-accordion-trigger md:hidden"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <div className="hidden items-end justify-between gap-3 md:flex">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      <div className={cn("mt-0 md:mt-3", open ? "block" : "hidden", "md:block")}>
        {children}
      </div>
    </section>
  );
}
