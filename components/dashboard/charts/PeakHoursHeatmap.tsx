"use client";

interface HeatmapCell {
  day: number;
  hour: number;
  count: number;
}

interface Props { data: HeatmapCell[] }

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12;
  return `${h}${i < 12 ? "a" : "p"}`;
});

export function PeakHoursHeatmap({ data }: Props) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getCount = (day: number, hour: number) =>
    data.find((d) => d.day === day && d.hour === hour)?.count ?? 0;

  const getColor = (count: number) => {
    if (count === 0) return "bg-secondary";
    const intensity = count / maxCount;
    if (intensity < 0.25) return "bg-brand-green/20";
    if (intensity < 0.5) return "bg-brand-green/40";
    if (intensity < 0.75) return "bg-brand-green/70";
    return "bg-brand-green";
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Peak Hours</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex gap-1 mb-1 pl-10">
            {HOURS.map((h, i) => (
              <div key={i} className="w-5 text-center text-[9px] text-muted-foreground shrink-0">
                {i % 3 === 0 ? h : ""}
              </div>
            ))}
          </div>
          {DAYS.map((day, dayIdx) => (
            <div key={day} className="flex items-center gap-1 mb-1">
              <div className="w-9 text-right text-xs text-muted-foreground pr-1">{day}</div>
              {HOURS.map((_, hourIdx) => {
                const count = getCount(dayIdx, hourIdx);
                return (
                  <div
                    key={hourIdx}
                    title={`${day} ${HOURS[hourIdx]}: ${count} orders`}
                    className={`w-5 h-5 rounded-sm shrink-0 transition-colors ${getColor(count)}`}
                  />
                );
              })}
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2 pl-10">
            <span className="text-xs text-muted-foreground">Less</span>
            {["bg-secondary", "bg-brand-green/20", "bg-brand-green/40", "bg-brand-green/70", "bg-brand-green"].map((c, i) => (
              <div key={i} className={`w-4 h-4 rounded-sm ${c}`} />
            ))}
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
