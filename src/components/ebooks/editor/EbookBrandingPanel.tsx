import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Link, Type, MessageSquare, Shield, Users, Search, FileCheck, Globe, Magnet, Sparkles, BellRing, Plus, X } from "lucide-react";
import type { EbookContactPage } from "@/hooks/useEbooks";

export type LeadGateTrigger = "never" | "always" | "after_pages";

interface EbookBrandingPanelProps {
  localHeaderText: string;
  localFooterText: string;
  localContactPage: EbookContactPage;
  protectionEnabled: boolean;
  leadGateEnabled: boolean;
  onHeaderTextChange: (val: string) => void;
  onFooterTextChange: (val: string) => void;
  onContactPageChange: (val: EbookContactPage) => void;
  onProtectionChange: (val: boolean) => void;
  onLeadGateChange: (val: boolean) => void;
  // Lead magnet (granular)
  leadGateTrigger?: LeadGateTrigger;
  leadGateAfterPages?: number;
  leadGateRequireName?: boolean;
  leadGateRequireEmail?: boolean;
  leadGateRequirePhone?: boolean;
  leadGateTitle?: string;
  leadGateDescription?: string;
  leadGateSubtitle?: string;
  leadGateBenefits?: string[];
  leadGateCtaLabel?: string;
  welcomeEmailEnabled?: boolean;
  welcomeEmailSubject?: string;
  welcomeEmailBody?: string;
  notifyManagerEnabled?: boolean;
  notifyManagerThresholdPct?: number;
  onLeadGateTriggerChange?: (val: LeadGateTrigger) => void;
  onLeadGateAfterPagesChange?: (val: number) => void;
  onLeadGateRequireNameChange?: (val: boolean) => void;
  onLeadGateRequireEmailChange?: (val: boolean) => void;
  onLeadGateRequirePhoneChange?: (val: boolean) => void;
  onLeadGateTitleChange?: (val: string) => void;
  onLeadGateDescriptionChange?: (val: string) => void;
  onLeadGateSubtitleChange?: (val: string) => void;
  onLeadGateBenefitsChange?: (val: string[]) => void;
  onLeadGateCtaLabelChange?: (val: string) => void;
  onWelcomeEmailEnabledChange?: (val: boolean) => void;
  onWelcomeEmailSubjectChange?: (val: string) => void;
  onWelcomeEmailBodyChange?: (val: string) => void;
  onNotifyManagerEnabledChange?: (val: boolean) => void;
  onNotifyManagerThresholdPctChange?: (val: number) => void;
  // Consent fields
  consentRequired?: boolean;
  consentText?: string;
  privacyPolicyUrl?: string;
  marketingOptInEnabled?: boolean;
  marketingOptInLabel?: string;
  onConsentRequiredChange?: (val: boolean) => void;
  onConsentTextChange?: (val: string) => void;
  onPrivacyPolicyUrlChange?: (val: string) => void;
  onMarketingOptInEnabledChange?: (val: boolean) => void;
  onMarketingOptInLabelChange?: (val: string) => void;
  // SEO fields
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  onSeoTitleChange?: (val: string) => void;
  onSeoDescriptionChange?: (val: string) => void;
  onOgImageUrlChange?: (val: string) => void;
  onCanonicalUrlChange?: (val: string) => void;
  onNoindexChange?: (val: boolean) => void;
}

