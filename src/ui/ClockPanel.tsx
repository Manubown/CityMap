import { useGameStore } from "./store";

export function ClockPanel() {
  const hour = useGameStore((s) => s.timeHour);
  const minute = useGameStore((s) => s.timeMinute);
  const day = useGameStore((s) => s.dayNum);
  const month = useGameStore((s) => s.monthNum);
  const dayOfMonth = useGameStore((s) => s.dayOfMonth);
  const night = useGameStore((s) => s.isNight);
  const seasonName = useGameStore((s) => s.seasonName);
  const seasonEmoji = useGameStore((s) => s.seasonEmoji);

  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");

  return (
    <div className="clock panel">
      <span className="clock-icon">{night ? "🌙" : "☀️"}</span>
      <span className="clock-time">
        {hh}:{mm}
      </span>
      <span className="clock-date">
        Month {month} · Day {dayOfMonth}
        <small> (#{day})</small>
      </span>
      <span className="clock-season">
        {seasonEmoji} {seasonName}
      </span>
    </div>
  );
}
