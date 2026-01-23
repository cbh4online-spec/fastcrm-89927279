import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSJCrmIntegration } from "@/hooks/useSJCrmIntegration";
import { SJEnrollment } from "@/types/studentJourney";
import { Loader2, TrendingUp } from "lucide-react";

interface CreateOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: SJEnrollment;
  contactId?: string;
  companyId?: string;
}

const BILLING_TYPES = [
  { value: "one_time", label: "Pagamento Único" },
  { value: "subscription", label: "Subscrição" },
  { value: "installments", label: "Prestações" },
];

export function CreateOpportunityDialog({
  open,
  onOpenChange,
  enrollment,
  contactId,
  companyId,
}: CreateOpportunityDialogProps) {
  const { createOpportunityFromEnrollment } = useSJCrmIntegration();

  const [value, setValue] = useState("");
  const [billingType, setBillingType] = useState("one_time");

  const handleSubmit = async () => {
    await createOpportunityFromEnrollment.mutateAsync({
      enrollmentId: enrollment.id,
      courseId: enrollment.course_id,
      courseName: enrollment.course?.name || "Curso",
      contactId,
      companyId,
      value: value ? parseFloat(value) : undefined,
      billingType,
    });
    setValue("");
    setBillingType("one_time");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Criar Oportunidade
          </DialogTitle>
          <DialogDescription>
            Crie uma oportunidade no CRM a partir desta inscrição.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <p className="text-sm font-medium">Inscrição</p>
            <p className="text-sm text-muted-foreground">
              Curso: <span className="text-foreground">{enrollment.course?.name || "N/A"}</span>
            </p>
            {enrollment.cohort && (
              <p className="text-sm text-muted-foreground">
                Turma: <span className="text-foreground">{enrollment.cohort.name}</span>
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Valor (€)</Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ex: 500"
              min={0}
            />
          </div>

          <div className="grid gap-2">
            <Label>Tipo de Faturação</Label>
            <Select value={billingType} onValueChange={setBillingType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILLING_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createOpportunityFromEnrollment.isPending}
          >
            {createOpportunityFromEnrollment.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Criar Oportunidade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
