import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  AlertTriangle,
  Archive,
  BellOff,
  Crown,
  Loader2,
  Megaphone,
  Pin,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CapabilityGuard } from "@/components/guards/CapabilityGuard";
import { useCapability } from "@/hooks/useCapability";
import {
  useWhatsAppZapiGroups,
  useWhatsAppGroupParticipants,
  useSyncWhatsAppZapiGroups,
  type WhatsAppZapiGroup,
} from "@/hooks/useWhatsAppZapi";
import { formatPhone } from "@/utils/phone";

type GroupFilter =
  | "all"
  | "admin"
  | "member"
  | "active"
  | "archived"
  | "muted"
  | "unread"
  | "announcement"
  | "community"
  | "sync_error";

const FILTER_OPTIONS: { value: GroupFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "admin", label: "Sou administrador" },
  { value: "member", label: "Sou membro" },
  { value: "active", label: "Ativos" },
  { value: "archived", label: "Arquivados" },
  { value: "muted", label: "Silenciados" },
  { value: "unread", label: "Com não lidas" },
  { value: "announcement", label: "Anúncios" },
  { value: "community", label: "Comunidades" },
  { value: "sync_error", label: "Erro de sincronização" },
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  LEFT: "Saiu",
  REMOVED: "Removido",
  SYNC_ERROR: "Erro sync",
  UNKNOWN: "Desconhecido",
};

const MEMBERSHIP_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  PENDING_APPROVAL: "Aguarda aprovação",
  INVITED: "Convidado",
  NOT_ADDED: "Não adicionado",
  REMOVED: "Removido",
  LEFT: "Saiu",
  REJECTED: "Rejeitado",
  UNKNOWN: "Desconhecido",
};

function matchesFilter(group: WhatsAppZapiGroup, filter: GroupFilter): boolean {
  switch (filter) {
    case "admin":
      return group.is_admin || group.is_owner;
    case "member":
      return !group.is_admin && !group.is_owner;
    case "active":
      return group.status === "ACTIVE";
    case "archived":
      return group.is_archived;
    case "muted":
      return group.is_muted;
    case "unread":
      return (group.unread_count ?? 0) > 0;
    case "announcement":
      return group.is_announcement;
    case "community":
      return group.is_community;
    case "sync_error":
      return group.status === "SYNC_ERROR" || !!group.sync_error;
    default:
      return true;
  }
}

function relative(value: string | null): string {
  if (!value) return "—";
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true, locale: pt });
  } catch {
    return "—";
  }
}

