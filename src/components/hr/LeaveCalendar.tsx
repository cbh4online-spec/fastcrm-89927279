import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isWithinInterval } from "date-fns";
import { pt } from "date-fns/locale";

const TYPE_COLORS: Record<string, string> = {
  vacation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  sick: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  personal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  remote: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const TYPE_LABELS: Record<string, string> = {
  vacation: "Férias",
  sick: "Doença",
  personal: "Pessoal",
  remote: "Remoto",
  other: "Outro",
};

export function LeaveCalendar() {
  const { requests } = useLeaveRequests();
  const approved = requests.filter((r) => r.status === "approved");

  // Build current month days
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const matchingLeaves = approved.filter((r) =>
      isWithinInterval(date, { start: parseISO(r.start_date), end: parseISO(r.end_date) })
    );
    return { date, day: i + 1, leaves: matchingLeaves };
  });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">
        {format(now, "MMMM yyyy", { locale: pt })}
      </h3>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="text-center font-medium text-muted-foreground p-1">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(({ day, leaves }) => (
          <div
            key={day}
            className={`p-1 text-center rounded-md min-h-[40px] ${
              leaves.length > 0 ? "bg-accent" : ""
            }`}
          >
            <span className="text-xs">{day}</span>
            {leaves.map((l, i) => (
              <Badge key={i} variant="secondary" className={`text-[10px] mt-0.5 block ${TYPE_COLORS[l.leave_type] || ""}`}>
                {TYPE_LABELS[l.leave_type]?.[0] || "?"}
              </Badge>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <Badge key={k} variant="outline" className={TYPE_COLORS[k]}>{v}</Badge>
        ))}
      </div>
    </div>
  );
}
