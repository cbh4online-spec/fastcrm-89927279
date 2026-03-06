import { useState } from "react";
import { X, Sparkles, History, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { BusinessContext, BusinessContextUpdate } from "@/hooks/useBusinessContext";
import { cn } from "@/lib/utils";

interface Props {
  blockKey: string;
  data: BusinessContext | null;
  onClose: () => void;
  onSave: (updates: BusinessContextUpdate) => void;
}

const BLOCK_META: Record<string, { title: string; icon: string; hints: string[]; fields: { key: string; label: string; type: 'text' | 'textarea' | 'number' | 'array' }[] }> = {
  strategy: {
    title: 'Estratégia',
    icon: '🎯',
    hints: ['Visão e missão da empresa', 'Posicionamento no mercado', 'Vantagem competitiva', 'Proposta de valor única'],
    fields: [
      { key: 'business_description', label: 'Descrição do negócio', type: 'textarea' },
      { key: 'business_model', label: 'Modelo de negócio', type: 'text' },
    ],
  },
  offers: {
    title: 'Ofertas & Produtos',
    icon: '💼',
    hints: ['Lista de produtos/serviços principais', 'Preço e modelo de pricing', 'Proposta de valor única', 'Para quem é destinado'],
    fields: [
      { key: 'pricing_model', label: 'Modelo de pricing', type: 'text' },
      { key: 'average_ticket', label: 'Ticket médio (€)', type: 'number' },
    ],
  },
  team: {
    title: 'Equipa',
    icon: '👥',
    hints: ['Tamanho da equipa', 'Papéis e responsabilidades', 'Competências-chave'],
    fields: [
      { key: 'team_size', label: 'Tamanho da equipa', type: 'number' },
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
      { key: 'icp_description', label: 'Descrição do ICP', type: 'textarea' },
      { key: 'icp_company_size', label: 'Tamanho da empresa', type: 'text' },
      { key: 'icp_decision_maker', label: 'Decisor típico', type: 'text' },
    ],
  },
  process: {
    title: 'Processos',
    icon: '⚙️',
    hints: ['Etapas do processo comercial', 'Ciclo de vendas em dias', 'SLA de follow-up'],
    fields: [
      { key: 'sales_cycle_days', label: 'Ciclo de vendas (dias)', type: 'number' },
      { key: 'follow_up_sla_hours', label: 'SLA follow-up (horas)', type: 'number' },
    ],
  },
  business_model: {
    title: 'Modelo de Negócio',
    icon: '💰',
    hints: ['Como gera receita', 'Estrutura de preços', 'Margens e custos'],
    fields: [
      { key: 'business_model', label: 'Tipo de modelo', type: 'text' },
      { key: 'pricing_model', label: 'Modelo de pricing', type: 'text' },
      { key: 'average_ticket', label: 'Ticket médio (€)', type: 'number' },
    ],
  },
  scripts: {
    title: 'Scripts & Objeções',
    icon: '🛡️',
    hints: ['Objeções mais comuns', 'Scripts de vendas por etapa', 'Estratégias de resposta'],
    fields: [],
  },
};

export function ContextBlockEditor({ blockKey, data, onClose, onSave }: Props) {
  const meta = BLOCK_META[blockKey];
  const [localData, setLocalData] = useState<Record<string, any>>(() => {
    const result: Record<string, any> = {};
    meta?.fields.forEach(f => {
      result[f.key] = (data as any)?.[f.key] ?? '';
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
                  {field.type === 'textarea' ? (
                    <Textarea
                      value={localData[field.key] || ''}
                      onChange={(e) => setLocalData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      rows={4}
                      className="text-sm"
                      placeholder={`Descreve ${field.label.toLowerCase()}...`}
                    />
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={localData[field.key] || ''}
                      onChange={(e) => setLocalData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder={field.label}
                    />
                  )}
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