export function EbookBrandingPanel({
  localHeaderText, localFooterText, localContactPage,
  protectionEnabled, leadGateEnabled,
  onHeaderTextChange, onFooterTextChange, onContactPageChange,
  onProtectionChange, onLeadGateChange,
  leadGateTrigger = "always", leadGateAfterPages = 2,
  leadGateRequireName = true, leadGateRequireEmail = true, leadGateRequirePhone = false,
  leadGateTitle, leadGateDescription, leadGateSubtitle, leadGateBenefits = [], leadGateCtaLabel,
  welcomeEmailEnabled = false, welcomeEmailSubject, welcomeEmailBody,
  notifyManagerEnabled = true, notifyManagerThresholdPct = 70,
  onLeadGateTriggerChange, onLeadGateAfterPagesChange,
  onLeadGateRequireNameChange, onLeadGateRequireEmailChange, onLeadGateRequirePhoneChange,
  onLeadGateTitleChange, onLeadGateDescriptionChange, onLeadGateSubtitleChange, onLeadGateBenefitsChange, onLeadGateCtaLabelChange,
  onWelcomeEmailEnabledChange, onWelcomeEmailSubjectChange, onWelcomeEmailBodyChange,
  onNotifyManagerEnabledChange, onNotifyManagerThresholdPctChange,
  consentRequired, consentText, privacyPolicyUrl, marketingOptInEnabled, marketingOptInLabel,
  onConsentRequiredChange, onConsentTextChange, onPrivacyPolicyUrlChange, onMarketingOptInEnabledChange, onMarketingOptInLabelChange,
  seoTitle, seoDescription, ogImageUrl, canonicalUrl, noindex,
  onSeoTitleChange, onSeoDescriptionChange, onOgImageUrlChange, onCanonicalUrlChange, onNoindexChange,
}: EbookBrandingPanelProps) {
  const benefits = leadGateBenefits || [];
  const updateBenefit = (idx: number, val: string) => {
    const next = [...benefits];
    next[idx] = val;
    onLeadGateBenefitsChange?.(next);
  };
  const addBenefit = () => onLeadGateBenefitsChange?.([...benefits, ""]);
  const removeBenefit = (idx: number) => onLeadGateBenefitsChange?.(benefits.filter((_, i) => i !== idx));
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Header / Footer */}
        <div>
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5 text-muted-foreground" /> Cabeçalho / Rodapé
          </span>
          <div className="mt-2 space-y-2">
            <Input placeholder="Texto do cabeçalho" value={localHeaderText} onChange={(e) => onHeaderTextChange(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Texto do rodapé" value={localFooterText} onChange={(e) => onFooterTextChange(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        {/* Contact page */}
        <div className="border-t border-border/30 pt-3">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /> Página de Contactos
          </span>
          <div className="mt-2 space-y-2">
            <Input placeholder="Slogan" value={localContactPage.slogan || ""} onChange={(e) => onContactPageChange({ ...localContactPage, slogan: e.target.value })} className="h-8 text-xs" />
            <div className="flex gap-1.5 items-center">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input placeholder="Email" value={localContactPage.email || ""} onChange={(e) => onContactPageChange({ ...localContactPage, email: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="flex gap-1.5 items-center">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input placeholder="Telefone" value={localContactPage.phone || ""} onChange={(e) => onContactPageChange({ ...localContactPage, phone: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="flex gap-1.5 items-center">
              <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input placeholder="Website" value={localContactPage.website || ""} onChange={(e) => onContactPageChange({ ...localContactPage, website: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
        </div>

        {/* Protection toggle */}
        <div className="border-t border-border/30 pt-3">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" /> Proteção de Documento
          </span>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={protectionEnabled} onChange={(e) => onProtectionChange(e.target.checked)} className="rounded border-border" />
            <span className="text-xs text-muted-foreground">Ativar proteção anti-cópia e marca d'água na página pública</span>
          </label>
        </div>

        {/* Lead Gate toggle */}
        <div className="border-t border-border/30 pt-3">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-muted-foreground" /> Captura de Leads
          </span>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={leadGateEnabled} onChange={(e) => onLeadGateChange(e.target.checked)} className="rounded border-border" />
            <span className="text-xs text-muted-foreground">Ativar formulário de captura no leitor público</span>
          </label>
          <p className="text-[10px] text-muted-foreground/60 mt-1 ml-5">Os leitores identificados aparecem nas estatísticas do eBook</p>
        </div>

        {/* Lead Magnet — granular config */}
        {leadGateEnabled && (
          <div className="border-t border-border/30 pt-3">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Magnet className="h-3.5 w-3.5 text-muted-foreground" /> Configuração do Lead Magnet
            </span>
            <div className="mt-2 space-y-2">
              <div>
                <label className="text-[10px] text-muted-foreground/80 block mb-1">Quando mostrar o formulário</label>
                <select
                  value={leadGateTrigger}
                  onChange={(e) => onLeadGateTriggerChange?.(e.target.value as LeadGateTrigger)}
                  className="w-full h-8 text-xs rounded-md border border-border bg-background px-2"
                >
                  <option value="always">Antes de abrir (gate total)</option>
                  <option value="after_pages">Após N páginas (teaser)</option>
                  <option value="never">Nunca (apenas tracking anónimo)</option>
                </select>
              </div>
              {leadGateTrigger === "after_pages" && (
                <div>
                  <label className="text-[10px] text-muted-foreground/80 block mb-1">Mostrar após quantas páginas</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={leadGateAfterPages}
                    onChange={(e) => onLeadGateAfterPagesChange?.(Math.max(1, parseInt(e.target.value || "1", 10)))}
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <div className="pt-1">
                <p className="text-[10px] text-muted-foreground/80 mb-1">Campos obrigatórios</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={leadGateRequireName} onChange={(e) => onLeadGateRequireNameChange?.(e.target.checked)} className="rounded border-border" />
                  <span className="text-xs text-muted-foreground">Nome</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={leadGateRequireEmail} onChange={(e) => onLeadGateRequireEmailChange?.(e.target.checked)} className="rounded border-border" />
                  <span className="text-xs text-muted-foreground">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={leadGateRequirePhone} onChange={(e) => onLeadGateRequirePhoneChange?.(e.target.checked)} className="rounded border-border" />
                  <span className="text-xs text-muted-foreground">Telemóvel</span>
                </label>
                <p className="text-[10px] text-muted-foreground/60 mt-1">É preciso pelo menos email ou telemóvel obrigatório.</p>
              </div>

              <div className="pt-1 space-y-2">
                <Input
                  placeholder="Título (ex: Aceda ao eBook)"
                  value={leadGateTitle || ""}
                  onChange={(e) => onLeadGateTitleChange?.(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Subtítulo (ex: Guia gratuito em PDF)"
                  value={leadGateSubtitle || ""}
                  onChange={(e) => onLeadGateSubtitleChange?.(e.target.value)}
                  className="h-8 text-xs"
                />
                <Textarea
                  placeholder="Descrição curta (ex: Insira os seus dados para ler)"
                  value={leadGateDescription || ""}
                  onChange={(e) => onLeadGateDescriptionChange?.(e.target.value)}
                  className="text-xs min-h-[50px]"
                />

                {/* Benefits bullets */}
                <div className="pt-1">
                  <label className="text-[10px] text-muted-foreground/80 block mb-1">Benefícios (bullets persuasivos)</label>
                  <div className="space-y-1.5">
                    {benefits.map((b, i) => (
                      <div key={i} className="flex gap-1">
                        <Input
                          placeholder={`Benefício ${i + 1}`}
                          value={b}
                          onChange={(e) => updateBenefit(i, e.target.value)}
                          className="h-7 text-xs"
                        />
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeBenefit(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {benefits.length < 5 && (
                      <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] w-full" onClick={addBenefit}>
                        <Plus className="h-3 w-3 mr-1" /> Adicionar benefício
                      </Button>
                    )}
                  </div>
                </div>

                <Input
                  placeholder="Texto do botão (ex: Aceder ao eBook)"
                  value={leadGateCtaLabel || ""}
                  onChange={(e) => onLeadGateCtaLabelChange?.(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Welcome Email pós-captura */}
        {leadGateEnabled && (
          <div className="border-t border-border/30 pt-3">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" /> Email Automático de Boas-vindas
            </span>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={welcomeEmailEnabled} onChange={(e) => onWelcomeEmailEnabledChange?.(e.target.checked)} className="rounded border-border" />
              <span className="text-xs text-muted-foreground">Enviar email com link do eBook após captura</span>
            </label>
            {welcomeEmailEnabled && (
              <div className="mt-2 space-y-2">
                <Input
                  placeholder="Assunto do email (ex: O seu eBook está pronto!)"
                  value={welcomeEmailSubject || ""}
                  onChange={(e) => onWelcomeEmailSubjectChange?.(e.target.value)}
                  className="h-8 text-xs"
                />
                <Textarea
                  placeholder="Corpo do email (use {{name}} e {{ebook_url}} como variáveis)"
                  value={welcomeEmailBody || ""}
                  onChange={(e) => onWelcomeEmailBodyChange?.(e.target.value)}
                  className="text-xs min-h-[80px]"
                />
                <p className="text-[10px] text-muted-foreground/60">Variáveis: <code>{`{{name}}`}</code>, <code>{`{{ebook_title}}`}</code>, <code>{`{{ebook_url}}`}</code></p>
              </div>
            )}
          </div>
        )}

        {/* Notify manager on hot lead */}
        {leadGateEnabled && (
          <div className="border-t border-border/30 pt-3">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <BellRing className="h-3.5 w-3.5 text-muted-foreground" /> Notificação de Lead Quente
            </span>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={notifyManagerEnabled} onChange={(e) => onNotifyManagerEnabledChange?.(e.target.checked)} className="rounded border-border" />
              <span className="text-xs text-muted-foreground">Notificar gestor ao atingir o threshold</span>
            </label>
            {notifyManagerEnabled && (
              <div className="mt-2">
                <label className="text-[10px] text-muted-foreground/80 block mb-1">% de leitura para lead quente</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={notifyManagerThresholdPct}
                  onChange={(e) => onNotifyManagerThresholdPctChange?.(Math.max(1, Math.min(100, parseInt(e.target.value || "70", 10))))}
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground/60 mt-1">Cria tarefa no CRM e regista evento <code>ebook.hot_lead</code>.</p>
              </div>
            )}
          </div>
        )}

        {/* Consent / RGPD (only when lead gate is enabled) */}
        {leadGateEnabled && (
          <div className="border-t border-border/30 pt-3">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5 text-muted-foreground" /> Consentimento (RGPD)
            </span>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentRequired || false}
                  onChange={(e) => onConsentRequiredChange?.(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-xs text-muted-foreground">Consentimento obrigatório</span>
              </label>
              <Textarea
                placeholder="Texto de consentimento (ex: Aceito a recolha dos meus dados...)"
                value={consentText || ""}
                onChange={(e) => onConsentTextChange?.(e.target.value)}
                className="text-xs min-h-[60px]"
              />
              <Input
                placeholder="URL da Política de Privacidade"
                value={privacyPolicyUrl || ""}
                onChange={(e) => onPrivacyPolicyUrlChange?.(e.target.value)}
                className="h-8 text-xs"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingOptInEnabled || false}
                  onChange={(e) => onMarketingOptInEnabledChange?.(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-xs text-muted-foreground">Mostrar opt-in de comunicações marketing</span>
              </label>
              {marketingOptInEnabled && (
                <Input
                  placeholder="Texto do opt-in (ex: Quero receber novidades)"
                  value={marketingOptInLabel || ""}
                  onChange={(e) => onMarketingOptInLabelChange?.(e.target.value)}
                  className="h-8 text-xs"
                />
              )}
            </div>
          </div>
        )}

        {/* SEO e Partilha */}
        <div className="border-t border-border/30 pt-3">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" /> SEO e Partilha
          </span>
          <div className="mt-2 space-y-2">
            <Input
              placeholder="Meta título (SEO)"
              value={seoTitle || ""}
              onChange={(e) => onSeoTitleChange?.(e.target.value)}
              className="h-8 text-xs"
            />
            <Textarea
              placeholder="Meta descrição (SEO)"
              value={seoDescription || ""}
              onChange={(e) => onSeoDescriptionChange?.(e.target.value)}
              className="text-xs min-h-[50px]"
            />
            <div className="flex gap-1.5 items-center">
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                placeholder="URL da imagem OG (ou usa a capa)"
                value={ogImageUrl || ""}
                onChange={(e) => onOgImageUrlChange?.(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <Input
              placeholder="URL canónica"
              value={canonicalUrl || ""}
              onChange={(e) => onCanonicalUrlChange?.(e.target.value)}
              className="h-8 text-xs"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={noindex || false}
                onChange={(e) => onNoindexChange?.(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-xs text-muted-foreground">Não indexar nos motores de busca (noindex)</span>
            </label>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
