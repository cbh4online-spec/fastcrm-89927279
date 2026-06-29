import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OwnerOnlyRoute } from '@/components/auth/OwnerOnlyRoute';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, Copy, Ban, ArrowLeft, Smartphone, Monitor, Tablet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePitchShares, useShareViews, type PitchShareRow } from '@/hooks/usePitchShares';
import { PITCH_SLIDES } from '@/components/pitch/slides';
import { getPitchPublicUrl } from '@/lib/pitch/publicUrl';

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
}
function fmtSeconds(s: number) {
  if (!s) return '0s';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}
function deviceIcon(d: string | null) {
  if (d === 'mobile') return <Smartphone className="h-3.5 w-3.5" />;
  if (d === 'tablet') return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

export default function PitchSharesPage() {
  const { shares, loading, revokeShare } = usePitchShares();
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);
  const selected = useMemo(() => shares.find((s) => s.id === selectedShareId) || null, [shares, selectedShareId]);
  const { views, loading: viewsLoading } = useShareViews(selectedShareId);
  const [openViewId, setOpenViewId] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Partilhas — Apresentação';
  }, []);

  const totals = useMemo(() => {
    const totalShares = shares.length;
    const active = shares.filter((s) => !s.revoked_at && (!s.expires_at || new Date(s.expires_at) > new Date())).length;
    const totalViews = shares.reduce((acc, s) => acc + (s.view_count ?? 0), 0);
    const uniqueViewers = shares.reduce((acc, s) => acc + (s.unique_viewers_count ?? 0), 0);
    return { totalShares, active, totalViews, uniqueViewers };
  }, [shares]);

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(getPitchPublicUrl(token));
      toast.success('Link copiado.');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Desativar este link?')) return;
    try {
      await revokeShare(id);
      toast.success('Link desativado.');
    } catch {
      toast.error('Erro.');
    }
  };

  const status = (s: PitchShareRow) => {
    if (s.revoked_at) return <Badge variant="secondary">Desativado</Badge>;
    if (s.expires_at && new Date(s.expires_at) < new Date()) return <Badge variant="secondary">Expirado</Badge>;
    return <Badge>Ativo</Badge>;
  };

  return (
    <DashboardLayout>
      <OwnerOnlyRoute>
    <div className="min-h-full bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2">
              <Link to="/dashboard/pitch"><ChevronLeft className="h-4 w-4 mr-1" /> Voltar à apresentação</Link>
            </Button>
            <h1 className="text-2xl font-semibold">Partilhas da apresentação</h1>
            <p className="text-sm text-muted-foreground">Acompanha quem abriu, quanto tempo viu e onde saiu.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Total de links</div><div className="text-2xl font-semibold">{totals.totalShares}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Ativos</div><div className="text-2xl font-semibold">{totals.active}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Visualizações</div><div className="text-2xl font-semibold">{totals.totalViews}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Visitantes únicos</div><div className="text-2xl font-semibold">{totals.uniqueViewers}</div></Card>
        </div>

        {!selectedShareId && (
          <Card>
            <div className="p-4 border-b font-medium">Links</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa / Contacto</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Vistas</TableHead>
                  <TableHead className="text-right">Únicos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> A carregar…</TableCell></TableRow>
                )}
                {!loading && shares.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sem links criados.</TableCell></TableRow>
                )}
                {shares.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedShareId(s.id)}>
                    <TableCell>
                      <div className="font-medium">{s.company_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{s.contact_name || '—'}</div>
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(s.created_at)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(s.expires_at)}</TableCell>
                    <TableCell>{status(s)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.view_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.unique_viewers_count}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => copyLink(s.token)} title="Copiar"><Copy className="h-4 w-4" /></Button>
                      {!s.revoked_at && (
                        <Button variant="ghost" size="icon" onClick={() => handleRevoke(s.id)} title="Desativar"><Ban className="h-4 w-4" /></Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {selectedShareId && selected && (
          <>
            <Button variant="outline" size="sm" onClick={() => { setSelectedShareId(null); setOpenViewId(null); }}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar à lista
            </Button>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold">{selected.company_name || '—'}</div>
                  <div className="text-sm text-muted-foreground">{selected.contact_name || '—'}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Criado em {fmtDate(selected.created_at)} · Expira {fmtDate(selected.expires_at)} · {status(selected)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyLink(selected.token)}>
                    <Copy className="h-4 w-4 mr-1" /> Copiar link
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4 border-b font-medium flex items-center justify-between">
                <span>Sessões de visualização</span>
                <span className="text-xs text-muted-foreground">{views.length} sessões</span>
              </div>
              {viewsLoading && (
                <div className="p-8 text-center"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> A carregar…</div>
              )}
              {!viewsLoading && views.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">Ninguém abriu este link ainda.</div>
              )}
              {!viewsLoading && views.length > 0 && (
                <div className="divide-y">
                  {views.map((v) => {
                    const open = openViewId === v.id;
                    const completionPct = selected.total_slides > 0
                      ? Math.round(((v.max_slide_index + 1) / selected.total_slides) * 100)
                      : 0;
                    return (
                      <div key={v.id}>
                        <button
                          onClick={() => setOpenViewId(open ? null : v.id)}
                          className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/40 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate flex items-center gap-2">
                              {v.viewer_email}
                              {v.viewer_name && <span className="text-xs text-muted-foreground font-normal">· {v.viewer_name}</span>}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                              <span className="flex items-center gap-1">{deviceIcon(v.device_type)} {v.device_type || '—'}</span>
                              <span>Início: {fmtDate(v.started_at)}</span>
                              <span>Última atividade: {fmtDate(v.last_activity_at)}</span>
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-mono">{fmtSeconds(v.total_seconds)}</div>
                            <div className="text-xs text-muted-foreground">
                              Slide {v.max_slide_index + 1}/{selected.total_slides} · {completionPct}%
                              {v.completed && <Badge variant="secondary" className="ml-2">Completou</Badge>}
                            </div>
                          </div>
                        </button>
                        {open && (
                          <div className="bg-muted/30 px-6 py-4 border-t">
                            <div className="text-xs font-medium mb-2 text-muted-foreground">Tempo por slide</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {PITCH_SLIDES.map((s, idx) => {
                                const seen = v.slides_seen?.find((x) => x.index === idx);
                                const seconds = seen?.seconds ?? 0;
                                const isMax = seconds > 0 && seconds === Math.max(...(v.slides_seen?.map((x) => x.seconds) || [0]));
                                return (
                                  <div
                                    key={s.id}
                                    className={`text-xs p-2 rounded border ${seconds > 0 ? 'bg-card' : 'opacity-40'} ${isMax ? 'border-primary' : 'border-border'}`}
                                  >
                                    <div className="font-medium truncate">{idx + 1}. {s.title}</div>
                                    <div className="font-mono text-muted-foreground">{fmtSeconds(seconds)}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
      </OwnerOnlyRoute>
    </DashboardLayout>
  );
}
