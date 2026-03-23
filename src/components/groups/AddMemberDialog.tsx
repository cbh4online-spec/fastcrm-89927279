import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Loader2, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  existingMemberIds: Set<string>;
}

export function AddMemberDialog({ open, onClose, groupId, existingMemberIds }: AddMemberDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [telegramUserId, setTelegramUserId] = useState("");

  // Fetch workspace members (users)
  const { data: workspaceMembers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["workspace-members-for-group", currentWorkspace?.id],
    queryFn: async () => {
      const { data } = await sb
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", currentWorkspace!.id);
      if (!data?.length) return [];
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await sb
        .from("profiles")
        .select("user_id, full_name, email, avatar_url")
        .in("user_id", userIds);
      return profiles || [];
    },
    enabled: open && !!currentWorkspace,
  });

  // Fetch contacts
  const { data: contacts = [], isLoading: loadingContacts } = useQuery({
    queryKey: ["contacts-for-group", currentWorkspace?.id, search],
    queryFn: async () => {
      let query = sb
        .from("contacts")
        .select("id, name, email, phone")
        .eq("workspace_id", currentWorkspace!.id)
        .order("name")
        .limit(30);
      if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      const { data } = await query;
      return data || [];
    },
    enabled: open && !!currentWorkspace,
  });

  const addMember = useMutation({
    mutationFn: async (member: { user_id?: string; contact_id?: string; telegram_user_id?: number; telegram_username?: string }) => {
      const { error } = await sb.from("group_members").insert({
        group_id: groupId,
        workspace_id: currentWorkspace!.id,
        role: "member",
        ...member,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group-members", groupId] });
      toast.success("Membro adicionado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredUsers = workspaceMembers.filter((u: any) =>
    !existingMemberIds.has(u.user_id) &&
    (!search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredContacts = contacts.filter((c: any) => !existingMemberIds.has(c.id));

  const handleAddTelegram = () => {
    if (!telegramUsername && !telegramUserId) return;
    addMember.mutate({
      telegram_username: telegramUsername || undefined,
      telegram_user_id: telegramUserId ? parseInt(telegramUserId) : undefined,
    });
    setTelegramUsername("");
    setTelegramUserId("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Membro</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="users" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">Utilizadores</TabsTrigger>
            <TabsTrigger value="contacts">Contactos</TabsTrigger>
            <TabsTrigger value="telegram">Telegram</TabsTrigger>
          </TabsList>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="pl-9"
            />
          </div>

          <TabsContent value="users" className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-[280px]">
              {loadingUsers ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum utilizador disponível</p>
              ) : (
                <div className="space-y-1 p-1">
                  {filteredUsers.map((u: any) => (
                    <button
                      key={u.user_id}
                      onClick={() => addMember.mutate({ user_id: u.user_id })}
                      disabled={addMember.isPending}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{u.full_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="contacts" className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-[280px]">
              {loadingContacts ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : filteredContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum contacto encontrado</p>
              ) : (
                <div className="space-y-1 p-1">
                  {filteredContacts.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => addMember.mutate({ contact_id: c.id })}
                      disabled={addMember.isPending}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{c.name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email || c.phone}</p>
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="telegram" className="mt-2 space-y-4">
            <div>
              <Label>Username Telegram</Label>
              <Input
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                placeholder="@username"
              />
            </div>
            <div>
              <Label>User ID Telegram (opcional)</Label>
              <Input
                value={telegramUserId}
                onChange={(e) => setTelegramUserId(e.target.value)}
                placeholder="123456789"
              />
            </div>
            <Button onClick={handleAddTelegram} disabled={(!telegramUsername && !telegramUserId) || addMember.isPending} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" /> Adicionar Membro Telegram
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
