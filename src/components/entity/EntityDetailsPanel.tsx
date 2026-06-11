import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ChevronRight, Mail, Phone, Globe, MapPin, Linkedin, Facebook, Twitter, Instagram, Building2, Briefcase, Tag, Calendar, Users, TrendingUp, DollarSign, Pencil, Clock, Youtube, Pin, MessageCircle } from 'lucide-react';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.16 15a6.34 6.34 0 0 0 6.33 6.33 6.34 6.34 0 0 0 6.33-6.33V8.28a8.28 8.28 0 0 0 4.77 1.51V6.35a4.85 4.85 0 0 1-1-.16z" />
    </svg>
  );
}
import { EntityType, Entity, CompanyEntity, ContactEntity, LeadEntity } from '@/types/entity';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate, formatRelativeTime } from '@/lib/formatters';

interface EntityDetailsPanelProps {
  entityType: EntityType;
  entity: Entity;
  onUpdate?: (field: string, value: unknown) => void;
  onEmailClick?: (email: string) => void;
}

function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-3 text-[13px] font-semibold text-foreground hover:bg-muted/40 transition-colors"
      >
        <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
        {title}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

/** Wraps children with progressive disclosure — shows first `limit` items, then "Show all" link */
function ProgressiveFields({ children, limit = 5 }: { children: React.ReactNode; limit?: number }) {
  const [showAll, setShowAll] = useState(false);
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (items.length <= limit) return <>{items}</>;

  return (
    <>
      {showAll ? items : items.slice(0, limit)}
      <button
        onClick={() => setShowAll(!showAll)}
        className="text-xs text-primary hover:underline mt-1"
      >
        {showAll ? 'Mostrar menos' : `Mostrar todos os valores (${items.length})`}
      </button>
    </>
  );
}

function EditableFieldRow({ 
  label, value, icon: Icon, iconClassName, isLink, linkType, fieldKey, onUpdate, onEmailClick 
}: { 
  label: string; 
  value: string | number | null | undefined; 
  icon?: React.ElementType; 
  iconClassName?: string;
  isLink?: boolean; 
  linkType?: string;
  fieldKey?: string;
  onUpdate?: (field: string, value: unknown) => void;
  onEmailClick?: (email: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(String(value ?? ''));
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (onUpdate && fieldKey && draft !== String(value ?? '')) {
      onUpdate(fieldKey, draft || null);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(String(value ?? ''));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  const canEdit = !!onUpdate && !!fieldKey;

  const inputType = linkType === 'email' ? 'email' : linkType === 'url' ? 'url' : linkType === 'phone' ? 'tel' : 'text';

  if (editing) {
    return (
      <div className="text-sm py-1.5">
        <div className="flex items-center gap-1.5 mb-1">
          {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClassName || "text-muted-foreground")} />}
          <span className="text-muted-foreground text-xs">{label}</span>
        </div>
        <Input
          ref={inputRef}
          type={inputType}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs flex-1"
        />
      </div>
    );
  }

  const renderValue = () => {
    if (!value) return <span className="text-muted-foreground/60 text-[13px]">—</span>;
    const stopProp = (e: React.MouseEvent) => e.stopPropagation();
    if (isLink && linkType === 'whatsapp') {
      const raw = String(value);
      const href = raw.startsWith('http')
        ? raw
        : `https://wa.me/${raw.replace(/[^\d+]/g, '').replace(/^\+/, '')}`;
      return <a href={href} target="_blank" rel="noopener noreferrer" onClick={stopProp} className="text-[#25D366] hover:underline text-[13px] font-medium break-all">{raw}</a>;
    }
    if (isLink && linkType === 'url') {
      const href = String(value).startsWith('http') ? String(value) : `https://${value}`;
      return <a href={href} target="_blank" rel="noopener noreferrer" onClick={stopProp} className="text-primary hover:underline text-[13px] font-medium break-all">{String(value)}</a>;
    }
    if (isLink && linkType === 'email') {
      if (onEmailClick) {
        return <button type="button" onClick={(e) => { e.stopPropagation(); onEmailClick(String(value)); }} className="text-primary hover:underline text-[13px] font-medium break-all text-left">{String(value)}</button>;
      }
      return <button type="button" onClick={(e) => { e.stopPropagation(); onEmailClick?.(String(value)); }} className="text-primary hover:underline text-[13px] font-medium break-all text-left">{String(value)}</button>;
    }
    if (isLink && linkType === 'phone') {
      return <a href={`tel:${value}`} onClick={stopProp} className="text-primary hover:underline text-[13px] font-medium">{String(value)}</a>;
    }
    return <span className="text-foreground text-[13px] break-words">{String(value)}</span>;
  };

  return (
    <div 
      className={cn(
        "text-sm group py-1.5",
        canEdit && "cursor-pointer rounded-md -mx-1 px-1 hover:bg-muted/50 transition-colors"
      )}
      onClick={canEdit ? () => setEditing(true) : undefined}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClassName || "text-muted-foreground")} />}
        <span className="text-muted-foreground text-xs">{label}</span>
        {canEdit && (
          <Pencil className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />
        )}
      </div>
      <div className="mt-0.5 pl-5">
        {renderValue()}
      </div>
    </div>
  );
}

