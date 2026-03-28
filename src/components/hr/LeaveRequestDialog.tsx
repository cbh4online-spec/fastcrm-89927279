import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useLeaveRequests } from "@/hooks/useLeaveRequests";
import { differenceInBusinessDays } from "date-fns";

const LEAVE_TYPES = [
  { value: "vacation", label: "Férias" },
  { value: "sick", label: "Doença" },
  { value: "personal", label: "Pessoal" },
  { value: "remote", label: "Remoto" },
  { value: "other", label: "Outro" },
];

export function LeaveRequestDialog() {
  const [open, setOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const { createRequest } = useLeaveRequests();

  const daysCount = startDate && endDate
    ? Math.max(differenceInBusinessDays(new Date(endDate), new Date(startDate)) + 1, 0)
    : 0;

  const handleSubmit = () => {
    if (!startDate || !endDate) return;
    createRequest.mutate(
      { leave_type: leaveType, start_date: startDate, end_date: endDate, days_count: daysCount, reason: reason || undefined },
      { onSuccess: () => { setOpen(false); setStartDate(""); setEndDate(""); setReason(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Pedido</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Pedido de Ausência</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Data Início</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div><Label>Data Fim</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          {daysCount > 0 && <p className="text-sm text-muted-foreground">{daysCount} dias úteis</p>}
          <div><Label>Motivo (opcional)</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          <Button onClick={handleSubmit} disabled={!startDate || !endDate || createRequest.isPending} className="w-full">
            Submeter Pedido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
