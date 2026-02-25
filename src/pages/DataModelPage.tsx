import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCustomObjects, useCreateCustomObject, useDeleteCustomObject, CustomObject } from "@/hooks/useCustomObjects";
import { useCoreObjectFields } from "@/hooks/useCoreObjectFields";
import { ObjectFieldBuilder } from "@/components/objects/ObjectFieldBuilder";
import { RelationshipSchemaBuilder } from "@/components/objects/RelationshipSchemaBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ColorPicker } from "@/components/ui/color-picker";
import { getIconByName, INDUSTRY_ICONS } from "@/lib/icons";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Database,
  Settings2,
  Link2,
  LayoutList,
  Trash2,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";

const ICON_PRESETS = INDUSTRY_ICONS.flatMap((c) => c.icons);

export default function DataModelPage() {
  const { data: objects = [], isLoading } = useCustomObjects();
  const createObject = useCreateCustomObject();
  const deleteObject = useDeleteCustomObject();
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");

  const selectedObject = objects.find((o) => o.id === selectedId);

  const handleCreateObject = async () => {
    if (!newName.trim()) return;
    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    createObject.mutate(
      { name: newName.trim(), slug, description: "", icon: "Package", color: "#2563eb" },
      {
        onSuccess: (obj) => {
          // Also create in core_object_types for dual-write
          if (currentWorkspace) {
            supabase
              .from("core_object_types")
              .insert({
                workspace_id: currentWorkspace.id,
                type: slug,
                label: newName.trim(),
                label_pt: newName.trim(),
                icon: "Package",
                source_table: `custom_${slug}`,
                color: "#2563eb",
                description: "",
                is_active: true,
              } as any)
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ["extension-manifests"] });
              });
          }
          setSelectedId(obj.id);
          setCreatingNew(false);
          setNewName("");
        },
      }
    );
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Left Sidebar — Object List */}
        <div className="w-64 border-r bg-muted/20 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              Modelo de Dados
            </h2>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                objects.map((obj) => {
                  const IconComp = getIconByName(obj.icon);
                  return (
                    <button
                      key={obj.id}
                      onClick={() => setSelectedId(obj.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors text-sm",
                        selectedId === obj.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/50 text-foreground"
                      )}
                    >
                      <IconComp className="h-4 w-4 shrink-0" style={{ color: obj.color }} />
                      <span className="truncate flex-1">{obj.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t">
            {creatingNew ? (
              <div className="space-y-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome do objeto..."
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateObject();
                    if (e.key === "Escape") { setCreatingNew(false); setNewName(""); }
                  }}
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleCreateObject} disabled={!newName.trim() || createObject.isPending}>
                    {createObject.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Criar"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setCreatingNew(false); setNewName(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setCreatingNew(true)}>
                <Plus className="h-3.5 w-3.5" /> Criar Objeto
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {!selectedObject ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <Database className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p className="text-sm">Selecione um objeto para configurar</p>
              </div>
            </div>
          ) : (
            <ObjectConfigPanel
              object={selectedObject}
              onDelete={() => {
                deleteObject.mutate(selectedObject.id);
                setSelectedId(null);
              }}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function ObjectConfigPanel({ object, onDelete }: { object: CustomObject; onDelete: () => void }) {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const { data: fields = [] } = useCoreObjectFields(object.id);

  // Local state for settings
  const [editName, setEditName] = useState(object.name);
  const [editDesc, setEditDesc] = useState(object.description || "");
  const [editIcon, setEditIcon] = useState(object.icon);
  const [editColor, setEditColor] = useState(object.color);
  const [saving, setSaving] = useState(false);

  // Reset when object changes
  useState(() => {
    setEditName(object.name);
    setEditDesc(object.description || "");
    setEditIcon(object.icon);
    setEditColor(object.color);
  });

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase
        .from("custom_objects")
        .update({
          name: editName,
          description: editDesc,
          icon: editIcon,
          color: editColor,
          updated_at: new Date().toISOString(),
        } as any) as any)
        .eq("id", object.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["custom-objects"] });
      toast.success("Objeto atualizado");
    } catch {
      toast.error("Erro ao atualizar");
    } finally {
      setSaving(false);
    }
  };

  const IconComp = getIconByName(object.icon);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center gap-3">
        <IconComp className="h-5 w-5" style={{ color: object.color }} />
        <div>
          <h2 className="text-lg font-semibold">{object.name}</h2>
          {object.description && (
            <p className="text-xs text-muted-foreground">{object.description}</p>
          )}
        </div>
        <Badge variant="secondary" className="ml-auto text-xs">
          {fields.length} {fields.length === 1 ? "campo" : "campos"}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="fields" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-2 border-b">
          <TabsList className="bg-transparent h-auto p-0 gap-4">
            <TabsTrigger value="fields" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-2 text-sm gap-1.5">
              <LayoutList className="h-3.5 w-3.5" /> Campos
            </TabsTrigger>
            <TabsTrigger value="relationships" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-2 text-sm gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Relações
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-1 pb-2 text-sm gap-1.5">
              <Settings2 className="h-3.5 w-3.5" /> Definições
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-2xl">
            <TabsContent value="fields" className="mt-0">
              <ObjectFieldBuilder objectId={object.id} />
            </TabsContent>

            <TabsContent value="relationships" className="mt-0">
              <RelationshipSchemaBuilder objectId={object.id} objectName={object.name} />
            </TabsContent>

            <TabsContent value="settings" className="mt-0 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Informações</h4>
                <div className="grid gap-3">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Descrição</Label>
                    <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="mt-1 min-h-[60px]" placeholder="Descrição opcional..." />
                  </div>
                </div>
              </div>

              {/* Icon Picker */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Ícone</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ICON_PRESETS.map((iconName) => {
                    const IC = getIconByName(iconName);
                    return (
                      <button
                        key={iconName}
                        onClick={() => setEditIcon(iconName)}
                        className={cn(
                          "w-8 h-8 rounded-md border flex items-center justify-center transition-all hover:scale-110",
                          editIcon === iconName ? "border-primary ring-2 ring-primary/30 bg-primary/10" : "border-border hover:border-primary/50"
                        )}
                      >
                        <IC className="h-4 w-4" style={{ color: editColor }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color */}
              <ColorPicker label="Cor" value={editColor} onChange={setEditColor} />

              <Button onClick={handleSaveSettings} disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Guardar Alterações
              </Button>

              {/* Danger Zone */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-destructive">Zona de Perigo</h4>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Archive className="h-3.5 w-3.5" /> Arquivar Objeto
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Arquivar "{object.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O objeto e todos os seus registos serão arquivados. Esta ação pode ser revertida.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Arquivar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
