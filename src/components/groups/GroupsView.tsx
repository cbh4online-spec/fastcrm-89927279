import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, Group } from "@/hooks/useGroups";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Users, MessagesSquare, Send, Search, ShoppingBag, HeadphonesIcon, Globe, UserCog, Megaphone, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { GroupChat } from "./GroupChat";
import { BroadcastPanel } from "./BroadcastPanel";
import { TelegramChatPicker } from "./TelegramChatPicker";
import { toast } from "sonner";

const purposeIcons: Record<string, any> = {
  support: HeadphonesIcon,
  sales: ShoppingBag,
  community: Globe,
  team: UserCog,
  general: MessagesSquare,
};

const purposeLabels: Record<string, string> = {
  support: "Suporte",
  sales: "Vendas",
  community: "Comunidade",
  team: "Equipa",
  general: "Geral",
};

const typeLabels: Record<string, string> = {
  internal: "Interno",
  telegram: "Telegram",
  hybrid: "Híbrido",
};

export function GroupsView() {
  const { t } = useTranslation("common");
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [search, setSearch] = useState("");
  const [filterPurpose, setFilterPurpose] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Delete state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null);

  // Form state (shared for create/edit)
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<string>("internal");
  const [formPurpose, setFormPurpose] = useState<string>("general");
  const [formTelegramChatId, setFormTelegramChatId] = useState("");

  const filtered = (groups || []).filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchesPurpose = filterPurpose === "all" || g.purpose === filterPurpose;
    return matchesSearch && matchesPurpose;
  });

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormType("internal");
    setFormPurpose("general");
    setFormTelegramChatId("");
  };

  const openEdit = (group: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroup(group);
    setFormName(group.name);
    setFormDescription(group.description || "");
    setFormType(group.group_type);
    setFormPurpose(group.purpose);
    setFormTelegramChatId(group.telegram_chat_id ? String(group.telegram_chat_id) : "");
    setEditOpen(true);
  };

  const openDelete = (group: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingGroup(group);
    setDeleteOpen(true);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    try {
      await createGroup.mutateAsync({
        name: formName,
        description: formDescription || null,
        group_type: formType as any,
        purpose: formPurpose as any,
        telegram_chat_id: formTelegramChatId ? parseInt(formTelegramChatId) : null,
      });
      toast.success("Grupo criado com sucesso");
      setCreateOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingGroup || !formName.trim()) return;
    try {
      await updateGroup.mutateAsync({
        id: editingGroup.id,
        name: formName,
        description: formDescription || null,
        group_type: formType as any,
        purpose: formPurpose as any,
        telegram_chat_id: formTelegramChatId ? parseInt(formTelegramChatId) : null,
      });
      toast.success("Grupo atualizado com sucesso");
      setEditOpen(false);
      setEditingGroup(null);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;
    try {
      await deleteGroup.mutateAsync(deletingGroup.id);
      toast.success("Grupo apagado com sucesso");
      setDeleteOpen(false);
      setDeletingGroup(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (selectedGroup) {
    return <GroupChat group={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  const GroupFormFields = () => (
    <div className="space-y-4">
      <div>
        <Label>Nome</Label>
        <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Suporte Clientes Premium" />
      </div>
      <div>
        <Label>Descrição</Label>
        <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descreva o propósito do grupo..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo</Label>
          <Select value={formType} onValueChange={setFormType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Interno</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="hybrid">Híbrido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Objectivo</Label>
          <Select value={formPurpose} onValueChange={setFormPurpose}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">Geral</SelectItem>
              <SelectItem value="support">Suporte</SelectItem>
              <SelectItem value="sales">Vendas</SelectItem>
              <SelectItem value="community">Comunidade</SelectItem>
              <SelectItem value="team">Equipa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {(formType === "telegram" || formType === "hybrid") && (
        <TelegramChatPicker value={formTelegramChatId} onChange={setFormTelegramChatId} />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grupos</h1>
          <p className="text-muted-foreground">Grupos internos e Telegram para suporte, vendas e comunidade</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBroadcastOpen(true)}>
            <Megaphone className="h-4 w-4 mr-2" /> Broadcast
          </Button>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Novo Grupo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Novo Grupo</DialogTitle></DialogHeader>
              <GroupFormFields />
              <Button onClick={handleCreate} disabled={!formName.trim() || createGroup.isPending} className="w-full">
                {createGroup.isPending ? "A criar..." : "Criar Grupo"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar grupos..." className="pl-9" />
        </div>
        <Select value={filterPurpose} onValueChange={setFilterPurpose}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="support">Suporte</SelectItem>
            <SelectItem value="sales">Vendas</SelectItem>
            <SelectItem value="community">Comunidade</SelectItem>
            <SelectItem value="team">Equipa</SelectItem>
            <SelectItem value="general">Geral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Groups grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">A carregar...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessagesSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Sem grupos</h3>
            <p className="text-muted-foreground mt-1">Crie o primeiro grupo para começar a comunicar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group) => {
            const Icon = purposeIcons[group.purpose] || MessagesSquare;
            return (
              <Card key={group.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedGroup(group)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{typeLabels[group.group_type] || group.group_type}</Badge>
                          <Badge variant="secondary" className="text-xs">{purposeLabels[group.purpose] || group.purpose}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {group.telegram_chat_id && <Send className="h-4 w-4 text-blue-500" />}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => openEdit(group, e as any)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => openDelete(group, e as any)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Apagar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {group.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{group.description}</p>}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{group.member_count ?? 0} membros</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) { setEditingGroup(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Grupo</DialogTitle></DialogHeader>
          <GroupFormFields />
          <Button onClick={handleUpdate} disabled={!formName.trim() || updateGroup.isPending} className="w-full">
            {updateGroup.isPending ? "A guardar..." : "Guardar alterações"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar grupo "{deletingGroup?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. O grupo, membros e mensagens serão apagados permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteGroup.isPending ? "A apagar..." : "Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BroadcastPanel open={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
    </div>
  );
}
