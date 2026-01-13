import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWorkspaceInstances, WorkspaceInstance, WorkspaceStatus } from "@/hooks/useWorkspaceInstances";
import { useAllWorkspaces } from "@/hooks/useAllWorkspaces";
import { useEffect } from "react";

const formSchema = z.object({
  workspace_id: z.string().min(1, "Selecione um workspace"),
  supabase_url: z.string().url("URL inválido"),
  supabase_anon_key: z.string().min(1, "Chave anónima é obrigatória"),
  status: z.enum(["active", "suspended", "inactive", "pending"]),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editInstance?: WorkspaceInstance | null;
}

export function WorkspaceInstanceForm({ open, onOpenChange, editInstance }: Props) {
  const { workspaces } = useAllWorkspaces();
  const { instances, createInstance, updateInstance } = useWorkspaceInstances();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspace_id: "",
      supabase_url: "",
      supabase_anon_key: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (editInstance) {
      form.reset({
        workspace_id: editInstance.workspace_id,
        supabase_url: editInstance.supabase_url,
        supabase_anon_key: editInstance.supabase_anon_key,
        status: editInstance.status,
      });
    } else {
      form.reset({
        workspace_id: "",
        supabase_url: "",
        supabase_anon_key: "",
        status: "active",
      });
    }
  }, [editInstance, form]);

  const onSubmit = async (values: FormValues) => {
    if (editInstance) {
      await updateInstance.mutateAsync({
        id: editInstance.id,
        workspace_id: values.workspace_id,
        supabase_url: values.supabase_url,
        supabase_anon_key: values.supabase_anon_key,
        status: values.status,
      });
    } else {
      await createInstance.mutateAsync({
        workspace_id: values.workspace_id,
        supabase_url: values.supabase_url,
        supabase_anon_key: values.supabase_anon_key,
        status: values.status,
      });
    }
    onOpenChange(false);
  };

  // Filter out workspaces that already have instances (unless editing)
  const availableWorkspaces = workspaces.filter(
    (w) =>
      !instances.some((i) => i.workspace_id === w.id) ||
      editInstance?.workspace_id === w.id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editInstance ? "Editar Instância" : "Nova Instância"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="workspace_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!!editInstance}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um workspace" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableWorkspaces.map((workspace) => (
                        <SelectItem key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supabase_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Supabase</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://xxxxx.supabase.co"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    URL da instância Supabase deste workspace
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="supabase_anon_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chave Anónima (anon key)</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIs..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Chave pública anónima do Supabase
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="suspended">Suspenso</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={createInstance.isPending || updateInstance.isPending}
              >
                {editInstance ? "Guardar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
