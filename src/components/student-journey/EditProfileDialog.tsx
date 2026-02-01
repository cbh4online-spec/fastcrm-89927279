import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfiles } from "@/hooks/useStudentJourney";
import { DROPOUT_RISK_CONFIG, LifecycleStage, DropoutRisk, ActivationPotential, SJProfile } from "@/types/studentJourney";
import { Loader2 } from "lucide-react";

// Only stages allowed by the database constraint
const VALID_DB_LIFECYCLE_STAGES: { value: LifecycleStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "enrolled", label: "Inscrito" },
  { value: "active", label: "Ativo" },
  { value: "completed", label: "Concluído" },
  { value: "inactive", label: "Inativo" },
  { value: "churned", label: "Churned" },
];

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: SJProfile | null;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
}: EditProfileDialogProps) {
  const { updateProfile } = useProfiles();

  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage>("lead");
  const [dropoutRisk, setDropoutRisk] = useState<DropoutRisk>("low");
  const [activationPotential, setActivationPotential] = useState<ActivationPotential>("medium");
  const [primaryInterest, setPrimaryInterest] = useState("");
  const [primarySpecialty, setPrimarySpecialty] = useState("");

  // Load profile data when dialog opens
  useEffect(() => {
    if (profile) {
      setLifecycleStage(profile.lifecycle_stage);
      setDropoutRisk(profile.dropout_risk || "low");
      setActivationPotential(profile.activation_potential || "medium");
      setPrimaryInterest(profile.primary_interest || "");
      setPrimarySpecialty(profile.primary_specialty || "");
    }
  }, [profile]);

  const handleSubmit = async () => {
    if (!profile) return;

    await updateProfile.mutateAsync({
      id: profile.id,
      lifecycle_stage: lifecycleStage,
      dropout_risk: dropoutRisk,
      activation_potential: activationPotential,
      primary_interest: primaryInterest.trim() || null,
      primary_specialty: primarySpecialty.trim() || null,
    });

    onOpenChange(false);
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name (readonly) */}
          <div className="grid gap-2">
            <Label className="text-muted-foreground">Nome</Label>
            <p className="font-medium">{profile.full_name}</p>
          </div>

          {/* Lifecycle Stage */}
          <div className="grid gap-2">
            <Label>Estado do Ciclo de Vida</Label>
            <Select value={lifecycleStage} onValueChange={(v) => setLifecycleStage(v as LifecycleStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VALID_DB_LIFECYCLE_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Risk and Potential */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Risco de Abandono</Label>
              <Select value={dropoutRisk} onValueChange={(v) => setDropoutRisk(v as DropoutRisk)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DROPOUT_RISK_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Potencial Ativação</Label>
              <Select value={activationPotential} onValueChange={(v) => setActivationPotential(v as ActivationPotential)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="low">Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Interest and Specialty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Interesse Principal</Label>
              <Input
                value={primaryInterest}
                onChange={(e) => setPrimaryInterest(e.target.value)}
                placeholder="Ex: Marketing Digital"
              />
            </div>
            <div className="grid gap-2">
              <Label>Especialidade</Label>
              <Input
                value={primarySpecialty}
                onChange={(e) => setPrimarySpecialty(e.target.value)}
                placeholder="Ex: Estética"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={updateProfile.isPending}>
            {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
