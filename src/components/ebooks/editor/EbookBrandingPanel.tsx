import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, Phone, Link, Type, MessageSquare, Shield, Users, Search, FileCheck, Globe } from "lucide-react";
import type { EbookContactPage } from "@/hooks/useEbooks";

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
  consentRequired, consentText, privacyPolicyUrl, marketingOptInEnabled, marketingOptInLabel,
  onConsentRequiredChange, onConsentTextChange, onPrivacyPolicyUrlChange, onMarketingOptInEnabledChange, onMarketingOptInLabelChange,
  seoTitle, seoDescription, ogImageUrl, canonicalUrl, noindex,
  onSeoTitleChange, onSeoDescriptionChange, onOgImageUrlChange, onCanonicalUrlChange, onNoindexChange,
}: EbookBrandingPanelProps) {
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
            <span className="text-xs text-muted-foreground">Pedir nome e email antes de permitir leitura</span>
          </label>
          <p className="text-[10px] text-muted-foreground/60 mt-1 ml-5">Os leitores identificados aparecem nas estatísticas do eBook</p>
        </div>

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
