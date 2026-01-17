import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreatePriceTable,
  useUpdatePriceTable,
  PriceTable,
  tableTypeLabels,
  customerSegmentOptions,
  PriceTableType,
} from "@/hooks/usePriceTables";

const priceTableSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  table_type: z.enum(["segment", "volume", "promotional"]),
  customer_segment: z.string().optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
  priority: z.coerce.number().min(0).default(0),
});

type PriceTableFormData = z.infer<typeof priceTableSchema>;

interface PriceTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table?: PriceTable | null;
}

export function PriceTableDialog({ open, onOpenChange, table }: PriceTableDialogProps) {
  const createTable = useCreatePriceTable();
  const updateTable = useUpdatePriceTable();
  const isEditing = !!table;

  const form = useForm<PriceTableFormData>({
    resolver: zodResolver(priceTableSchema),
    defaultValues: {
      name: "",
      description: "",
      table_type: "segment",
      customer_segment: "",
      valid_from: "",
      valid_until: "",
      is_active: true,
      is_default: false,
      priority: 0,
    },
  });

  const tableType = form.watch("table_type");

  useEffect(() => {
    if (table) {
      form.reset({
        name: table.name,
        description: table.description || "",
        table_type: table.table_type as PriceTableType,
        customer_segment: table.customer_segment || "",
        valid_from: table.valid_from ? table.valid_from.split("T")[0] : "",
        valid_until: table.valid_until ? table.valid_until.split("T")[0] : "",
        is_active: table.is_active,
        is_default: table.is_default,
        priority: table.priority,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        table_type: "segment",
        customer_segment: "",
        valid_from: "",
        valid_until: "",
        is_active: true,
        is_default: false,
        priority: 0,
      });
    }
  }, [table, form]);

  const onSubmit = async (data: PriceTableFormData) => {
    try {
      const payload = {
        name: data.name,
        description: data.description || undefined,
        table_type: data.table_type,
        customer_segment: data.table_type === "segment" ? data.customer_segment || undefined : undefined,
        valid_from: data.table_type === "promotional" && data.valid_from ? new Date(data.valid_from).toISOString() : undefined,
        valid_until: data.table_type === "promotional" && data.valid_until ? new Date(data.valid_until).toISOString() : undefined,
        is_active: data.is_active,
        is_default: data.is_default,
        priority: data.priority,
      };

      if (isEditing && table) {
        await updateTable.mutateAsync({ id: table.id, ...payload });
      } else {
        await createTable.mutateAsync(payload);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Tabela de Preços" : "Nova Tabela de Preços"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Tabela Revendedores 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="table_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Tabela</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(tableTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {tableType === "segment" && (
              <FormField
                control={form.control}
                name="customer_segment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segmento de Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar segmento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customerSegmentOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {tableType === "promotional" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="valid_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Válido de</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="valid_until"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Válido até</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição opcional..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prioridade</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormDescription>
                    Tabelas com maior prioridade são aplicadas primeiro
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Ativa</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Padrão</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createTable.isPending || updateTable.isPending}
              >
                {createTable.isPending || updateTable.isPending
                  ? "A guardar..."
                  : isEditing
                  ? "Guardar"
                  : "Criar Tabela"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
