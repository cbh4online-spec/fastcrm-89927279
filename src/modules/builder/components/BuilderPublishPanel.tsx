import { useMemo, useState } from "react";
import { Globe, Rocket, RotateCcw, Trash2, ExternalLink, Check, AlertCircle, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  useBuilderPublications,
  usePublishBuilderAsset,
  useBuilderAssetDomains,
  useAddBuilderAssetDomain,
  useDeleteBuilderAssetDomain,
} from "@/modules/builder/hooks/useBuilderPublications";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assetId: string;
  workspaceId: string;
  slug: string;
  currentHtml: string;
  isDirty: boolean;
}

export function BuilderPublishPanel({
  open,
  onOpenChange,
  assetId,
  workspaceId,
  slug,
  currentHtml,
  isDirty,
}: Props) {
  const { data: publications = [], isLoading } = useBuilderPublications(assetId);
  const { data: domains = [] } = useBuilderAssetDomains(assetId);
  const publish = usePublishBuilderAsset();
  const addDomain = useAddBuilderAssetDomain();
  const deleteDomain = useDeleteBuilderAssetDomain();

  const [notes, setNotes] = useState("");
  const [newHostname, setNewHostname] = useState("");
  const [newPath, setNewPath] = useState("/");
  const [rollbackTarget, setRollbackTarget] = useState<typeof publications[number] | null>(null);

  const activePub = useMemo(() => publications.find((p) => p.is_active), [publications]);

  const publicUrl = useMemo(() => {
    const base = window.location.origin;
    return `${base}/p/${slug}`;
  }, [slug]);

  const handlePublish = async () => {
    try {
      await publish.mutateAsync({
        assetId,
        html: currentHtml,
        notes: notes.trim() || undefined,
      });
      setNotes("");
      toast.success("Publicado com sucesso");
    } catch (err) {
      toast.error("Erro ao publicar", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    try {
      await publish.mutateAsync({
        assetId,
        html: rollbackTarget.html,
        notes: `Rollback para publicação #${rollbackTarget.publication_number}`,
        isRollback: true,
        rolledBackFrom: rollbackTarget.id,
      });
      toast.success(`Rollback para v${rollbackTarget.publication_number} concluído`);
      setRollbackTarget(null);
    } catch (err) {
      toast.error("Erro no rollback", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleAddDomain = async () => {
    const host = newHostname.trim().toLowerCase();
    if (!host) return;
    try {
      await addDomain.mutateAsync({
        assetId,
        workspaceId,
        hostname: host,
        pathPrefix: newPath.trim() || "/",
      });
      setNewHostname("");
      setNewPath("/");
      toast.success("Domínio adicionado", {
        description: "Configura o DNS e verifica para ativar.",
      });
    } catch (err) {
      toast.error("Erro ao adicionar domínio", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiado");
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4" /> Publicação
            </SheetTitle>
            <SheetDescription>
              Publica a versão atual ou faz rollback. Cada publicação é guardada como snapshot.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-6">
              {/* URL pública canónica */}
              <section className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  URL pública
                </Label>
                <div className="flex items-center gap-2">
                  <Input value={publicUrl} readOnly className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={() => copyUrl(publicUrl)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" asChild>
                    <a href={publicUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
                {!activePub && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    Ainda não publicado — publica abaixo para ativar este URL.
                  </p>
                )}
              </section>

              <Separator />

              {/* Publicar nova versão */}
              <section className="space-y-3">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Nova publicação
                </Label>
                {isDirty && (
                  <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 p-2 bg-amber-500/10 rounded-md border border-amber-500/30">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Existem alterações por guardar — aguarda o autosave antes de publicar.</span>
                  </div>
                )}
                <Textarea
                  placeholder="Notas desta publicação (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
                <Button
                  className="w-full"
                  onClick={handlePublish}
                  disabled={publish.isPending || isDirty}
                >
                  {publish.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> A publicar…
                    </>
                  ) : (
                    <>
                      <Rocket className="h-3.5 w-3.5 mr-2" /> Publicar versão atual
                    </>
                  )}
                </Button>
              </section>

              <Separator />

              {/* Domínios */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Globe className="h-3 w-3" /> Domínios próprios
                  </Label>
                </div>

                {domains.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum domínio configurado. Adiciona um para servir este conteúdo num host próprio.
                  </p>
                )}

                <ul className="space-y-2">
                  {domains.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-2 p-2 border rounded-md bg-card"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono truncate">
                            {d.hostname}
                            {d.path_prefix !== "/" ? d.path_prefix : ""}
                          </span>
                          {d.verified ? (
                            <Badge variant="secondary" className="h-5 text-[10px]">
                              <Check className="h-2.5 w-2.5 mr-1" /> Verificado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 text-[10px]">
                              Por verificar
                            </Badge>
                          )}
                        </div>
                        {!d.verified && (
                          <code className="text-[10px] text-muted-foreground break-all">
                            TXT _lovable_builder = {d.verification_token}
                          </code>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => deleteDomain.mutate({ id: d.id, assetId })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2">
                  <Input
                    placeholder="dominio.exemplo.com"
                    value={newHostname}
                    onChange={(e) => setNewHostname(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="/"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    className="w-20"
                  />
                  <Button
                    onClick={handleAddDomain}
                    disabled={addDomain.isPending || !newHostname.trim()}
                  >
                    Adicionar
                  </Button>
                </div>
              </section>

              <Separator />

              {/* Histórico */}
              <section className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Histórico ({publications.length})
                </Label>
                {isLoading && (
                  <p className="text-xs text-muted-foreground">A carregar…</p>
                )}
                {!isLoading && publications.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Sem publicações ainda.
                  </p>
                )}
                <ul className="space-y-2">
                  {publications.map((p) => (
                    <li
                      key={p.id}
                      className="p-3 border rounded-md bg-card flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">#{p.publication_number}</span>
                          {p.is_active && (
                            <Badge variant="default" className="h-5 text-[10px]">Ativa</Badge>
                          )}
                          {p.is_rollback && (
                            <Badge variant="outline" className="h-5 text-[10px]">Rollback</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(p.published_at), {
                              addSuffix: true,
                              locale: pt,
                            })}
                          </span>
                        </div>
                        {p.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {p.notes}
                          </p>
                        )}
                      </div>
                      {!p.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRollbackTarget(p)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1.5" />
                          Restaurar
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!rollbackTarget} onOpenChange={(v) => !v && setRollbackTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar publicação #{rollbackTarget?.publication_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Será criada uma nova publicação com o snapshot desta versão. A publicação atual será
              desativada. O conteúdo público muda de imediato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback}>
              Confirmar rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