function ReadOnlyFieldRow({ label, value, icon: Icon, iconClassName }: {
  label: string;
  value: string | null | undefined;
  icon?: React.ElementType;
  iconClassName?: string;
}) {
  return (
    <div className="text-sm py-1.5">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClassName || "text-muted-foreground")} />}
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
      <div className="mt-0.5 pl-5">
        <span className="text-foreground text-[13px] break-words">{value || '—'}</span>
      </div>
    </div>
  );
}

const TAG_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800',
  'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800',
  'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <Badge key={tag} variant="outline" className={cn("text-xs border", TAG_COLORS[hashString(tag) % TAG_COLORS.length])}>{tag}</Badge>
      ))}
    </div>
  );
}

/** Dates section shown at the bottom for all entity types */
function DatesSection({ entity }: { entity: Entity }) {
  return (
    <CollapsibleSection title="Datas" defaultOpen={false}>
      <ReadOnlyFieldRow
        label="Criado"
        value={entity.created_at ? `${formatDate(entity.created_at)} (${formatRelativeTime(entity.created_at)})` : null}
        icon={Calendar}
        iconClassName="text-blue-500"
      />
      <ReadOnlyFieldRow
        label="Atualizado"
        value={entity.updated_at ? `${formatDate(entity.updated_at)} (${formatRelativeTime(entity.updated_at)})` : null}
        icon={Clock}
        iconClassName="text-muted-foreground"
      />
    </CollapsibleSection>
  );
}

export function EntityDetailsPanel({ entityType, entity, onUpdate, onEmailClick }: EntityDetailsPanelProps) {
  return (
    <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-card flex-shrink-0 lg:flex lg:flex-col lg:overflow-hidden">
      <div className="border-b px-4 py-2.5 flex items-center gap-4">
        <span className="text-sm font-medium text-foreground">Detalhes</span>
      </div>

      <div className="overflow-visible lg:flex-1 lg:overflow-y-auto">
        {entityType === 'company' && <CompanyDetails entity={entity as CompanyEntity} onUpdate={onUpdate} onEmailClick={onEmailClick} />}
        {entityType === 'contact' && <ContactDetails entity={entity as ContactEntity} onUpdate={onUpdate} onEmailClick={onEmailClick} />}
        {entityType === 'lead' && <LeadDetails entity={entity as LeadEntity} onUpdate={onUpdate} onEmailClick={onEmailClick} />}
        <DatesSection entity={entity} />
      </div>
    </div>
  );
}

