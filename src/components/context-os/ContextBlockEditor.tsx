import { useState } from "react";
import { X, Sparkles, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { BusinessContext, BusinessContextUpdate } from "@/hooks/useBusinessContext";
import { cn } from "@/lib/utils";
import { TagInput } from "./TagInput";

interface Props {
  blockKey: string;
  data: BusinessContext | null;
  onClose: () => void;
  onSave: (updates: BusinessContextUpdate) => void;
}

type FieldType = 'text' | 'textarea' | 'number' | 'tags' | 'offers' | 'scripts';

const BLOCK_META: Record<string, { title: string; icon: string; hints: string[]; fields: { key: string; label: string; type: FieldType; placeholder?: string }[] }> = {
  strategy: {
    title: 'Estratégia',
    icon: '🎯',
    hints: ['Visão e missão da empresa', 'Posicionamento no mercado', 'Vantagem competitiva', 'Proposta de valor única'],
    fields: [
      { key: 'business_description', label: 'Descrição do negócio', type: 'textarea', placeholder: 'O que faz a tua empresa, para quem e porquê...' },
      { key: 'business_model', label: 'Modelo de negócio', type: 'text', placeholder: 'Ex: SaaS, Consultoria, E-commerce...' },
      { key: 'active_strategies', label: 'Estratégias ativas', type: 'tags', placeholder: 'Ex: Outbound, Inbound, Parcerias...' },
    ],
  },
  offers: {
    title: 'Ofertas & Produtos',
    icon: '💼',
    hints: ['Lista de produtos/serviços principais', 'Preço e modelo de pricing', 'Proposta de valor única', 'Para quem é destinado'],
    fields: [
      { key: 'offers', label: 'Produtos / Serviços', type: 'offers' },
      { key: 'pricing_model', label: 'Modelo de pricing', type: 'text', placeholder: 'Ex: Subscrição mensal, Por projeto, Freemium...' },
      { key: 'average_ticket', label: 'Ticket médio (€)', type: 'number' },
    ],
  },
  team: {
    title: 'Equipa',
    icon: '👥',
    hints: ['Tamanho da equipa', 'Papéis e responsabilidades', 'Competências-chave'],
    fields: [
      { key: 'team_size', label: 'Tamanho da equipa', type: 'number' },
      { key: 'team_roles', label: 'Papéis na equipa', type: 'tags', placeholder: 'Ex: CEO, SDR, Closer, CS Manager...' },
    ],
  },
  goals: {
    title: 'Metas & OKRs',
    icon: '🏆',
    hints: ['Meta de receita mensal', 'Meta trimestral e anual', 'Número de deals alvo'],
    fields: [
      { key: 'monthly_revenue_target', label: 'Meta mensal (€)', type: 'number' },
      { key: 'quarterly_revenue_target', label: 'Meta trimestral (€)', type: 'number' },
      { key: 'annual_revenue_target', label: 'Meta anual (€)', type: 'number' },
      { key: 'deals_target_monthly', label: 'Deals alvo / mês', type: 'number' },
    ],
  },
  icp: {
    title: 'Cliente Ideal (ICP)',
    icon: '🎯',
    hints: ['Perfil do cliente ideal', 'Dores e motivações', 'Onde encontrá-lo', 'Decisor típico'],
    fields: [
      { key: 'icp_description', label: 'Descrição do ICP', type: 'textarea', placeholder: 'Descreve o teu cliente ideal...' },
      { key: 'icp_industries', label: 'Indústrias-alvo', type: 'tags', placeholder: 'Ex: Tecnologia, Saúde, Retalho...' },
      { key: 'icp_company_size', label: 'Tamanho da empresa', type: 'text', placeholder: 'Ex: 10-50 colaboradores, PME...' },
      { key: 'icp_decision_maker', label: 'Decisor típico', type: 'text', placeholder: 'Ex: CEO, Diretor Comercial, CTO...' },
      { key: 'icp_pain_points', label: 'Dores principais', type: 'tags', placeholder: 'Ex: Falta de leads, Ciclo longo...' },
    ],
  },
  process: {
    title: 'Processos',
    icon: '⚙️',
    hints: ['Etapas do processo comercial', 'Ciclo de vendas em dias', 'SLA de follow-up'],
    fields: [
      { key: 'sales_process_steps', label: 'Etapas do processo de vendas', type: 'tags', placeholder: 'Ex: Qualificação, Demo, Proposta, Fecho...' },
      { key: 'sales_cycle_days', label: 'Ciclo de vendas (dias)', type: 'number' },
      { key: 'follow_up_sla_hours', label: 'SLA follow-up (horas)', type: 'number' },
    ],
  },
  business_model: {
    title: 'Modelo de Negócio',
    icon: '💰',
    hints: ['Como gera receita', 'Estrutura de preços', 'Margens e custos'],
    fields: [
      { key: 'business_model', label: 'Tipo de modelo', type: 'text', placeholder: 'Ex: SaaS, Marketplace, Serviços...' },
      { key: 'pricing_model', label: 'Modelo de pricing', type: 'text', placeholder: 'Ex: Por utilizador, Por projeto...' },
      { key: 'average_ticket', label: 'Ticket médio (€)', type: 'number' },
    ],
  },
  scripts: {
    title: 'Scripts & Objeções',
    icon: '🛡️',
    hints: ['Objeções mais comuns', 'Scripts de vendas por etapa', 'Estratégias de resposta'],
    fields: [
      { key: 'objections_common', label: 'Objeções mais comuns', type: 'tags', placeholder: 'Ex: Preço alto, Já tenho solução...' },
      { key: 'scripts', label: 'Scripts de vendas', type: 'scripts' },
    ],
  },
};

const EMPTY_OFFER = { name: '', price: '', type: '', description: '' };
const EMPTY_SCRIPT = { name: '', content: '', stage: '' };

function OffersEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const items = value?.length ? value : [];
  const add = () => onChange([...items, { ...EMPTY_OFFER }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, field: string, val: string) =>
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-2 relative">
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => remove(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
          <Input placeholder="Nome do produto/serviço" value={item.name || ''} onChange={(e) => update(i, 'name', e.target.value)} className="text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Preço (ex: 500€/mês)" value={item.price || ''} onChange={(e) => update(i, 'price', e.target.value)} className="text-sm" />
            <Input placeholder="Tipo (ex: SaaS, Serviço)" value={item.type || ''} onChange={(e) => update(i, 'type', e.target.value)} className="text-sm" />
          </div>
          <Textarea placeholder="Descrição curta..." value={item.description || ''} onChange={(e) => update(i, 'description', e.target.value)} rows={2} className="text-sm" />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="gap-1 text-xs w-full">
        <Plus className="h-3 w-3" /> Adicionar produto/serviço
      </Button>
    </div>
  );
}

function ScriptsEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const items = value?.length ? value : [];
  const add = () => onChange([...items, { ...EMPTY_SCRIPT }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, field: string, val: string) =>
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-border p-3 space-y-2 relative">
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => remove(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Nome do script" value={item.name || ''} onChange={(e) => update(i, 'name', e.target.value)} className="text-sm" />
            <Input placeholder="Etapa (ex: Qualificação)" value={item.stage || ''} onChange={(e) => update(i, 'stage', e.target.value)} className="text-sm" />
          </div>
          <Textarea placeholder="Conteúdo do script..." value={item.content || ''} onChange={(e) => update(i, 'content', e.target.value)} rows={3} className="text-sm" />
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="gap-1 text-xs w-full">
        <Plus className="h-3 w-3" /> Adicionar script
      </Button>
    </div>
  );
}

export function ContextBlockEditor({ blockKey, data, onClose, onSave }: Props) {
  const meta = BLOCK_META[blockKey];
  const [localData, setLocalData] = useState<Record<string, any>>(() => {
    const result: Record<string, any> = {};
    meta?.fields.forEach(f => {
      const raw = (data as any)?.[f.key];
      if (f.type === 'tags' || f.type === 'offers' || f.type === 'scripts') {
        result[f.key] = Array.isArray(raw) ? raw : [];
      } else {
        result[f.key] = raw ?? '';
      }
    });
    return result;
  });
  const [saving, setSaving] = useState(false);

  if (!meta) return null;

  const handleSave = () => {
    setSaving(true);
    const updates: BusinessContextUpdate = {};
    meta.fields.forEach(f => {
      const val = localData[f.key];
      if (f.type === 'number') {
        (updates as any)[f.key] = val ? Number(val) : null;
      } else if (f.type === 'tags') {
        (updates as any)[f.key] = Array.isArray(val) && val.length > 0 ? val : null;
      } else if (f.type === 'offers' || f.type === 'scripts') {
        (updates as any)[f.key] = Array.isArray(val) && val.length > 0 ? val : [];
      } else {
        (updates as any)[f.key] = val || null;
      }
    });
    onSave(updates);
    setTimeout(() => {
      setSaving(false);
      onClose();
    }, 500);
  };

  const renderField = (field: typeof meta.fields[number]) => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={localData[field.key] || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, [field.key]: e.target.value }))}
            rows={4}
            className="text-sm"
            placeholder={field.placeholder || `Descreve ${field.label.toLowerCase()}...`}
          />
        );
      case 'tags':
        return (
          <TagInput
            values={localData[field.key] || []}
            onChange={(tags) => setLocalData(prev => ({ ...prev, [field.key]: tags }))}
            placeholder={field.placeholder || `Adicionar ${field.label.toLowerCase()}...`}
          />
        );
      case 'offers':
        return (
          <OffersEditor
            value={localData[field.key] || []}
            onChange={(v) => setLocalData(prev => ({ ...prev, [field.key]: v }))}
          />
        );
      case 'scripts':
        return (
          <ScriptsEditor
            value={localData[field.key] || []}
            onChange={(v) => setLocalData(prev => ({ ...prev, [field.key]: v }))}
          />
        );
      default:
        return (
          <input
            type={field.type === 'number' ? 'number' : 'text'}
            value={localData[field.key] || ''}
            onChange={(e) => setLocalData(prev => ({ ...prev, [field.key]: e.target.value }))}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder={field.placeholder || field.label}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-lg bg-background border-l border-border h-full overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{meta.icon}</span>
                <h2 className="font-bold text-lg">{meta.title}</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {data?.updated_at && (
              <p className="text-xs text-muted-foreground">
                Última edição: {new Date(data.updated_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          <div className="p-4 space-y-6">
            {/* Hints */}
            <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-1.5">
              <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> O que incluir aqui:
              </p>
              <ul className="space-y-0.5">
                {meta.hints.map((h, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {h}</li>
                ))}
              </ul>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              {meta.fields.map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-sm font-medium">{field.label}</label>
                  {renderField(field)}
                </div>
              ))}
            </div>

            {/* Save */}
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSave} className="flex-1 gap-1.5 bg-primary text-primary-foreground" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
