import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { RHFormField, RHSelectField, RHTextareaField, RHFormActions } from "@/components/hr/form";
import { jobOpeningSchema, type JobOpeningFormValues } from "@/schemas/hr/jobOpeningSchema";
import { useUpdateJobPosting, type JobPosting } from "@/hooks/hr/useJobPostings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface JobEditDrawerProps {
  job: JobPosting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Tempo inteiro" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Prestador" },
  { value: "intern", label: "Estágio" },
];

const REMOTE_OPTIONS = [
  { value: "office", label: "Presencial" },
  { value: "remote", label: "Remoto" },
  { value: "hybrid", label: "Híbrido" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "active", label: "Activa" },
  { value: "closed", label: "Fechada" },
  { value: "cancelled", label: "Cancelada" },
];

export function JobEditDrawer({ job, open, onOpenChange }: JobEditDrawerProps) {
  const updateJob = useUpdateJobPosting();

  const form = useForm<JobOpeningFormValues>({
    resolver: zodResolver(jobOpeningSchema),
    defaultValues: {
      title: "", description: "", employment_type: "full_time", remote_option: "office",
      location: "", currency: "EUR", salary_min: null, salary_max: null,
      requirements_text: "", nice_to_have_text: "",
    },
  });

  useEffect(() => {
    if (job && open) {
      form.reset({
        title: job.title,
        description: job.description || "",
        employment_type: (job.employment_type as any) || "full_time",
        remote_option: (job.remote_option as any) || "office",
        location: job.location || "",
        currency: job.currency || "EUR",
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        requirements_text: (job.requirements || []).join("\n"),
        nice_to_have_text: (job.nice_to_have || []).join("\n"),
      });
    }
  }, [job, open]);

  const onSubmit = async (values: JobOpeningFormValues) => {
    if (!job) return;
    await updateJob.mutateAsync({
      id: job.id,
      title: values.title,
      description: values.description,
      employment_type: values.employment_type,
      remote_option: values.remote_option,
      location: values.location,
      currency: values.currency,
      salary_min: values.salary_min,
      salary_max: values.salary_max,
      requirements: values.requirements_text.split("\n").map(s => s.trim()).filter(Boolean),
      nice_to_have: values.nice_to_have_text.split("\n").map(s => s.trim()).filter(Boolean),
    });
    onOpenChange(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    const update: any = { id: job.id, status: newStatus };
    if (newStatus === "active" && !job.published_at) {
      update.published_at = new Date().toISOString();
    }
    await updateJob.mutateAsync(update);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Vaga</SheetTitle>
        </SheetHeader>
        {job && (
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={job.status} onValueChange={handleStatusChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <RHFormField name="title" label="Título" required />
                <RHFormField name="location" label="Localização" />
                <div className="grid grid-cols-2 gap-4">
                  <RHSelectField name="employment_type" label="Tipo" options={EMPLOYMENT_TYPES} />
                  <RHSelectField name="remote_option" label="Modalidade" options={REMOTE_OPTIONS} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <RHFormField name="currency" label="Moeda" />
                  <RHFormField name="salary_min" label="Sal. Mín." type="number" />
                  <RHFormField name="salary_max" label="Sal. Máx." type="number" />
                </div>
                <RHTextareaField name="description" label="Descrição" rows={4} />
                <RHTextareaField name="requirements_text" label="Requisitos (um por linha)" rows={3} />
                <RHTextareaField name="nice_to_have_text" label="Nice to have (um por linha)" rows={3} />
                <RHFormActions onCancel={() => onOpenChange(false)} isSubmitting={updateJob.isPending} submitLabel="Guardar" />
              </form>
            </Form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
