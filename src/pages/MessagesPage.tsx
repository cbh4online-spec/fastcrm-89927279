import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Helmet } from "react-helmet-async";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkRead,
  useStartDM,
  useCreateGroup,
  useCreateBroadcast,
  useWorkspaceTeammates,
  type ConversationListItem,
} from "@/hooks/useDirectMessages";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Send, Megaphone, Users, MessageCircle, Loader2, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function initials(name?: string | null, email?: string | null) {
  const src = name || email || "?";
  return src
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function highlight(text: string, tokens: string[]) {
  if (!text || tokens.length === 0) return text;
  const pattern = new RegExp(
    `(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  const parts = text.split(pattern);
  return parts.map((p, i) =>
    pattern.test(p) ? (
      <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const { isSuperAdmin } = useUserRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("c");

  const { data: conversations = [], isLoading } = useConversations();
  const setSelected = (id: string | null) => {
    if (id) setSearchParams({ c: id });
    else setSearchParams({});
  };

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Mensagens · FastCRM</title>
        <meta name="description" content="Mensagens diretas entre membros do workspace." />
      </Helmet>
      <div className="flex h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-8rem)] min-h-0 overflow-hidden border-t">
        {/* Sidebar — full width em mobile quando não há conversa seleccionada */}
        <aside
          className={cn(
            "border-r bg-muted/20 flex-col",
            "w-full md:w-72",
            selected ? "hidden md:flex" : "flex",
          )}
        >
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="text-sm font-semibold">Mensagens</h2>
            <NewConversationButton workspaceId={currentWorkspace?.id ?? null} isSuperAdmin={isSuperAdmin} />
          </div>
          <ScrollArea className="flex-1">
            {isLoading && (
              <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> A carregar…
              </div>
            )}
            {!isLoading && conversations.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">
                Sem conversas. Inicie uma com um colega.
              </div>
            )}
            <ul>
              {conversations.map((c) => (
                <ConversationRow
                  key={c.id}
                  conv={c}
                  active={c.id === selectedId}
                  onClick={() => setSelected(c.id)}
                  meId={user?.id}
                />
              ))}
            </ul>
          </ScrollArea>
        </aside>

        {/* Thread — full width em mobile quando há conversa seleccionada */}
        <section
          className={cn(
            "flex-1 flex-col bg-background min-w-0 min-h-0",
            selected ? "flex" : "hidden md:flex",
          )}
        >
          {selected ? (
            <ConversationThread conv={selected} onBack={() => setSelected(null)} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm">Selecione uma conversa ou inicie uma nova.</p>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

function ConversationRow({
  conv,
  active,
  onClick,
  meId,
}: {
  conv: ConversationListItem;
  active: boolean;
  onClick: () => void;
  meId?: string;
}) {
  const other = conv.conv_type === "dm" ? conv.members.find((m) => m.user_id !== meId) : null;
  const Icon =
    conv.conv_type === "broadcast" ? Megaphone : conv.conv_type === "group" ? Users : null;

  return (
    <li>
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-muted/50 transition-colors border-b border-border/40",
          active && "bg-muted",
        )}
      >
        {other ? (
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={other.avatar_url ?? undefined} />
            <AvatarFallback>{initials(other.full_name)}</AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={cn(
              "h-9 w-9 shrink-0 rounded-full flex items-center justify-center",
              conv.conv_type === "broadcast"
                ? "bg-amber-500/15 text-amber-600"
                : "bg-primary/10 text-primary",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">{conv.display_title}</p>
            {conv.last_message && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(conv.last_message.created_at), { locale: pt, addSuffix: false })}
              </span>
            )}
          </div>
          {conv.workspace_name && (
            <Badge variant="outline" className="mt-0.5 h-4 px-1.5 text-[9px] font-normal text-muted-foreground border-muted-foreground/20">
              {conv.workspace_name}
            </Badge>
          )}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground truncate">
              {conv.last_message?.body || "Sem mensagens"}
            </p>
            {conv.unread_count > 0 && (
              <Badge className="h-5 px-1.5 text-[10px]">{conv.unread_count}</Badge>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

function ConversationThread({ conv, onBack }: { conv: ConversationListItem; onBack?: () => void }) {
  const { user } = useAuth();
  const { data: messages = [], isLoading } = useMessages(conv.id);
  const sendMsg = useSendMessage();
  const markRead = useMarkRead();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // mark read on open & on new messages
  useEffect(() => {
    if (conv.id) markRead.mutate(conv.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.id, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const memberMap = useMemo(() => new Map(conv.members.map((m) => [m.user_id, m])), [conv.members]);

  const canSend =
    conv.conv_type !== "broadcast" || conv.members.find((m) => m.user_id === user?.id)?.member_role === "admin";

  const handleSend = async () => {
    if (!input.trim()) return;
    try {
      await sendMsg.mutateAsync({ conversationId: conv.id, body: input });
      setInput("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar");
    }
  };

  return (
    <>
      <header className="h-14 border-b px-2 md:px-4 flex items-center gap-2 shrink-0">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8 shrink-0"
            onClick={onBack}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{conv.display_title}</p>
            {conv.workspace_name && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal shrink-0">
                {conv.workspace_name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {conv.conv_type === "dm" && "Mensagem direta"}
            {conv.conv_type === "group" && `${conv.members.length} membros`}
            {conv.conv_type === "broadcast" && "Anúncio para toda a plataforma"}
          </p>
        </div>
      </header>

      <ScrollArea className="flex-1" ref={scrollRef as any}>
        <div className="p-4 space-y-3">
          {isLoading && (
            <div className="text-sm text-muted-foreground text-center py-8">A carregar…</div>
          )}
          {!isLoading && messages.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              Diga olá 👋
            </div>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            const sender = memberMap.get(m.sender_id);
            return (
              <div key={m.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine && (
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={sender?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {initials(sender?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-3 py-2 text-sm break-words",
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm",
                  )}
                >
                  {!mine && conv.conv_type !== "dm" && (
                    <p className="text-[11px] font-semibold opacity-80 mb-0.5">
                      {sender?.full_name || "Utilizador"}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  <p className={cn("text-[10px] mt-1", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {formatDistanceToNow(new Date(m.created_at), { locale: pt, addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t p-3 shrink-0 bg-background pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {canSend ? (
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"
              className="min-h-[44px] max-h-32 resize-none"
              maxLength={5000}
            />
            <Button onClick={handleSend} disabled={!input.trim() || sendMsg.isPending} size="icon">
              {sendMsg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            Apenas o autor do anúncio pode enviar mensagens neste canal.
          </p>
        )}
      </div>
    </>
  );
}

function NewConversationButton({
  workspaceId,
  isSuperAdmin,
}: {
  workspaceId: string | null;
  isSuperAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { data: teammates = [] } = useWorkspaceTeammates(workspaceId, isSuperAdmin);
  const startDM = useStartDM();
  const createGroup = useCreateGroup();
  const createBroadcast = useCreateBroadcast();
  const [, setSearchParams] = useSearchParams();
  const [groupTitle, setGroupTitle] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(100);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");

  // Lista filtrada (usada também pelo handler de teclado)
  const dmTokens = useMemo(
    () => search.toLowerCase().trim().split(/\s+/).filter(Boolean),
    [search],
  );
  const dmFiltered = useMemo(() => {
    return (teammates as any[]).filter((t) => {
      if (dmTokens.length === 0) return true;
      const hay = `${t.full_name ?? ""} ${t.email ?? ""} ${t.workspaces ?? ""}`.toLowerCase();
      return dmTokens.every((tk) => hay.includes(tk));
    });
  }, [teammates, dmTokens]);
  const dmVisible = useMemo(
    () => dmFiltered.slice(0, visibleCount),
    [dmFiltered, visibleCount],
  );

  // Reset selecção e paginação sempre que muda a pesquisa
  useEffect(() => {
    setActiveIndex(0);
    setVisibleCount(100);
  }, [search]);

  const close = () => {
    setOpen(false);
    setGroupTitle("");
    setGroupMembers([]);
    setBroadcastTitle("");
    setBroadcastBody("");
  };

  const handleStartDM = async (userId: string) => {
    try {
      const id = await startDM.mutateAsync(userId);
      setSearchParams({ c: id });
      close();
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar conversa");
    }
  };

  const handleCreateGroup = async () => {
    if (!workspaceId) return toast.error("Sem workspace");
    if (groupTitle.trim().length < 2) return toast.error("Nome do grupo demasiado curto");
    if (groupMembers.length === 0) return toast.error("Adicione pelo menos um membro");
    try {
      const id = await createGroup.mutateAsync({
        workspaceId,
        title: groupTitle.trim(),
        memberIds: groupMembers,
      });
      setSearchParams({ c: id });
      toast.success("Grupo criado");
      close();
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar grupo");
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastBody.trim()) return toast.error("Mensagem vazia");
    try {
      await createBroadcast.mutateAsync({ title: broadcastTitle, body: broadcastBody });
      toast.success("Anúncio enviado a todos os utilizadores");
      close();
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar anúncio");
    }
  };

  const toggleMember = (id: string) => {
    setGroupMembers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7" title="Nova conversa">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
          <DialogDescription>Direta, em grupo ou anúncio.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="dm">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: isSuperAdmin ? "1fr 1fr 1fr" : "1fr 1fr" }}>
            <TabsTrigger value="dm">Direta</TabsTrigger>
            <TabsTrigger value="group">Grupo</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="broadcast">Anúncio</TabsTrigger>}
          </TabsList>

          <TabsContent value="dm" className="mt-4">
            <Input
              placeholder={
                isSuperAdmin
                  ? "Pesquisar por nome, email ou workspace…"
                  : "Pesquisar colega…"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (dmVisible.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((i) => (i + 1) % dmVisible.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((i) => (i - 1 + dmVisible.length) % dmVisible.length);
                } else if (e.key === "Home") {
                  e.preventDefault();
                  setActiveIndex(0);
                } else if (e.key === "End") {
                  e.preventDefault();
                  setActiveIndex(dmVisible.length - 1);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const target = dmVisible[activeIndex];
                  if (target) handleStartDM(target.user_id);
                }
              }}
              className="mb-2"
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls="dm-results"
              aria-activedescendant={dmVisible[activeIndex] ? `dm-opt-${dmVisible[activeIndex].user_id}` : undefined}
            />
            {isSuperAdmin && (
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-[11px] text-muted-foreground">
                  🛡️ Super admin · pesquisa entre <strong>{teammates.length}</strong> utilizadores
                </p>
                {dmTokens.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {dmFiltered.length} resultados · ↑↓ Enter
                  </span>
                )}
              </div>
            )}
            <ScrollArea className="max-h-72">
              {teammates.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  {isSuperAdmin ? "Sem utilizadores." : "Sem outros membros no workspace."}
                </p>
              ) : dmFiltered.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  Nenhum utilizador corresponde a "{search}".
                </p>
              ) : (
                <ul className="space-y-1" id="dm-results" role="listbox">
                  {dmVisible.map((t: any, idx: number) => {
                    const active = idx === activeIndex;
                    return (
                      <li key={t.user_id}>
                        <button
                          id={`dm-opt-${t.user_id}`}
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => handleStartDM(t.user_id)}
                          ref={(el) => {
                            if (active && el) el.scrollIntoView({ block: "nearest" });
                          }}
                          className={cn(
                            "w-full flex items-start gap-3 p-2 rounded text-left transition-colors",
                            active ? "bg-accent" : "hover:bg-muted",
                          )}
                        >
                          <Avatar className="h-8 w-8 mt-0.5">
                            <AvatarImage src={t.avatar_url ?? undefined} />
                            <AvatarFallback>{initials(t.full_name, t.email)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {highlight(t.full_name || t.email || "—", dmTokens)}
                            </p>
                            {t.full_name && (
                              <p className="text-xs text-muted-foreground truncate">
                                {highlight(t.email ?? "", dmTokens)}
                              </p>
                            )}
                            {t.workspaces && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {String(t.workspaces)
                                  .split(",")
                                  .map((w: string) => w.trim())
                                  .filter(Boolean)
                                  .map((w: string) => (
                                    <Badge
                                      key={w}
                                      variant="outline"
                                      className="h-4 px-1.5 text-[9px] font-normal"
                                    >
                                      {highlight(w, dmTokens)}
                                    </Badge>
                                  ))}
                              </div>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                  {dmFiltered.length > visibleCount && (
                    <li className="py-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setVisibleCount((n) => n + 100)}
                      >
                        Carregar mais ({Math.min(100, dmFiltered.length - visibleCount)} de {dmFiltered.length - visibleCount} restantes)
                      </Button>
                    </li>
                  )}
                  {visibleCount > 100 && dmFiltered.length <= visibleCount && (
                    <li className="text-[11px] text-muted-foreground text-center py-2">
                      Fim da lista · {dmFiltered.length} utilizadores
                    </li>
                  )}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>


          <TabsContent value="group" className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="grp-title">Nome do grupo</Label>
              <Input id="grp-title" value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label>Membros</Label>
              <ScrollArea className="max-h-48 border rounded p-2">
                {teammates.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Sem membros disponíveis.</p>
                ) : (
                  teammates.map((t: any) => (
                    <label key={t.user_id} className="flex items-center gap-2 py-1 cursor-pointer">
                      <Checkbox
                        checked={groupMembers.includes(t.user_id)}
                        onCheckedChange={() => toggleMember(t.user_id)}
                      />
                      <span className="text-sm">{t.full_name || t.email}</span>
                    </label>
                  ))
                )}
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateGroup} disabled={createGroup.isPending}>
                {createGroup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar grupo
              </Button>
            </DialogFooter>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="broadcast" className="mt-4 space-y-3">
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Esta mensagem aparece como pop-up em todos os utilizadores autenticados.
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bc-title">Título (opcional)</Label>
                <Input id="bc-title" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bc-body">Mensagem</Label>
                <Textarea id="bc-body" value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)} rows={5} maxLength={2000} />
              </div>
              <DialogFooter>
                <Button onClick={handleBroadcast} disabled={createBroadcast.isPending} variant="default">
                  {createBroadcast.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Enviar a todos
                </Button>
              </DialogFooter>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
