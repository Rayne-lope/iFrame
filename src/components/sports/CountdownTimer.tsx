import { useEffect, useState } from "react";
import { normalizeUnixMs } from "@/lib/sports";

interface CountdownTimerProps {
  targetDate: string | number;
}

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isLive: boolean;
};

function getCountdownParts(targetDate: string | number): CountdownParts {
  const target =
    typeof targetDate === "string"
      ? Date.parse(targetDate)
      : normalizeUnixMs(targetDate);
  const remaining = Math.max(0, target - Date.now());

  if (remaining <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isLive: true,
    };
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  return {
    days,
    hours,
    minutes,
    seconds,
    isLive: false,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [parts, setParts] = useState<CountdownParts>(() =>
    getCountdownParts(targetDate),
  );

  useEffect(() => {
    setParts(getCountdownParts(targetDate));

    const timer = window.setInterval(() => {
      setParts(getCountdownParts(targetDate));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [targetDate]);

  if (parts.isLive) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-200">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
        RACE LIVE
      </div>
    );
  }

  const items = [
    { label: "Hari", value: pad(parts.days) },
    { label: "Jam", value: pad(parts.hours) },
    { label: "Menit", value: pad(parts.minutes) },
    { label: "Detik", value: pad(parts.seconds) },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/10 bg-black/30 px-2 py-3 text-center backdrop-blur-xl"
        >
          <div className="text-lg font-bold text-foreground sm:text-2xl [font-family:var(--font-mono)]">
            {item.value}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
