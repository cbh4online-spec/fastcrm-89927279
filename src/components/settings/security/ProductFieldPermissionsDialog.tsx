import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  Package,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Pencil,
  Search,
  Copy,
  Lock,
  ChevronsUpDown,
} from "lucide-react";
import {
  PRODUCT_FIELDS,
  PRODUCT_FIELD_SECTIONS,
  PRODUCT_ROLES,
  type ProductFieldSection,
} from "@/config/productFieldsCatalog";

type Level = "hidden" | "view" | "edit";

interface Row {
  id: string;
  workspace_id: string;
  object_key: string;
  role: string;
  field_key: string;
  permission_level: Level;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ProductFieldPermissionsDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const [role, setRole] = useState<string>("agent");
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<ProductFieldSection | "all">("all");
  const [pending, setPending] = useState<Map<string, Level>>(new Map());

  const { data: rows, isLoading } = useQuery({
    queryKey: ["field-permissions-admin", "products", workspaceId],
    enabled: open && !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_permissions")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("object_key", "products");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const isOwnerLocked = role === "owner";

  const getLevel = (fieldKey: string): Level => {
    if (isOwnerLocked) return "edit";
    const k = `${role}::${fieldKey}`;
    if (pending.has(k)) return pending.get(k)!;
    const row = rows?.find((r) => r.role === role && r.field_key === fieldKey);
    return row?.permission_level ?? "edit";
  };

  const setLevel = (fieldKey: string, level: Level) => {
    if (isOwnerLocked) return;
    const k = `${role}::${fieldKey}`;
    const next = new Map(pending);
    next.set(k, level);
    setPending(next);
  };

  const setSectionLevel = (sec: ProductFieldSection, level: Level) => {
    if (isOwnerLocked) return;
    const next = new Map(pending);
    PRODUCT_FIELDS.filter((f) => f.section === sec).forEach((f) => {
      next.set(`${role}::${f.key}`, level);
    });
    setPending(next);
  };

  const setAll = (level: Level) => {
    if (isOwnerLocked) return;
    const next = new Map(pending);
    PRODUCT_FIELDS.forEach((f) => next.set(`${role}::${f.key}`, level));
    setPending(next);
  };

  const copyFromRole = (sourceRole: string) => {
    if (isOwnerLocked || sourceRole === role) return;
    const next = new Map(pending);
    PRODUCT_FIELDS.forEach((f) => {
      const sourceRow = rows?.find((r) => r.role === sourceRole && r.field_key === f.key);
      const sourceLevel: Level =
        pending.get(`${sourceRole}::${f.key}`) ??
        sourceRow?.permission_level ??
        "edit";
      next.set(`${role}::${f.key}`, sourceLevel);
    });
    setPending(next);
    toast({ title: `Configuração copiada de ${sourceRole}` });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Sem workspace");
      const items = Array.from(pending.entries()).map(([key, level]) => {
        const [r, field_key] = key.split("::");
        return {
          workspace_id: workspaceId,
          object_key: "products",
          role: r,
          field_key,
          permission_level: level,
        };
      });
      // Upsert in batches of 50
      for (let i = 0; i < items.length; i += 50) {
        const batch = items.slice(i, i + 50);
        const { error } = await supabase
          .from("field_permissions")
          .upsert(batch as any, {
            onConflict: "workspace_id,object_key,role,field_key",
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["field-permissions-admin", "products"] });
      qc.invalidateQueries({ queryKey: ["field-permissions", "products"] });
      setPending(new Map());
      toast({ title: "Permissões guardadas" });
    },
    onError: (e: any) =>
      toast({
        title: "Erro ao guardar",
        description: e?.message,
        variant: "destructive",
      }),
  });

  const filteredFields = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PRODUCT_FIELDS.filter((f) => {
      if (section !== "all" && f.section !== section) return false;
      if (!q) return true;
      return (
        f.label.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q)
      );
    });
  }, [search, section]);

  const fieldsBySection = useMemo(() => {
    const map = new Map<ProductFieldSection, typeof PRODUCT_FIELDS>();
    for (const f of filteredFields) {
      const arr = map.get(f.section) ?? [];
      arr.push(f);
      map.set(f.section, arr);
    }
    return map;
  }, [filteredFields]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Permissões — Produtos
          </DialogTitle>
          <DialogDescription>
            Defina, campo a campo, quem pode <b>ocultar</b>, <b>ver</b> ou{" "}
            <b>editar</b>. Owner e Admin têm sempre acesso total.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_ROLES.map((r) => (
                <SelectItem key={r.key} value={r.key}>
                  <span className="flex items-center gap-2">
                    {r.locked && <Lock className="h-3 w-3" />}
                    {r.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={section}
            onValueChange={(v) => setSection(v as any)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as secções</SelectItem>
              {PRODUCT_FIELD_SECTIONS.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Procurar campo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isOwnerLocked}>
                <ChevronsUpDown className="h-4 w-4 mr-2" />
                Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Aplicar a tudo</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setAll("edit")}>
                <Pencil className="h-4 w-4 mr-2" /> Tudo Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAll("view")}>
                <Eye className="h-4 w-4 mr-2" /> Tudo Ver
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAll("hidden")}>
                <EyeOff className="h-4 w-4 mr-2" /> Tudo Ocultar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Copiar de outra função</DropdownMenuLabel>
              {PRODUCT_ROLES.filter((r) => r.key !== role).map((r) => (
                <DropdownMenuItem
                  key={r.key}
                  onClick={() => copyFromRole(r.key)}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copiar de {r.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {pending.size > 0 && (
            <Badge variant="secondary">{pending.size} alteração(ões)</Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPending(new Map());
              qc.invalidateQueries({
                queryKey: ["field-permissions-admin", "products"],
              });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reverter
          </Button>

          <Button
            size="sm"
            onClick={() => save.mutate()}
            disabled={pending.size === 0 || save.isPending || isOwnerLocked}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar
          </Button>
        </div>

        {isOwnerLocked && (
          <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
            <Lock className="h-3 w-3" /> Owner tem sempre acesso total — não
            editável.
          </div>
        )}

        <Separator className="my-2" />

        <ScrollArea className="flex-1 pr-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {PRODUCT_FIELD_SECTIONS.map((sec) => {
                const items = fieldsBySection.get(sec.key);
                if (!items || items.length === 0) return null;
                return (
                  <div key={sec.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                        {sec.label}
                      </h4>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isOwnerLocked}
                          onClick={() => setSectionLevel(sec.key, "edit")}
                        >
                          Tudo Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isOwnerLocked}
                          onClick={() => setSectionLevel(sec.key, "view")}
                        >
                          Só Ver
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isOwnerLocked}
                          onClick={() => setSectionLevel(sec.key, "hidden")}
                        >
                          Ocultar
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg divide-y">
                      {items.map((field) => {
                        const level = getLevel(field.key);
                        return (
                          <div
                            key={field.key}
                            className="flex items-center justify-between gap-3 p-3"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-sm flex items-center gap-2">
                                {field.label}
                                {field.sensitive && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 h-4"
                                  >
                                    sensível
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono truncate">
                                {field.key}
                              </div>
                            </div>

                            <RadioGroup
                              value={level}
                              onValueChange={(v) =>
                                setLevel(field.key, v as Level)
                              }
                              className="flex items-center gap-3"
                              disabled={isOwnerLocked}
                            >
                              <RadioOpt
                                value="hidden"
                                id={`${field.key}-h`}
                                icon={<EyeOff className="h-3.5 w-3.5" />}
                                label="Oculto"
                              />
                              <RadioOpt
                                value="view"
                                id={`${field.key}-v`}
                                icon={<Eye className="h-3.5 w-3.5" />}
                                label="Ver"
                              />
                              <RadioOpt
                                value="edit"
                                id={`${field.key}-e`}
                                icon={<Pencil className="h-3.5 w-3.5" />}
                                label="Editar"
                              />
                            </RadioGroup>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {filteredFields.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Nenhum campo corresponde aos filtros.
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function RadioOpt({
  value,
  id,
  icon,
  label,
}: {
  value: string;
  id: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <RadioGroupItem value={value} id={id} />
      <Label
        htmlFor={id}
        className="flex items-center gap-1 text-xs cursor-pointer"
      >
        {icon}
        {label}
      </Label>
    </div>
  );
}
