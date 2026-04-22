import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, Mail, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PitchSlideCanvas } from '@/components/pitch/PitchSlideCanvas';
import { PITCH_SLIDES } from '@/components/pitch/slides';
import type { PitchTokens } from '@/lib/pitch/tokens';

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;

interface ShareData {
  id: string;
  token: string;
  contactName: string | null;
  companyName: string | null;
  tokens: PitchTokens;
  totalSlides: number;
  agent?: {
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
}

type Status = 'loading' | 'gate' | 'viewing' | 'expired' | 'revoked' | 'not_found' | 'error';

function storageKey(token: string) {
  return `pitch-share-viewer.${token}`;
}

export default function PitchPublicView() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [share, setShare] = useState<ShareData | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [index, setIndex] = useState(0);
  const [showThanks, setShowThanks] = useState(false);

  const slideSecondsRef = useRef<Record<number, number>>({});
  const currentSlideStartRef = useRef<number>(Date.now());
  const totalSecondsRef = useRef<number>(0);
  const startedAtRef = useRef<number>(Date.now());
  const maxSlideRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!token) return;
    document.title = 'Apresentação';
    (async () => {
      try {
        const res = await fetch(`${FN_URL}/pitch-share-get?token=${encodeURIComponent(token)}`);
        if (res.status === 404) return setStatus('not_found');
        if (res.status === 410) {
          const j = await res.json().catch(() => ({}));
          return setStatus(j.error === 'revoked' ? 'revoked' : 'expired');
        }
        if (!res.ok) return setStatus('error');
        const data = (await res.json()) as ShareData;
        setShare(data);

        try {
          const stored = localStorage.getItem(storageKey(token));
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.viewId && parsed?.email) {
              setViewId(parsed.viewId);
              setEmail(parsed.email);
              setName(parsed.name || '');
              setStatus('viewing');
              return;
            }
          }
        } catch { /* ignore */ }
        setStatus('gate');
      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    })();
  }, [token]);

  const submitGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${FN_URL}/pitch-share-start-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email: email.trim(), name: name.trim() || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === 'invalid_email') alert('Email inválido.');
        else if (j.error === 'expired') setStatus('expired');
        else if (j.error === 'revoked') setStatus('revoked');
        else alert('Não foi possível iniciar. Tenta novamente.');
        setSubmitting(false);
        return;
      }
      const data = await res.json();
      setViewId(data.viewId);
      try {
        localStorage.setItem(
          storageKey(token),
          JSON.stringify({ viewId: data.viewId, email: email.trim(), name: name.trim() })
        );
      } catch { /* ignore */ }
      startedAtRef.current = Date.now();
      currentSlideStartRef.current = Date.now();
      setStatus('viewing');
    } catch (e) {
      console.error(e);
      alert('Erro de ligação. Tenta novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const accumulateCurrent = () => {
    const now = Date.now();
    const delta = Math.floor((now - currentSlideStartRef.current) / 1000);
    if (delta > 0) {
      slideSecondsRef.current[index] = (slideSecondsRef.current[index] ?? 0) + delta;
    }
    currentSlideStartRef.current = now;
  };

  const goTo = (next: number) => {
    accumulateCurrent();
    if (next > maxSlideRef.current) maxSlideRef.current = next;
    if (share && next >= share.totalSlides - 1) completedRef.current = true;
    setIndex(next);
  };

  const handleNext = () => {
    if (!share) return;
    if (index >= share.totalSlides - 1) {
      completedRef.current = true;
      maxSlideRef.current = share.totalSlides - 1;
      setShowThanks(true);
      return;
    }
    goTo(index + 1);
  };

  useEffect(() => {
    if (status !== 'viewing' || !share) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (showThanks) setShowThanks(false);
        else if (index > 0) goTo(index - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, index, share, showThanks]);

  useEffect(() => {
    if (status !== 'viewing' || !viewId) return;

    const flush = async (final = false) => {
      accumulateCurrent();
      totalSecondsRef.current = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const slidesSeen = Object.entries(slideSecondsRef.current)
        .map(([k, v]) => ({
          index: Number(k),
          id: PITCH_SLIDES[Number(k)]?.id,
          seconds: v,
        }))
        .filter((s) => s.seconds > 0);

      const payload = {
        viewId,
        slidesSeen,
        totalSeconds: totalSecondsRef.current,
        maxSlideIndex: maxSlideRef.current,
        completed: completedRef.current || final,
      };

      try {
        if (final && 'sendBeacon' in navigator) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(`${FN_URL}/pitch-share-track`, blob);
        } else {
          await fetch(`${FN_URL}/pitch-share-track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      } catch { /* ignore */ }
    };

    const interval = setInterval(() => flush(false), 10000);
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush(false);
    };
    const onUnload = () => flush(true);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
      flush(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, viewId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'not_found' || status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-10 max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-3">Apresentação indisponível</h1>
          <p className="text-muted-foreground">O link que tentaste abrir não existe ou foi removido.</p>
        </Card>
      </div>
    );
  }

  if (status === 'expired' || status === 'revoked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-10 max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-3">
            {status === 'expired' ? 'Link expirado' : 'Link desativado'}
          </h1>
          <p className="text-muted-foreground">
            {status === 'expired'
              ? 'Este link já passou da data limite. Pede um novo ao remetente.'
              : 'Este link foi desativado pelo remetente.'}
          </p>
        </Card>
      </div>
    );
  }

  if (status === 'gate' && share) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-center mb-2">
            Apresentação preparada para {share.contactName || 'ti'}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Antes de começar, indica o teu email para acederes à apresentação.
          </p>
          <form onSubmit={submitGate} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="O teu nome" maxLength={120} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@dominio.com"
                maxLength={255}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aceder à apresentação
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  if (status === 'viewing' && share) {
    if (showThanks) {
      const agent = share.agent;
      const initials = (agent?.name || share.contactName || 'A')
        .split(' ')
        .map((s) => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase();
      return (
        <div className="fixed inset-0 bg-background flex items-center justify-center p-6 overflow-auto">
          <Card className="max-w-xl w-full p-10 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-semibold mb-3">Obrigado{share.contactName ? `, ${share.contactName}` : ''}!</h1>
            <p className="text-muted-foreground mb-8">
              Esperamos que a apresentação tenha sido útil. Para qualquer questão ou próximos passos, fala diretamente com o teu contacto:
            </p>

            {agent && (agent.name || agent.email) && (
              <div className="border rounded-lg p-5 mb-6 text-left flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  {agent.avatarUrl && <AvatarImage src={agent.avatarUrl} alt={agent.name || ''} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {agent.name && <div className="font-medium truncate">{agent.name}</div>}
                  {share.companyName && <div className="text-sm text-muted-foreground truncate">{share.companyName}</div>}
                  <div className="mt-1 space-y-0.5 text-sm">
                    {agent.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <a href={`mailto:${agent.email}`} className="hover:text-primary truncate">{agent.email}</a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {agent?.email && (
              <Button asChild className="w-full">
                <a href={`mailto:${agent.email}?subject=${encodeURIComponent('Apresentação - próximos passos')}`}>
                  <Mail className="h-4 w-4 mr-2" /> Contactar por email
                </a>
              </Button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowThanks(false);
                goTo(0);
              }}
              className="mt-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Rever apresentação
            </button>
          </Card>
        </div>
      );
    }

    const Slide = PITCH_SLIDES[index]?.component;
    if (!Slide) return null;
    const total = share.totalSlides || PITCH_SLIDES.length;
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-full">
            <PitchSlideCanvas bare>
              <Slide tokens={share.tokens} pageNumber={index + 1} total={total} />
            </PitchSlideCanvas>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-6 py-3 bg-gradient-to-t from-black/70 to-transparent text-white">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <div className="text-sm font-mono opacity-70 select-none">
            {index + 1} / {total}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10"
            onClick={handleNext}
          >
            {index >= total - 1 ? 'Concluir' : 'Seguinte'} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
