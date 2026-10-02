import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

const SPAM_WORDS = ['grátis', 'gratis', 'urgente', '100%', 'ganhe', 'clique já', '!!!', 'oferta imperdível'];

/** Auditoria determinística de conformidade do rodapé (sem IA). */
export function auditFooter(footer: string) {
  const f = footer.toLowerCase();
  return [
    { label: 'Identificação do remetente', ok: footer.trim().length >= 20 },
    { label: 'NIF indicado', ok: /\b\d{9}\b/.test(footer) },
    { label: 'Morada / sede', ok: /(rua|av\.|avenida|praça|largo|\d{4}-\d{3})/i.test(footer) },
    { label: 'Motivo de receção explicado', ok: /(recebe|subscre|consent|cliente|solicitou)/i.test(f) },
    { label: 'Sem termos de spam', ok: !SPAM_WORDS.some((w) => f.includes(w)) },
    { label: 'Link de cancelamento (automático)', ok: true },
  ];
}

export function FooterAudit({ footer }: { footer: string }) {
  const items = auditFooter(footer);
  const score = items.filter((i) => i.ok).length;
  const level = score === items.length ? 'Excelente' : score >= 4 ? 'A melhorar' : 'Incompleto';
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Verificação de conformidade</span>
        <span className={score === items.length ? 'text-primary font-medium' : 'text-muted-foreground'}>
          {level} · {score}/{items.length}
        </span>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2 text-xs">
            {i.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
            <span className={i.ok ? 'text-foreground' : 'text-muted-foreground'}>{i.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TEMPLATES: Record<string, string> = {
  b2b_servicos: '[Empresa], Lda · NIF [NIF] · [Morada]\nRecebe este email porque é nosso cliente ou pediu informações sobre os nossos serviços.',
  clinica_bem_estar: '[Empresa] · NIF [NIF] · [Morada]\nRecebe esta comunicação porque autorizou o contacto da nossa equipa. Cuidamos dos seus dados com total confidencialidade.',
  ecommerce: '[Loja] · NIF [NIF] · [Morada]\nRecebe as nossas novidades porque se registou na loja ou fez uma compra connosco.',
  associacao: '[Associação] · NIF [NIF] · [Morada]\nRecebe este email por ser associado ou ter subscrito as nossas comunicações.',
};

interface Props {
  current: string;
  onApply: (footer: string) => void;
}

export function FooterAIAssistant({ current, onApply }: Props) {
  const { currentWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ tone: 'formal', sector: 'geral', company: '', nif: '', address: '', reason: '' });
  const [result, setResult] = useState<{ footer: string; unsubscribe_text: string; tips: string[] } | null>(null);

  const generate = async () => {
    if (!currentWorkspace?.id) return void toast.error('Workspace não selecionado');
    setLoading(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke('marketing-footer-ai', {
      body: { ...form, workspace_id: currentWorkspace.id, current },
    });
    setLoading(false);
    if (error || data?.error) return void toast.error(data?.error || 'Não foi possível gerar a sugestão');
    setResult(data);
  };

  const apply = () => {
    if (!result) return;
    onApply([result.footer, result.unsubscribe_text].filter(Boolean).join('\n'));
    setOpen(false);
    toast.success('Rodapé aplicado — lembre-se de guardar as definições');
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Sparkles className="h-4 w-4 mr-2" /> Gerar com IA
        </Button>
        <Select onValueChange={(v) => onApply(TEMPLATES[v])}>
          <SelectTrigger className="h-9 w-[220px]" aria-label="Modelo rápido por setor">
            <SelectValue placeholder="Modelo rápido por setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="b2b_servicos">B2B / Serviços</SelectItem>
            <SelectItem value="clinica_bem_estar">Clínica & Bem-estar</SelectItem>
            <SelectItem value="ecommerce">E-commerce</SelectItem>
            <SelectItem value="associacao">Associação / Clube</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assistente de rodapé</DialogTitle>
            <DialogDescription>A IA cria um rodapé legal e uma frase de cancelamento cordial. Reveja antes de aplicar.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Tom</Label>
                <Select value={form.tone} onValueChange={(tone) => setForm({ ...form, tone })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Corporativo</SelectItem>
                    <SelectItem value="friendly">Próximo</SelectItem>
                    <SelectItem value="minimal">Minimalista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Setor</Label>
                <Select value={form.sector} onValueChange={(sector) => setForm({ ...form, sector })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="b2b_servicos">B2B / Serviços</SelectItem>
                    <SelectItem value="clinica_bem_estar">Clínica & Bem-estar</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="associacao">Associação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ai-company">Nome da empresa</Label>
              <Input id="ai-company" maxLength={120} placeholder={currentWorkspace?.name} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ai-nif">NIF</Label>
                <Input id="ai-nif" maxLength={20} value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ai-address">Morada</Label>
                <Input id="ai-address" maxLength={200} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ai-reason">Porque recebem os seus emails? (opcional)</Label>
              <Input id="ai-reason" maxLength={200} placeholder="Ex.: clientes e pessoas que pediram informação" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>

            {result && (
              <div className="rounded-md border bg-muted/50 p-3 space-y-2 text-sm">
                <p className="whitespace-pre-line">{result.footer}</p>
                <p className="text-muted-foreground">{result.unsubscribe_text} <span className="underline">Cancelar subscrição</span></p>
                {result.tips.length > 0 && (
                  <ul className="list-disc pl-4 text-xs text-muted-foreground">
                    {result.tips.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {result ? 'Gerar outra' : 'Gerar'}
            </Button>
            <Button onClick={apply} disabled={!result}>Aplicar no rodapé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
