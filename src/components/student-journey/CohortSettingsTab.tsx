import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calendar, Save, Trash2, AlertTriangle, Settings, Users, Bell, Lock } from "lucide-react";
import { useCohorts } from "@/hooks/useStudentJourney";
import { COHORT_STATUS_CONFIG, type CohortStatus, type SJCohort } from "@/types/studentJourney";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

interface CohortSettingsTabProps {
  cohort: SJCohort;
  enrollmentsCount: number;
}

export function CohortSettingsTab({ cohort, enrollmentsCount }: CohortSettingsTabProps) {
  const navigate = useNavigate();
  const { updateCohort, deleteCohort } = useCohorts();
  
  // Form state
  const [name, setName] = useState(cohort.name);
  const [status, setStatus] = useState<CohortStatus>(cohort.status);
  const [capacity, setCapacity] = useState(cohort.capacity?.toString() || "");
  const [startDate, setStartDate] = useState(cohort.start_date?.split("T")[0] || "");
  const [endDate, setEndDate] = useState(cohort.end_date?.split("T")[0] || "");
  
  // Settings from cohort.settings JSON
  const settings = (cohort.settings || {}) as Record<string, unknown>;
  const [allowLateEnrollment, setAllowLateEnrollment] = useState(settings.allow_late_enrollment as boolean ?? true);
  const [autoAcceptEnrollment, setAutoAcceptEnrollment] = useState(settings.auto_accept_enrollment as boolean ?? true);
  const [enableWaitingList, setEnableWaitingList] = useState(settings.enable_waiting_list as boolean ?? false);
  const [sendNotifications, setSendNotifications] = useState(settings.send_notifications as boolean ?? true);
  const [isPrivate, setIsPrivate] = useState(settings.is_private as boolean ?? false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const originalSettings = (cohort.settings || {}) as Record<string, unknown>;
    const changed = 
      name !== cohort.name ||
      status !== cohort.status ||
      capacity !== (cohort.capacity?.toString() || "") ||
      startDate !== (cohort.start_date?.split("T")[0] || "") ||
      endDate !== (cohort.end_date?.split("T")[0] || "") ||
      allowLateEnrollment !== (originalSettings.allow_late_enrollment ?? true) ||
      autoAcceptEnrollment !== (originalSettings.auto_accept_enrollment ?? true) ||
      enableWaitingList !== (originalSettings.enable_waiting_list ?? false) ||
      sendNotifications !== (originalSettings.send_notifications ?? true) ||
      isPrivate !== (originalSettings.is_private ?? false);
    
    setHasChanges(changed);
  }, [name, status, capacity, startDate, endDate, allowLateEnrollment, autoAcceptEnrollment, enableWaitingList, sendNotifications, isPrivate, cohort]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("O nome da turma é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      await updateCohort.mutateAsync({
        id: cohort.id,
        name: name.trim(),
        status,
        capacity: capacity ? parseInt(capacity) : null,
        start_date: startDate || null,
        end_date: endDate || null,
        settings: {
          allow_late_enrollment: allowLateEnrollment,
          auto_accept_enrollment: autoAcceptEnrollment,
          enable_waiting_list: enableWaitingList,
          send_notifications: sendNotifications,
          is_private: isPrivate,
        },
      });
      toast.success("Configurações guardadas com sucesso");
    } catch (error) {
      console.error("Error saving cohort settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCohort.mutateAsync(cohort.id);
      navigate("/dashboard/student-journey/cohorts");
    } catch (error) {
      console.error("Error deleting cohort:", error);
    }
  };

  const statusOptions: CohortStatus[] = ["planned", "open", "running", "finished"];

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Informações Básicas
          </CardTitle>
          <CardDescription>Dados principais da turma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Turma *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Turma Janeiro 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CohortStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => {
                    const config = COHORT_STATUS_CONFIG[s];
                    return (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <Badge className={cn(config.bgColor, config.color, "border-0 text-xs")}>
                            {config.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidade Máxima</Label>
              <Input
                id="capacity"
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Ilimitado"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrollment Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Inscrições
          </CardTitle>
          <CardDescription>Controle como os alunos se inscrevem na turma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Aceitar Inscrições Automaticamente</Label>
              <p className="text-sm text-muted-foreground">
                Novos alunos são automaticamente aceites na turma
              </p>
            </div>
            <Switch
              checked={autoAcceptEnrollment}
              onCheckedChange={setAutoAcceptEnrollment}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Permitir Inscrições Tardias</Label>
              <p className="text-sm text-muted-foreground">
                Permitir inscrições após a data de início
              </p>
            </div>
            <Switch
              checked={allowLateEnrollment}
              onCheckedChange={setAllowLateEnrollment}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Lista de Espera</Label>
              <p className="text-sm text-muted-foreground">
                Quando a capacidade for atingida, colocar novos alunos em lista de espera
              </p>
            </div>
            <Switch
              checked={enableWaitingList}
              onCheckedChange={setEnableWaitingList}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações e Privacidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enviar Notificações</Label>
              <p className="text-sm text-muted-foreground">
                Notificar alunos sobre atualizações da turma
              </p>
            </div>
            <Switch
              checked={sendNotifications}
              onCheckedChange={setSendNotifications}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>Turma Privada</Label>
                <Lock className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Apenas convites podem ser feitos, sem inscrições públicas
              </p>
            </div>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Eliminar Turma
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Eliminar Turma
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem a certeza que deseja eliminar a turma "{cohort.name}"?
                {enrollmentsCount > 0 && (
                  <span className="block mt-2 text-destructive font-medium">
                    Atenção: Esta turma tem {enrollmentsCount} aluno(s) inscrito(s).
                  </span>
                )}
                Esta ação não pode ser revertida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isSaving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "A guardar..." : "Guardar Alterações"}
        </Button>
      </div>
    </div>
  );
}
