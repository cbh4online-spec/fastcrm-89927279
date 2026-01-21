import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCreditProposal } from "../hooks/useCreditProposals";
import { CREDIT_TYPE_LABELS, CreditType } from "../types";
import { Loader2, Home, User, Building2, Car } from "lucide-react";

const formSchema = z.object({
  entity_type: z.enum(["contact", "company"]),
  entity_name: z.string().min(2, "Nome é obrigatório"),
  entity_id: z.string().optional(),
  credit_type: z.enum(["habitacao", "pessoal", "empresarial", "automovel"]),
  purpose: z.string().min(3, "Finalidade é obrigatória"),
  amount_requested: z.number().min(1000, "Montante mínimo: 1.000€"),
  term_months: z.number().min(6, "Prazo mínimo: 6 meses").max(480, "Prazo máximo: 40 anos"),
  property_value: z.number().optional(),
  property_location: z.string().optional(),
  vehicle_brand: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_year: z.number().optional(),
  vehicle_value: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateProposalDialogProps {
  children: React.ReactNode;
}

export function CreateProposalDialog({ children }: CreateProposalDialogProps) {
  const [open, setOpen] = useState(false);
  const createProposal = useCreateCreditProposal();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entity_type: "contact",
      credit_type: "habitacao",
      term_months: 360,
      amount_requested: 0,
      purpose: "",
      entity_name: "",
    },
  });

  const creditType = form.watch("credit_type");

  const onSubmit = async (data: FormData) => {
    await createProposal.mutateAsync({
      entity_type: data.entity_type,
      entity_name: data.entity_name,
      entity_id: data.entity_id || crypto.randomUUID(),
      credit_type: data.credit_type,
      purpose: data.purpose,
      amount_requested: data.amount_requested,
      term_months: data.term_months,
      property_value: data.property_value,
      property_location: data.property_location,
      vehicle_brand: data.vehicle_brand,
      vehicle_model: data.vehicle_model,
      vehicle_year: data.vehicle_year,
      vehicle_value: data.vehicle_value,
    });
    setOpen(false);
    form.reset();
  };

  const getCreditTypeIcon = (type: CreditType) => {
    switch (type) {
      case "habitacao": return Home;
      case "pessoal": return User;
      case "empresarial": return Building2;
      case "automovel": return Car;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Proposta de Crédito</DialogTitle>
          <DialogDescription>
            Crie uma nova proposta para submeter aos bancos parceiros
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Credit Type Selection */}
            <FormField
              control={form.control}
              name="credit_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Crédito</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(Object.keys(CREDIT_TYPE_LABELS) as CreditType[]).map((type) => {
                      const Icon = getCreditTypeIcon(type);
                      const isSelected = field.value === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.onChange(type)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Icon className={`w-6 h-6 mx-auto mb-2 ${
                            isSelected ? "text-primary" : "text-muted-foreground"
                          }`} />
                          <p className={`text-sm font-medium ${
                            isSelected ? "text-primary" : ""
                          }`}>
                            {CREDIT_TYPE_LABELS[type]}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Client Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="entity_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="contact">Particular</SelectItem>
                        <SelectItem value="company">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="entity_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Credit Details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount_requested"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montante Solicitado (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="150000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="term_months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo (meses)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="360"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Property Details (for habitacao) */}
            {creditType === "habitacao" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="property_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor do Imóvel (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="200000"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="property_location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localização</FormLabel>
                      <FormControl>
                        <Input placeholder="Lisboa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Vehicle Details (for automovel) */}
            {creditType === "automovel" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="vehicle_brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="BMW" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vehicle_model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input placeholder="Serie 3" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vehicle_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="35000"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Purpose */}
            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Finalidade</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva a finalidade do crédito..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createProposal.isPending}>
                {createProposal.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Criar Proposta
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
