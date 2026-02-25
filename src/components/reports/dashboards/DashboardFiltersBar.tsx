import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DashboardFiltersBarProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}

export function DashboardFiltersBar({ dateFrom, dateTo, onDateFromChange, onDateToChange }: DashboardFiltersBarProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">De</Label>
        <Input type="date" value={dateFrom} onChange={e => onDateFromChange(e.target.value)} className="w-[150px] h-8 text-xs" />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">Até</Label>
        <Input type="date" value={dateTo} onChange={e => onDateToChange(e.target.value)} className="w-[150px] h-8 text-xs" />
      </div>
    </div>
  );
}
