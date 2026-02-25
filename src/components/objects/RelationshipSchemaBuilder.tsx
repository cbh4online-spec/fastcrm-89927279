import { useState } from "react";
import { toast } from "sonner";
import { useCustomObjects } from "@/hooks/useCustomObjects";
import { useObjectRelationships, useCreateRelationship } from "@/hooks/useObjectRelationships";
import { useObjectRecords } from "@/hooks/useCustomObjects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getIconByName } from "@/lib/icons";
import { Plus, ArrowRight, Loader2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useQuery } from "@tanstack/react-query";

interface Props {
  objectId: string;
  objectName: string;
}

interface RelationshipSchema {
  targetObjectId: string;
  targetObjectName: string;
  targetObjectIcon: string;
  targetObjectColor: string;
  relationshipType: string;
  count: number;
}

export function RelationshipSchemaBuilder({ objectId, objectName }: Props) {
  const { data: customObjects = [] } = useCustomObjects();
  const { currentWorkspace } = useWorkspace();
  const [showAdd, setShowAdd] = useState(false);
  const [targetObjectId, setTargetObjectId] = useState("");
  const [relationType, setRelationType] = useState("related_to");

  const { data: schemas = [], isLoading } = useQuery({
    queryKey: ["relationship-schemas", currentWorkspace?.id, objectId],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await (supabase
        .from("object_relationships")
        .select("source_object_id, target_object_id, relationship_type") as any)
        .eq("workspace_id", currentWorkspace.id)
        .or(`source_object_id.eq.${objectId},target_object_id.eq.${objectId}`);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const map = new Map<string, { targetId: string; type: string; count: number }>();
      for (const r of data as any[]) {
        const isSource = r.source_object_id === objectId;
        const targetId = isSource ? r.target_object_id : r.source_object_id;
        const key = `${targetId}:${r.relationship_type}`;
        const existing = map.get(key);
        if (existing) {
          existing.count++;
        } else {
          map.set(key, { targetId, type: r.relationship_type, count: 1 });
        }
      }

      const targetIds = [...new Set([...map.values()].map((v) => v.targetId))];
      const { data: objs } = await (supabase
        .from("custom_objects")
        .select("id, name, icon, color") as any)
        .in("id", targetIds);

      const objMap = new Map((objs || []).map((o: any) => [o.id, o]));

      return [...map.values()].map((v): RelationshipSchema => {
        const obj = objMap.get(v.targetId) as any;
        return {
          targetObjectId: v.targetId,
          targetObjectName: obj?.name || "Desconhecido",
          targetObjectIcon: obj?.icon || "Package",
          targetObjectColor: obj?.color || "#666",
          relationshipType: v.type,
          count: v.count,
        };
      });
    },
    enabled: !!currentWorkspace,
  });

  const availableTargets = customObjects.filter((o) => o.id !== objectId);

  const RELATION_LABELS: Record<string, string> = {
    related_to: "Relacionado",
    parent_of: "Pai de",
    child_of: "Filho de",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Relações do Objeto
        </h4>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3.5 w-3.5" /> Adicionar Relação
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Defina quais objetos podem ser relacionados com "{objectName}".
      </p>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : schemas.length === 0 && !showAdd ? (
        <div className="text-center py-8 text-muted-foreground">
          <Link2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm">Nenhuma relação definida ainda.</p>
          <p className="text-xs mt-1">Adicione relações para conectar este objeto com outros.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schemas.map((schema, i) => {
            const IconComp = getIconByName(schema.targetObjectIcon);
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors duration-150">
                <span className="text-sm font-medium">{objectName}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <IconComp className="h-4 w-4" style={{ color: schema.targetObjectColor }} />
                <span className="text-sm font-medium">{schema.targetObjectName}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {RELATION_LABELS[schema.relationshipType] || schema.relationshipType}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {schema.count} {schema.count === 1 ? "registo" : "registos"}
                </Badge>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="p-3 rounded-lg border border-border/30 bg-muted/20 space-y-3 animate-fade-in">
          <div>
            <Label className="text-xs">Objeto Alvo</Label>
            <Select value={targetObjectId} onValueChange={setTargetObjectId}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue placeholder="Selecionar objeto..." />
              </SelectTrigger>
              <SelectContent>
                {availableTargets.map((obj) => {
                  const IC = getIconByName(obj.icon);
                  return (
                    <SelectItem key={obj.id} value={obj.id}>
                      <span className="flex items-center gap-2">
                        <IC className="h-3.5 w-3.5" style={{ color: obj.color }} />
                        {obj.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo de Relação</Label>
            <Select value={relationType} onValueChange={setRelationType}>
              <SelectTrigger className="h-8 text-xs mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="related_to">Relacionado</SelectItem>
                <SelectItem value="parent_of">Pai de</SelectItem>
                <SelectItem value="child_of">Filho de</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Isto permite que registos de "{objectName}" sejam ligados a registos do objeto selecionado.
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="text-xs" disabled={!targetObjectId} onClick={() => {
              setShowAdd(false);
              setTargetObjectId("");
              toast.success("Relação configurada. Pode agora ligar registos individuais.");
            }}>
              Confirmar
            </Button>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setShowAdd(false); setTargetObjectId(""); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