function GroupParticipantsTab({ groupId }: { groupId: string }) {
  const { data: participants, isLoading } = useWhatsAppGroupParticipants(groupId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!participants?.length) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sem participantes sincronizados. Execute uma sincronização.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Participante</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Mensagens</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {participants.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <div className="font-medium">
                {p.display_name || (p.normalized_phone ? formatPhone(p.normalized_phone) : p.participant_id_raw)}
              </div>
              <div className="text-xs text-muted-foreground">
                {p.normalized_phone ? formatPhone(p.normalized_phone) : "Identificador interno"}
                {(p.is_owner || p.is_admin) && (
                  <Badge variant="outline" className="ml-2">
                    {p.is_owner ? "Proprietário" : "Administrador"}
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={p.membership_status === "ACTIVE" ? "secondary" : "outline"}>
                {MEMBERSHIP_LABELS[p.membership_status] ?? p.membership_status}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">{p.messages_count ?? 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function WhatsAppGroupsContent() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GroupFilter>("all");
  const [selected, setSelected] = useState<WhatsAppZapiGroup | null>(null);

  const { data: groups, isLoading } = useWhatsAppZapiGroups();
  const syncGroups = useSyncWhatsAppZapiGroups();
  const canSync = useCapability("whatsapp_groups.sync");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (groups ?? []).filter((g) => {
      if (!matchesFilter(g, filter)) return false;
      if (!term) return true;
      return [g.name, g.group_id, g.description, g.category, ...(g.tags ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [groups, filter, search]);

  return (
    <div className="space-y-6 p-6">
      <Helmet>
        <title>Grupos WhatsApp | FastCRM</title>
        <meta
          name="description"
          content="Gestão profissional de grupos WhatsApp: sincronização, participantes e estado por instância."
        />
      </Helmet>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Grupos WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Grupos sincronizados por instância, com participantes e estado de sincronização.
          </p>
        </div>
        {canSync && (
          <Button onClick={() => syncGroups.mutate()} disabled={syncGroups.isPending}>
            {syncGroups.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizar grupos
          </Button>
        )}
      </header>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Lista de grupos</CardTitle>
              <CardDescription>{filtered.length} grupo(s)</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar nome, ID, categoria ou tag"
                  className="w-72 pl-8"
                  aria-label="Pesquisar grupos"
                />
              </div>
              <Select value={filter} onValueChange={(v) => setFilter(v as GroupFilter)}>
                <SelectTrigger className="w-56" aria-label="Filtrar grupos">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILTER_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhum grupo encontrado. Sincronize para importar os grupos da instância ligada.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead className="w-[120px]">Participantes</TableHead>
                  <TableHead className="w-[130px]">Função</TableHead>
                  <TableHead className="w-[120px]">Estado</TableHead>
                  <TableHead className="w-[160px]">Atividade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((g) => (
                  <TableRow
                    key={g.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(g)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setSelected(g);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={g.picture_url ?? undefined} alt={g.name ?? "Grupo"} />
                          <AvatarFallback>{(g.name ?? "G").slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-medium">
                            <span className="truncate">{g.name ?? g.group_id}</span>
                            {g.is_pinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
                            {g.is_muted && <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
                            {g.is_archived && <Archive className="h-3.5 w-3.5 text-muted-foreground" />}
                            {g.is_announcement && <Megaphone className="h-3.5 w-3.5 text-muted-foreground" />}
                            {g.sync_error && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{g.group_id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{g.participants_count ?? 0}</TableCell>
                    <TableCell>
                      {g.is_owner ? (
                        <Badge variant="secondary">
                          <Crown className="mr-1 h-3 w-3" /> Proprietário
                        </Badge>
                      ) : g.is_admin ? (
                        <Badge variant="secondary">Administrador</Badge>
                      ) : (
                        <Badge variant="outline">Membro</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={g.status === "ACTIVE" ? "secondary" : "outline"}>
                        {STATUS_LABELS[g.status] ?? g.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {relative(g.last_message_at)}
                      {(g.unread_count ?? 0) > 0 && (
                        <Badge className="ml-2">{g.unread_count}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name ?? selected.group_id}</SheetTitle>
                <SheetDescription>{selected.group_id}</SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="participants" className="mt-4">
                <TabsList>
                  <TabsTrigger value="participants">Participantes</TabsTrigger>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                </TabsList>

                <TabsContent value="participants" className="mt-4">
                  <GroupParticipantsTab groupId={selected.id} />
                </TabsContent>

                <TabsContent value="details" className="mt-4 space-y-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Descrição</div>
                    <div>{selected.description || "—"}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-muted-foreground">Categoria</div>
                      <div>{selected.category || "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Estado</div>
                      <div>{STATUS_LABELS[selected.status] ?? selected.status}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Participantes</div>
                      <div>{selected.participants_count ?? 0}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Última sincronização</div>
                      <div>{relative(selected.last_synced_at)}</div>
                    </div>
                  </div>
                  {selected.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selected.tags.map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {selected.sync_error && (
                    <p className="rounded-md bg-destructive/10 p-3 text-destructive">
                      {selected.sync_error}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function WhatsAppGroupsPage() {
  return (
    <CapabilityGuard need="whatsapp_groups.view">
      <WhatsAppGroupsContent />
    </CapabilityGuard>
  );
}
