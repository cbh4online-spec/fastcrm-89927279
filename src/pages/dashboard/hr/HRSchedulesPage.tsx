import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { useHRSchedules, useHRShifts, useCreateHRShift, useDeleteHRShift, useUpsertSchedule, type HRShift } from "@/hooks/hr/useHRSchedules";
import { useHREmployees } from "@/hooks/hr/useHREmployees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import { pt } from "date-fns/locale";

export default function HRSchedulesPage() {
  const [weekDate, setWeekDate] = useState(new Date());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [newShift, setNewShift] = useState({ name: "", start_time: "09:00", end_time: "18:00", color: "#6366f1" });
  const [scheduleForm, setScheduleForm] = useState({ employee_id: "", shift_id: "", schedule_date: "" });

  const { data: employees = [] } = useHREmployees("active");
  const { data: shifts = [] } = useHRShifts();
  const { data: schedules = [] } = useHRSchedules(weekDate);
  const createShift = useCreateHRShift();
  const deleteShift = useDeleteHRShift();
  const upsertSchedule = useUpsertSchedule();

  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleAddSchedule = () => {
    if (!scheduleForm.employee_id || !scheduleForm.shift_id || !scheduleForm.schedule_date) return;
    upsertSchedule.mutate(scheduleForm, {
      onSuccess: () => { setAddDialogOpen(false); setScheduleForm({ employee_id: "", shift_id: "", schedule_date: "" }); }
    });
  };

  const handleAddShift = () => {
    if (!newShift.name) return;
    createShift.mutate(newShift as any, {
      onSuccess: () => { setShiftDialogOpen(false); setNewShift({ name: "", start_time: "09:00", end_time: "18:00", color: "#6366f1" }); }
    });
  };

  return (
    <ModuleGuard moduleSlug="hr-management" moduleName="Recursos Humanos">
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Gestão de Turnos</h1>
              <p className="text-muted-foreground">Calendário semanal de turnos</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" /> Tipo de Turno</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Novo Tipo de Turno</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Nome</Label><Input value={newShift.name} onChange={e => setNewShift(s => ({ ...s, name: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Início</Label><Input type="time" value={newShift.start_time} onChange={e => setNewShift(s => ({ ...s, start_time: e.target.value }))} /></div>
                      <div><Label>Fim</Label><Input type="time" value={newShift.end_time} onChange={e => setNewShift(s => ({ ...s, end_time: e.target.value }))} /></div>
                    </div>
                    <div><Label>Cor</Label><Input type="color" value={newShift.color} onChange={e => setNewShift(s => ({ ...s, color: e.target.value }))} className="h-10 w-20" /></div>
                    <Button onClick={handleAddShift} disabled={createShift.isPending} className="w-full">Criar Turno</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" /> Atribuir Turno</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Atribuir Turno</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Funcionário</Label>
                      <Select value={scheduleForm.employee_id} onValueChange={v => setScheduleForm(f => ({ ...f, employee_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Turno</Label>
                      <Select value={scheduleForm.shift_id} onValueChange={v => setScheduleForm(f => ({ ...f, shift_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>{shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Data</Label><Input type="date" value={scheduleForm.schedule_date} onChange={e => setScheduleForm(f => ({ ...f, schedule_date: e.target.value }))} /></div>
                    <Button onClick={handleAddSchedule} disabled={upsertSchedule.isPending} className="w-full">Atribuir</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setWeekDate(d => subWeeks(d, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-medium">
              {format(weekStart, "d MMM", { locale: pt })} — {format(addDays(weekStart, 6), "d MMM yyyy", { locale: pt })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setWeekDate(d => addWeeks(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => setWeekDate(new Date())}>Hoje</Button>
          </div>

          {/* Week grid */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-8 gap-1 text-sm">
                <div className="font-medium p-2">Funcionário</div>
                {weekDays.map(d => (
                  <div key={d.toISOString()} className="font-medium p-2 text-center">
                    {format(d, "EEE dd", { locale: pt })}
                  </div>
                ))}
                {employees.map(emp => (
                  <>
                    <div key={emp.id} className="p-2 border-t flex items-center gap-2">
                      <span className="truncate text-xs">{emp.full_name}</span>
                    </div>
                    {weekDays.map(d => {
                      const dateStr = format(d, "yyyy-MM-dd");
                      const sched = schedules.find(s => s.employee_id === emp.id && s.schedule_date === dateStr);
                      return (
                        <div key={`${emp.id}-${dateStr}`} className="p-1 border-t min-h-[40px] flex items-center justify-center">
                          {sched?.hr_shifts ? (
                            <Badge
                              style={{ backgroundColor: sched.hr_shifts.color }}
                              className="text-white text-[10px] whitespace-nowrap"
                            >
                              {sched.hr_shifts.name}
                            </Badge>
                          ) : null}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shift types */}
          {shifts.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Tipos de Turno</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {shifts.map(s => (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg border">
                      <div className="h-4 w-4 rounded" style={{ backgroundColor: s.color }} />
                      <span className="text-sm font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.start_time}–{s.end_time}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteShift.mutate(s.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ModuleGuard>
  );
}