function CompanyDetails({ entity, onUpdate, onEmailClick }: { entity: CompanyEntity; onUpdate?: (field: string, value: unknown) => void; onEmailClick?: (email: string) => void }) {
  const e = entity as any;
  const hasSocialUrls = !!(e.linkedin_url || e.facebook_url || e.instagram_url || e.twitter_url || e.youtube_url || e.tiktok_url || e.pinterest_url || e.whatsapp_url);
  return (
    <div>
      <CollapsibleSection title="Dados da Empresa">
        <ProgressiveFields>
          <EditableFieldRow label="Domínio" value={e.domain || e.website} icon={Globe} iconClassName="text-purple-500" isLink linkType="url" fieldKey="website" onUpdate={onUpdate} />
          <EditableFieldRow label="Email" value={entity.email} icon={Mail} iconClassName="text-blue-500" isLink linkType="email" fieldKey="email" onUpdate={onUpdate} onEmailClick={onEmailClick} />
          <EditableFieldRow label="Telefone" value={entity.phone} icon={Phone} iconClassName="text-green-500" isLink linkType="phone" fieldKey="phone" onUpdate={onUpdate} />
          <EditableFieldRow label="Indústria" value={entity.industry} icon={Briefcase} iconClassName="text-amber-500" fieldKey="industry" onUpdate={onUpdate} />
          <EditableFieldRow label="Dimensão" value={entity.size} icon={Users} iconClassName="text-indigo-500" fieldKey="size" onUpdate={onUpdate} />
          {entity.tags && entity.tags.length > 0 && (
            <div className="pt-1">
              <span className="text-sm text-muted-foreground">Tags</span>
              <TagList tags={entity.tags} />
            </div>
          )}
        </ProgressiveFields>
      </CollapsibleSection>

      <CollapsibleSection title="Dados Financeiros" defaultOpen={false}>
        <ProgressiveFields>
          <EditableFieldRow label="Receita" value={entity.annual_revenue ? `€${entity.annual_revenue.toLocaleString()}` : null} icon={DollarSign} iconClassName="text-green-600" fieldKey="annual_revenue" onUpdate={onUpdate} />
          <EditableFieldRow label="Funcionários" value={entity.employee_count} icon={Users} iconClassName="text-indigo-500" fieldKey="employee_count" onUpdate={onUpdate} />
          <EditableFieldRow label="NIF" value={e.tax_id} fieldKey="tax_id" onUpdate={onUpdate} />
          <EditableFieldRow label="CAE" value={e.cae_description} fieldKey="cae_description" onUpdate={onUpdate} />
        </ProgressiveFields>
      </CollapsibleSection>

      <CollapsibleSection title="Localização" defaultOpen={false}>
        <EditableFieldRow label="Morada" value={entity.address} icon={MapPin} iconClassName="text-red-500" fieldKey="address" onUpdate={onUpdate} />
        <EditableFieldRow label="Cidade" value={e.city} fieldKey="city" onUpdate={onUpdate} />
        <EditableFieldRow label="País" value={e.country} fieldKey="country" onUpdate={onUpdate} />
      </CollapsibleSection>

      <CollapsibleSection title="Redes Sociais" defaultOpen={false}>
        <EditableFieldRow label="LinkedIn" value={e.linkedin_url} icon={Linkedin} iconClassName="text-[#0A66C2]" isLink linkType="url" fieldKey="linkedin_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Facebook" value={e.facebook_url} icon={Facebook} iconClassName="text-[#1877F2]" isLink linkType="url" fieldKey="facebook_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Instagram" value={e.instagram_url} icon={Instagram} iconClassName="text-[#E4405F]" isLink linkType="url" fieldKey="instagram_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Twitter/X" value={e.twitter_url} icon={Twitter} iconClassName="text-foreground" isLink linkType="url" fieldKey="twitter_url" onUpdate={onUpdate} />
        <EditableFieldRow label="YouTube" value={e.youtube_url} icon={Youtube} iconClassName="text-[#FF0000]" isLink linkType="url" fieldKey="youtube_url" onUpdate={onUpdate} />
        <EditableFieldRow label="TikTok" value={e.tiktok_url} icon={TikTokIcon} iconClassName="text-foreground" isLink linkType="url" fieldKey="tiktok_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Pinterest" value={e.pinterest_url} icon={Pin} iconClassName="text-[#E60023]" isLink linkType="url" fieldKey="pinterest_url" onUpdate={onUpdate} />
        <EditableFieldRow label="WhatsApp" value={e.whatsapp_url} icon={MessageCircle} iconClassName="text-[#25D366]" isLink linkType="whatsapp" fieldKey="whatsapp_url" onUpdate={onUpdate} />
      </CollapsibleSection>
    </div>
  );
}

