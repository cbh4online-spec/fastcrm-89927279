import { useState } from "react";
import { useFormFieldOrder, FormEntityType, FieldConfig } from "@/hooks/useFormFieldOrder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  FileText,
  Mail,
  Phone,
  Globe,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FIELD_TYPE_ICONS: Record<string, React.ReactNode> = {
  text: <Type className="w-4 h-4" />,
  number: <Hash className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  boolean: <ToggleLeft className="w-4 h-4" />,
  select: <List className="w-4 h-4" />,
  textarea: <FileText className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
};

const ENTITY_LABELS: Record<FormEntityType, string> = {
  lead: "Leads",
  contact: "Contactos",
  company: "Empresas",
  opportunity: "Oportunidades",
};

interface FormLayoutEditorProps {
  defaultEntity?: FormEntityType;
}

export function FormLayoutEditor({ defaultEntity = "company" }: FormLayoutEditorProps) {
  const [entityType, setEntityType] = useState<FormEntityType>(defaultEntity);
  const { fields, reorderFields, toggleFieldVisibility, resetToDefault } = useFormFieldOrder(entityType);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = draggedIndex;
    
    setDraggedIndex(null);
    setDragOverIndex(null);

    if (dragIndex === null || dragIndex === dropIndex) return;

    reorderFields(dragIndex, dropIndex);
    toast.success("Ordem atualizada");
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getFieldIcon = (field: FieldConfig) => {
    if (field.fieldType && FIELD_TYPE_ICONS[field.fieldType]) {
      return FIELD_TYPE_ICONS[field.fieldType];
    }
    return <Type className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Editor de Layout do Formulário</h3>
          <p className="text-sm text-muted-foreground">
            Arraste os campos para reordenar como aparecem nos formulários
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefault}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Repor Padrão
        </Button>
      </div>

      <Tabs value={entityType} onValueChange={(v) => setEntityType(v as FormEntityType)}>
        <TabsList>
          {(Object.keys(ENTITY_LABELS) as FormEntityType[]).map((type) => (
            <TabsTrigger key={type} value={type}>
              {ENTITY_LABELS[type]}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(ENTITY_LABELS) as FormEntityType[]).map((type) => (
          <TabsContent key={type} value={type} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Campos de {ENTITY_LABELS[type]}
                </CardTitle>
                <CardDescription>
                  Arraste para reordenar. Use o switch para mostrar/ocultar campos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "flex items-center gap-3 p-3 bg-background border rounded-lg cursor-grab active:cursor-grabbing transition-all",
                          draggedIndex === index && "opacity-50 scale-95",
                          dragOverIndex === index && "border-primary border-2 bg-primary/5",
                          !field.visible && "opacity-60 bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <GripVertical className="w-4 h-4" />
                          <Badge variant="outline" className="text-xs font-mono w-6 justify-center">
                            {index + 1}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          {getFieldIcon(field)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium truncate",
                              !field.visible && "text-muted-foreground"
                            )}>
                              {field.name}
                            </span>
                            {field.required && (
                              <span className="text-destructive text-xs">*</span>
                            )}
                            <Badge 
                              variant={field.type === "native" ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {field.type === "native" ? "Nativo" : "Personalizado"}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {field.visible ? (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            )}
                            <Switch
                              checked={field.visible}
                              onCheckedChange={() => toggleFieldVisibility(field.id)}
                              disabled={field.required}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">Nativo</Badge>
          <span className="text-sm text-muted-foreground">Campo do sistema</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Personalizado</Badge>
          <span className="text-sm text-muted-foreground">Campo criado por si</span>
        </div>
      </div>
    </div>
  );
}
