import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tag, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
  useWorkspaceTags,
  useCreateWorkspaceTag,
  useUpdateWorkspaceTag,
  useDeleteWorkspaceTag,
  WorkspaceTag,
} from "@/hooks/useWorkspaceTags";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  { value: "red", label: "Vermelho", class: "bg-red-500" },
  { value: "blue", label: "Azul", class: "bg-blue-500" },
  { value: "green", label: "Verde", class: "bg-green-500" },
  { value: "yellow", label: "Amarelo", class: "bg-yellow-500" },
  { value: "purple", label: "Roxo", class: "bg-purple-500" },
  { value: "pink", label: "Rosa", class: "bg-pink-500" },
  { value: "orange", label: "Laranja", class: "bg-orange-500" },
];

const TAG_BADGE_COLORS: Record<string, string> = {
  red: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  green: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  yellow: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  purple: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  pink: "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/20",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
};

const DEFAULT_BADGE = "bg-primary/10 text-primary border-primary/20";

function getBadgeClass(color: string | null) {
  return color ? TAG_BADGE_COLORS[color] || DEFAULT_BADGE : DEFAULT_BADGE;
}

export default function WorkspaceTagsPage() {
  const { data: tags = [], isLoading } = useWorkspaceTags();
  const createTag = useCreateWorkspaceTag();
  const updateTag = useUpdateWorkspaceTag();
  const deleteTag = useDeleteWorkspaceTag();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>("blue");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceTag | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createTag.mutate({ name: newName.trim(), color: newColor }, {
      onSuccess: () => { setNewName(""); },
    });
  };

  const startEdit = (tag: WorkspaceTag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateTag.mutate({ id: editingId, name: editName.trim(), color: editColor }, {
      onSuccess: () => setEditingId(null),
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteTag.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gestão de Etiquetas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Crie, edite e organize as etiquetas do seu workspace.
        </p>
      </div>

      {/* Create new tag */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova Etiqueta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da etiqueta..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewColor(c.value)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-all",
                    c.class,
                    newColor === c.value ? "ring-2 ring-offset-2 ring-primary" : "opacity-60 hover:opacity-100"
                  )}
                  title={c.label}
                />
              ))}
            </div>
            <Button onClick={handleCreate} disabled={!newName.trim() || createTag.isPending} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Criar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4" /> Etiquetas ({tags.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">A carregar...</p>
          ) : tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma etiqueta criada.</p>
          ) : (
            <div className="divide-y divide-border">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between py-3 gap-3">
                  {editingId === tag.id ? (
                    <>
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 text-sm flex-1 max-w-xs"
                          onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                          autoFocus
                        />
                        <div className="flex gap-1">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setEditColor(c.value)}
                              className={cn(
                                "w-5 h-5 rounded-full transition-all",
                                c.class,
                                editColor === c.value ? "ring-2 ring-offset-1 ring-primary" : "opacity-50 hover:opacity-100"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Badge variant="outline" className={cn("text-sm", getBadgeClass(tag.color))}>
                        {tag.name}
                      </Badge>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(tag)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(tag)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar etiqueta?</AlertDialogTitle>
            <AlertDialogDescription>
              A etiqueta "{deleteTarget?.name}" será removida permanentemente. As entidades que a usam ficarão sem esta etiqueta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