function ContactDetails({ entity, onUpdate, onEmailClick }: { entity: ContactEntity; onUpdate?: (field: string, value: unknown) => void; onEmailClick?: (email: string) => void }) {
  const e = entity as any;
  const hasSocialUrls = !!(e.linkedin_url || e.facebook_url || e.instagram_url || e.twitter_url || e.youtube_url || e.tiktok_url || e.pinterest_url || e.whatsapp_url);
  const { data: linkedCompanyName } = useQuery({
    queryKey: ['entity-details-linked-company', e.company_id],
    enabled: !entity.company && !!e.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .eq('id', e.company_id)
        .maybeSingle();
      if (error) return null;
      return data?.name ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
  const companyDisplay = entity.company || linkedCompanyName || null;
  return (
    <div>
      <CollapsibleSection title="Dados do Contacto">
        <ProgressiveFields>
          <EditableFieldRow label="Email" value={entity.email} icon={Mail} iconClassName="text-blue-500" isLink linkType="email" fieldKey="email" onUpdate={onUpdate} onEmailClick={onEmailClick} />
          <EditableFieldRow label="Telefone" value={entity.phone} icon={Phone} iconClassName="text-green-500" isLink linkType="phone" fieldKey="phone" onUpdate={onUpdate} />
          <EditableFieldRow label="Empresa" value={companyDisplay} icon={Building2} iconClassName="text-slate-500" fieldKey="company" onUpdate={onUpdate} />
          <EditableFieldRow label="Cargo" value={entity.job_title} icon={Briefcase} iconClassName="text-amber-500" fieldKey="job_title" onUpdate={onUpdate} />
          <EditableFieldRow label="NIF" value={e.tax_id} fieldKey="tax_id" onUpdate={onUpdate} />
          {entity.tags && entity.tags.length > 0 && (
            <div className="pt-1">
              <span className="text-sm text-muted-foreground">Tags</span>
              <TagList tags={entity.tags} />
            </div>
          )}
        </ProgressiveFields>
      </CollapsibleSection>

      <CollapsibleSection title="Morada" defaultOpen={false}>
        <EditableFieldRow label="Morada" value={e.address} icon={MapPin} iconClassName="text-red-500" fieldKey="address" onUpdate={onUpdate} />
        <EditableFieldRow label="Cidade" value={e.city} fieldKey="city" onUpdate={onUpdate} />
        <EditableFieldRow label="Cód. Postal" value={e.postal_code} fieldKey="postal_code" onUpdate={onUpdate} />
        <EditableFieldRow label="País" value={e.country} fieldKey="country" onUpdate={onUpdate} />
      </CollapsibleSection>

      <CollapsibleSection title="Redes Sociais" defaultOpen={hasSocialUrls}>
        <EditableFieldRow label="LinkedIn" value={e.linkedin_url} icon={Linkedin} iconClassName="text-[#0A66C2]" isLink linkType="url" fieldKey="linkedin_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Facebook" value={e.facebook_url} icon={Facebook} iconClassName="text-[#1877F2]" isLink linkType="url" fieldKey="facebook_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Instagram" value={e.instagram_url} icon={Instagram} iconClassName="text-[#E4405F]" isLink linkType="url" fieldKey="instagram_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Twitter/X" value={e.twitter_url} icon={Twitter} iconClassName="text-foreground" isLink linkType="url" fieldKey="twitter_url" onUpdate={onUpdate} />
        <EditableFieldRow label="YouTube" value={e.youtube_url} icon={Youtube} iconClassName="text-[#FF0000]" isLink linkType="url" fieldKey="youtube_url" onUpdate={onUpdate} />
        <EditableFieldRow label="TikTok" value={e.tiktok_url} icon={TikTokIcon} iconClassName="text-foreground" isLink linkType="url" fieldKey="tiktok_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Pinterest" value={e.pinterest_url} icon={Pin} iconClassName="text-[#E60023]" isLink linkType="url" fieldKey="pinterest_url" onUpdate={onUpdate} />
        <EditableFieldRow label="WhatsApp" value={e.whatsapp_url} icon={MessageCircle} iconClassName="text-[#25D366]" isLink linkType="whatsapp" fieldKey="whatsapp_url" onUpdate={onUpdate} />
      </CollapsibleSection>
    </div>
  );
}

function LeadDetails({ entity, onUpdate, onEmailClick }: { entity: LeadEntity; onUpdate?: (field: string, value: unknown) => void; onEmailClick?: (email: string) => void }) {
  const e = entity as any;
  const hasSocialUrls = !!(e.linkedin_url || e.instagram_url || e.facebook_url || e.twitter_url || e.youtube_url || e.tiktok_url || e.pinterest_url || e.whatsapp_url);
  return (
    <div>
      <CollapsibleSection title="Dados do Lead">
        <ProgressiveFields>
          <EditableFieldRow label="Email" value={entity.email} icon={Mail} iconClassName="text-blue-500" isLink linkType="email" fieldKey="email" onUpdate={onUpdate} onEmailClick={onEmailClick} />
          <EditableFieldRow label="Telefone" value={entity.phone} icon={Phone} iconClassName="text-green-500" isLink linkType="phone" fieldKey="phone" onUpdate={onUpdate} />
          <EditableFieldRow label="Fonte" value={entity.source} icon={TrendingUp} iconClassName="text-emerald-500" fieldKey="source" onUpdate={onUpdate} />
          <EditableFieldRow label="Empresa" value={entity.company} icon={Building2} iconClassName="text-slate-500" fieldKey="company" onUpdate={onUpdate} />
          <EditableFieldRow label="Website" value={e.website} icon={Globe} iconClassName="text-purple-500" isLink linkType="url" fieldKey="website" onUpdate={onUpdate} />
          {entity.tags && entity.tags.length > 0 && (
            <div className="pt-1">
              <span className="text-sm text-muted-foreground">Tags</span>
              <TagList tags={entity.tags} />
            </div>
          )}
        </ProgressiveFields>
      </CollapsibleSection>

      <CollapsibleSection title="Redes Sociais" defaultOpen={hasSocialUrls}>
        <EditableFieldRow label="LinkedIn" value={e.linkedin_url} icon={Linkedin} iconClassName="text-[#0A66C2]" isLink linkType="url" fieldKey="linkedin_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Instagram" value={e.instagram_url} icon={Instagram} iconClassName="text-[#E4405F]" isLink linkType="url" fieldKey="instagram_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Facebook" value={e.facebook_url} icon={Facebook} iconClassName="text-[#1877F2]" isLink linkType="url" fieldKey="facebook_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Twitter/X" value={e.twitter_url} icon={Twitter} iconClassName="text-foreground" isLink linkType="url" fieldKey="twitter_url" onUpdate={onUpdate} />
        <EditableFieldRow label="YouTube" value={e.youtube_url} icon={Youtube} iconClassName="text-[#FF0000]" isLink linkType="url" fieldKey="youtube_url" onUpdate={onUpdate} />
        <EditableFieldRow label="TikTok" value={e.tiktok_url} icon={TikTokIcon} iconClassName="text-foreground" isLink linkType="url" fieldKey="tiktok_url" onUpdate={onUpdate} />
        <EditableFieldRow label="Pinterest" value={e.pinterest_url} icon={Pin} iconClassName="text-[#E60023]" isLink linkType="url" fieldKey="pinterest_url" onUpdate={onUpdate} />
        <EditableFieldRow label="WhatsApp" value={e.whatsapp_url} icon={MessageCircle} iconClassName="text-[#25D366]" isLink linkType="whatsapp" fieldKey="whatsapp_url" onUpdate={onUpdate} />
      </CollapsibleSection>
    </div>
  );
}
