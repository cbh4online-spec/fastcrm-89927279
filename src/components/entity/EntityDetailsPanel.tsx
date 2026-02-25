import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, Mail, Phone, Globe, MapPin, Linkedin, Facebook, Twitter, Instagram, Building2, Briefcase, Tag, Calendar, Users, TrendingUp, DollarSign } from 'lucide-react';
import { EntityType, Entity, CompanyEntity, ContactEntity, LeadEntity } from '@/types/entity';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface DetailsSectionConfig {
  title: string;
  fields: { label: string; value: string | number | null | undefined; icon?: React.ElementType; isLink?: boolean; linkType?: 'url' | 'email' | 'phone' }[];
}

interface EntityDetailsPanelProps {
  entityType: EntityType;
  entity: Entity;
}

function CollapsibleSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
      >
        <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
        {title}
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value, icon: Icon, isLink, linkType }: { label: string; value: string | number | null | undefined; icon?: React.ElementType; isLink?: boolean; linkType?: string }) {
  const displayValue = value ?? '—';
  
  const renderValue = () => {
    if (!value) return <span className="text-muted-foreground">—</span>;
    if (isLink && linkType === 'url') {
      const href = String(value).startsWith('http') ? String(value) : `https://${value}`;
      return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{String(value)}</a>;
    }
    if (isLink && linkType === 'email') {
      return <a href={`mailto:${value}`} className="text-primary hover:underline truncate">{String(value)}</a>;
    }
    if (isLink && linkType === 'phone') {
      return <a href={`tel:${value}`} className="text-primary hover:underline">{String(value)}</a>;
    }
    return <span className="text-foreground truncate">{String(displayValue)}</span>;
  };

  return (
    <div className="flex items-start gap-2 text-sm">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />}
      <span className="text-muted-foreground shrink-0 min-w-[80px]">{label}</span>
      <div className="flex-1 text-right truncate">
        {renderValue()}
      </div>
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
      ))}
    </div>
  );
}

export function EntityDetailsPanel({ entityType, entity }: EntityDetailsPanelProps) {
  return (
    <div className="w-80 border-l bg-muted/20 flex-shrink-0 overflow-hidden flex flex-col">
      {/* Panel tab header */}
      <div className="border-b px-4 py-2.5 flex items-center gap-4">
        <span className="text-sm font-medium text-foreground">Detalhes</span>
      </div>

      <ScrollArea className="flex-1">
        {entityType === 'company' && <CompanyDetails entity={entity as CompanyEntity} />}
        {entityType === 'contact' && <ContactDetails entity={entity as ContactEntity} />}
        {entityType === 'lead' && <LeadDetails entity={entity as LeadEntity} />}
      </ScrollArea>
    </div>
  );
}

function CompanyDetails({ entity }: { entity: CompanyEntity }) {
  const e = entity as any;
  return (
    <div>
      <CollapsibleSection title="Dados da Empresa">
        <FieldRow label="Domínio" value={e.domain || e.website} icon={Globe} isLink linkType="url" />
        <FieldRow label="Email" value={entity.email} icon={Mail} isLink linkType="email" />
        <FieldRow label="Telefone" value={entity.phone} icon={Phone} isLink linkType="phone" />
        <FieldRow label="Indústria" value={entity.industry} icon={Briefcase} />
        <FieldRow label="Dimensão" value={entity.size} icon={Users} />
        {entity.tags && entity.tags.length > 0 && (
          <div className="pt-1">
            <span className="text-sm text-muted-foreground">Tags</span>
            <TagList tags={entity.tags} />
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Dados Financeiros" defaultOpen={false}>
        <FieldRow label="Receita" value={entity.annual_revenue ? `€${entity.annual_revenue.toLocaleString()}` : null} icon={DollarSign} />
        <FieldRow label="Funcionários" value={entity.employee_count} icon={Users} />
        <FieldRow label="NIF" value={e.tax_id} />
        <FieldRow label="CAE" value={e.cae_description} />
      </CollapsibleSection>

      <CollapsibleSection title="Localização" defaultOpen={false}>
        <FieldRow label="Morada" value={entity.address} icon={MapPin} />
        <FieldRow label="Cidade" value={e.city} />
        <FieldRow label="País" value={e.country} />
      </CollapsibleSection>

      <CollapsibleSection title="Redes Sociais" defaultOpen={false}>
        <FieldRow label="LinkedIn" value={e.linkedin_url} icon={Linkedin} isLink linkType="url" />
        <FieldRow label="Facebook" value={e.facebook_url} icon={Facebook} isLink linkType="url" />
        <FieldRow label="Instagram" value={e.instagram_url} icon={Instagram} isLink linkType="url" />
        <FieldRow label="Twitter" value={e.twitter_url} icon={Twitter} isLink linkType="url" />
      </CollapsibleSection>
    </div>
  );
}

function ContactDetails({ entity }: { entity: ContactEntity }) {
  const e = entity as any;
  return (
    <div>
      <CollapsibleSection title="Dados do Contacto">
        <FieldRow label="Email" value={entity.email} icon={Mail} isLink linkType="email" />
        <FieldRow label="Telefone" value={entity.phone} icon={Phone} isLink linkType="phone" />
        <FieldRow label="Empresa" value={entity.company} icon={Building2} />
        <FieldRow label="Cargo" value={entity.job_title} icon={Briefcase} />
        <FieldRow label="NIF" value={e.tax_id} />
        {entity.tags && entity.tags.length > 0 && (
          <div className="pt-1">
            <span className="text-sm text-muted-foreground">Tags</span>
            <TagList tags={entity.tags} />
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Morada" defaultOpen={false}>
        <FieldRow label="Morada" value={e.address} icon={MapPin} />
        <FieldRow label="Cidade" value={e.city} />
        <FieldRow label="Cód. Postal" value={e.postal_code} />
        <FieldRow label="País" value={e.country} />
      </CollapsibleSection>

      <CollapsibleSection title="Redes Sociais" defaultOpen={false}>
        <FieldRow label="LinkedIn" value={e.linkedin_url} icon={Linkedin} isLink linkType="url" />
        <FieldRow label="Facebook" value={e.facebook_url} icon={Facebook} isLink linkType="url" />
        <FieldRow label="Instagram" value={e.instagram_url} icon={Instagram} isLink linkType="url" />
      </CollapsibleSection>
    </div>
  );
}

function LeadDetails({ entity }: { entity: LeadEntity }) {
  const e = entity as any;
  return (
    <div>
      <CollapsibleSection title="Dados do Lead">
        <FieldRow label="Email" value={entity.email} icon={Mail} isLink linkType="email" />
        <FieldRow label="Telefone" value={entity.phone} icon={Phone} isLink linkType="phone" />
        <FieldRow label="Fonte" value={entity.source} icon={TrendingUp} />
        <FieldRow label="Empresa" value={entity.company} icon={Building2} />
        {entity.tags && entity.tags.length > 0 && (
          <div className="pt-1">
            <span className="text-sm text-muted-foreground">Tags</span>
            <TagList tags={entity.tags} />
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Redes Sociais" defaultOpen={false}>
        <FieldRow label="LinkedIn" value={e.linkedin_url} icon={Linkedin} isLink linkType="url" />
        <FieldRow label="Instagram" value={e.instagram_url} icon={Instagram} isLink linkType="url" />
      </CollapsibleSection>
    </div>
  );
}
