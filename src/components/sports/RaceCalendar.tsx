import RaceItem from "./RaceItem";
import type { F1CalendarEntry } from "@/types/sports";

interface RaceCalendarProps {
  calendar: F1CalendarEntry[];
}

export default function RaceCalendar({ calendar }: RaceCalendarProps) {
  return (
    <div className="space-y-2.5">
      {calendar.map((entry) => (
        <RaceItem key={entry.meeting.meeting_key} entry={entry} />
      ))}
    </div>
  );
}
