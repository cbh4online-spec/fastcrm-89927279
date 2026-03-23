import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGroups, useCreateGroup, Group } from "@/hooks/useGroups";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, MessagesSquare, Send, Search, ShoppingBag, HeadphonesIcon, Globe, UserCog } from "lucide-react";
import { GroupChat } from "./GroupChat";
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
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [search, setSearch] = useState("");
  const [filterPurpose, setFilterPurpose] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<string>("internal");
  const [newPurpose, setNewPurpose] = useState<string>("general");
  const [newTelegramChatId, setNewTelegramChatId] = useState("");

  const filtered = (groups || []).filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchesPurpose = filterPurpose === "all" || g.purpose === filterPurpose;
    return matchesSearch && matchesPurpose;
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createGroup.mutateAsync({
        name: newName,
        description: newDescription || null,
        group_type: newType as any,
        purpose: newPurpose as any,
        telegram_chat_id: newTelegramChatId ? parseInt(newTelegramChatId) : null,
      });
      toast.success("Grupo criado com sucesso");
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setNewType("internal");
      setNewPurpose("general");
      setNewTelegramChatId("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (selectedGroup) {
    return <GroupChat group={selectedGroup} onBack={() => setSelectedGroup(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grupos</h1>
          <p className="text-muted-foreground">
            Grupos internos e Telegram para suporte, vendas e comunidade
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Novo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Grupo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Suporte Clientes Premium"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Descreva o propósito do grupo..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Interno</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="hybrid">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Objectivo</Label>
                  <Select value={newPurpose} onValueChange={setNewPurpose}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
              {(newType === "telegram" || newType === "hybrid") && (
                <div>
                  <Label>Telegram Chat ID</Label>
                  <Input
                    value={newTelegramChatId}
                    onChange={(e) => setNewTelegramChatId(e.target.value)}
                    placeholder="Ex: -1001234567890"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    ID do grupo Telegram. Adicione o bot ao grupo primeiro.
                  </p>
                </div>
              )}
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || createGroup.isPending}
                className="w-full"
              >
                {createGroup.isPending ? "A criar..." : "Criar Grupo"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar grupos..."
            className="pl-9"
          />
        </div>
        <Select value={filterPurpose} onValueChange={setFilterPurpose}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
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
            <p className="text-muted-foreground mt-1">
              Crie o primeiro grupo para começar a comunicar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group) => {
            const Icon = purposeIcons[group.purpose] || MessagesSquare;
            return (
              <Card
                key={group.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedGroup(group)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[group.group_type] || group.group_type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {purposeLabels[group.purpose] || group.purpose}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {group.telegram_chat_id && (
                      <Send className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {group.description}
                    </p>
                  )}
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
    </div>
  );
}
