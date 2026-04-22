import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Link2, Loader2, Eye, Ban, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { usePitchShares } from '@/hooks/usePitchShares';
import { PITCH_SLIDES } from './slides';
import type { PitchTokens } from '@/lib/pitch/tokens';
import { getPitchPublicUrl } from '@/lib/pitch/publicUrl';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tokens: PitchTokens;
}

const EXPIRATION_OPTIONS = [
  { label: '24 horas', days: 1 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: 'Sem expiração', days: 0 },
];

function publicUrl(token: string) {
  return getPitchPublicUrl(token);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}

export function SharePitchModal({ open, onOpenChange, tokens }: Props) {
  const { shares, loading, createShare, revokeShare, deleteShare, refresh } = usePitchShares();
  const [expirationDays, setExpirationDays] = useState<number>(7);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const slideTitles = useMemo(() => PITCH_SLIDES.map((s) => s.title), []);

  const handleCreate = async () => {
    if (!(tokens as any).companyName?.trim?.()) {
      toast.error('Indica o nome da empresa antes de criar o link.');
      return;
    }
    setCreating(true);
    try {
      const expiresAt = expirationDays > 0
        ? new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
      const created = await createShare({
        tokens,
        slideTitles,
        totalSlides: PITCH_SLIDES.length,
        expiresAt,
      });
      const url = publicUrl(created.token);
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link criado e copiado para a área de transferência.');
      } catch {
        toast.success('Link criado.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Não foi possível criar o link.');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(publicUrl(token));
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Desativar este link? Quem tiver o URL deixa de conseguir abrir.')) return;
    try {
      await revokeShare(id);
      toast.success('Link desativado.');
    } catch {
      toast.error('Erro ao desativar.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apagar este link e todo o histórico de visualizações? Esta ação é permanente.')) return;
    try {
      await deleteShare(id);
      toast.success('Link e histórico removidos.');
    } catch {
      toast.error('Erro ao apagar.');
    }
  };

  const status = (s: typeof shares[number]) => {
    if (s.revoked_at) return <Badge variant="secondary">Desativado</Badge>;
    if (s.expires_at && new Date(s.expires_at) < new Date()) return <Badge variant="secondary">Expirado</Badge>;
    return <Badge>Ativo</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Partilhar apresentação
          </DialogTitle>
          <DialogDescription>
            Cria um link público para enviares ao cliente. Cada visitante introduz o email para aceder e o tempo passado em cada slide é registado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
            <div className="text-sm font-medium">Novo link para {(tokens as any).companyName || '— sem empresa —'}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Validade</Label>
                <Select value={String(expirationDays)} onValueChange={(v) => setExpirationDays(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPIRATION_OPTIONS.map((o) => (
                      <SelectItem key={o.days} value={String(o.days)}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                  Gerar link de partilha
                </Button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Links existentes</div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/pitch/shares">
                  Ver dashboard completo <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="border rounded-lg max-h-[360px] overflow-auto divide-y">
              {loading && (
                <div className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> A carregar…
                </div>
              )}
              {!loading && shares.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Ainda não criaste nenhum link.
                </div>
              )}
              {shares.map((s) => (
                <div key={s.id} className="p-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {s.company_name || '— sem empresa —'}
                      {s.contact_name && <span className="text-muted-foreground font-normal"> · {s.contact_name}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      <span>Criado: {formatDate(s.created_at)}</span>
                      <span>Expira: {formatDate(s.expires_at)}</span>
                      <span>Última vista: {formatDate(s.last_viewed_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-3 w-3" /> {s.view_count} ({s.unique_viewers_count} únicos)
                      </div>
                      <div className="mt-0.5">{status(s)}</div>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => copyLink(s.token)} title="Copiar link">
                      <Copy className="h-4 w-4" />
                    </Button>
                    {!s.revoked_at && (
                      <Button variant="outline" size="icon" onClick={() => handleRevoke(s.id)} title="Desativar">
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="icon" onClick={() => handleDelete(s.id)} title="Apagar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
