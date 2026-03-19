import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Save,
  User,
  Briefcase,
  Phone,
  Globe,
  Linkedin,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
  Palette,
  Eye,
  Settings2,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignatureData {
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  linkedin: string;
  twitter: string;
  instagram: string;
  facebook: string;
  youtube: string;
  whatsapp: string;
  logoUrl: string;
  avatarUrl: string;
  primaryColor: string;
  layout: 'horizontal' | 'vertical' | 'minimal';
  showAvatar: boolean;
  showLogo: boolean;
  showSocials: boolean;
  fontFamily: string;
}

const defaultData: SignatureData = {
  fullName: '',
  jobTitle: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  linkedin: '',
  twitter: '',
  instagram: '',
  facebook: '',
  youtube: '',
  whatsapp: '',
  logoUrl: '',
  avatarUrl: '',
  primaryColor: '#C28816',
  layout: 'horizontal',
  showAvatar: false,
  showLogo: false,
  showSocials: true,
  fontFamily: 'Arial',
};

const fontOptions = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Tahoma', label: 'Tahoma' },
  { value: "'Trebuchet MS'", label: 'Trebuchet MS' },
];

const layoutOptions = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'minimal', label: 'Minimalista' },
];

interface EmailSignatureEditorProps {
  initialSignature?: string;
  onSave: (html: string, data: SignatureData) => void;
  isSaving?: boolean;
}

export function EmailSignatureEditor({ initialSignature, onSave, isSaving }: EmailSignatureEditorProps) {
  const [data, setData] = useState<SignatureData>(() => {
    // Try to parse initial data from stored JSON, fallback to defaults
    if (initialSignature) {
      try {
        const parsed = JSON.parse(initialSignature);
        if (parsed._signatureData) return { ...defaultData, ...parsed._signatureData };
      } catch {
        // Not JSON, use plain text as name fallback
        return { ...defaultData, fullName: initialSignature };
      }
    }
    return defaultData;
  });

  const update = (field: keyof SignatureData, value: string | boolean) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Generate HTML signature
  const signatureHtml = useMemo(() => generateSignatureHtml(data), [data]);

  const handleSave = () => {
    const payload = JSON.stringify({ _signatureData: data, html: signatureHtml });
    onSave(payload, data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Assinatura de email</Label>
          <p className="text-sm text-muted-foreground mt-0.5">
            Personalize a sua assinatura profissional
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="sm"
          className="gap-2 rounded-xl"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'A gravar...' : 'Gravar assinatura'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="w-full rounded-none border-b border-border/50 bg-transparent h-11 px-2">
              <TabsTrigger value="info" className="gap-1.5 text-xs data-[state=active]:bg-accent rounded-lg">
                <User className="h-3.5 w-3.5" />
                Informações
              </TabsTrigger>
              <TabsTrigger value="social" className="gap-1.5 text-xs data-[state=active]:bg-accent rounded-lg">
                <Globe className="h-3.5 w-3.5" />
                Social
              </TabsTrigger>
              <TabsTrigger value="style" className="gap-1.5 text-xs data-[state=active]:bg-accent rounded-lg">
                <Palette className="h-3.5 w-3.5" />
                Estilo
              </TabsTrigger>
              <TabsTrigger value="options" className="gap-1.5 text-xs data-[state=active]:bg-accent rounded-lg">
                <Settings2 className="h-3.5 w-3.5" />
                Opções
              </TabsTrigger>
            </TabsList>

            <div className="p-4 space-y-4">
              <TabsContent value="info" className="mt-0 space-y-3">
                <InputField icon={User} label="Nome completo" value={data.fullName} onChange={v => update('fullName', v)} placeholder="Jorge Cardoso" />
                <InputField icon={Briefcase} label="Cargo" value={data.jobTitle} onChange={v => update('jobTitle', v)} placeholder="CEO & Founder" />
                <InputField icon={Briefcase} label="Empresa" value={data.company} onChange={v => update('company', v)} placeholder="Metodopare" />
                <InputField icon={Phone} label="Telefone" value={data.phone} onChange={v => update('phone', v)} placeholder="+351 912 345 678" />
                <InputField icon={Globe} label="Website" value={data.website} onChange={v => update('website', v)} placeholder="www.metodopare.ai" />
                <InputField icon={MapPin} label="Morada" value={data.address} onChange={v => update('address', v)} placeholder="Lisboa, Portugal" />
              </TabsContent>

              <TabsContent value="social" className="mt-0 space-y-3">
                <InputField icon={Linkedin} label="LinkedIn" value={data.linkedin} onChange={v => update('linkedin', v)} placeholder="linkedin.com/in/username" />
                <InputField icon={Twitter} label="X (Twitter)" value={data.twitter} onChange={v => update('twitter', v)} placeholder="x.com/username" />
                <InputField icon={Instagram} label="Instagram" value={data.instagram} onChange={v => update('instagram', v)} placeholder="instagram.com/username" />
                <InputField icon={Facebook} label="Facebook" value={data.facebook} onChange={v => update('facebook', v)} placeholder="facebook.com/page" />
                <InputField icon={Youtube} label="YouTube" value={data.youtube} onChange={v => update('youtube', v)} placeholder="youtube.com/@channel" />
                <InputField icon={MessageCircle} label="WhatsApp" value={data.whatsapp} onChange={v => update('whatsapp', v)} placeholder="wa.me/351..." />
                <Separator />
                <InputField icon={User} label="URL do avatar" value={data.avatarUrl} onChange={v => update('avatarUrl', v)} placeholder="https://..." />
                <InputField icon={Briefcase} label="URL do logotipo" value={data.logoUrl} onChange={v => update('logoUrl', v)} placeholder="https://..." />
              </TabsContent>

              <TabsContent value="style" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cor principal</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={data.primaryColor}
                      onChange={e => update('primaryColor', e.target.value)}
                      className="w-10 h-10 rounded-xl border border-border/50 cursor-pointer bg-transparent p-0.5"
                    />
                    <Input
                      value={data.primaryColor}
                      onChange={e => update('primaryColor', e.target.value)}
                      className="w-32 h-10 rounded-xl text-xs font-mono"
                    />
                    {/* Quick presets */}
                    <div className="flex gap-1.5">
                      {['#C28816', '#2563EB', '#059669', '#7C3AED', '#DC2626', '#0F172A'].map(color => (
                        <button
                          key={color}
                          className={cn(
                            "w-7 h-7 rounded-lg border-2 transition-all duration-200 hover:scale-110",
                            data.primaryColor === color ? "border-foreground shadow-md" : "border-transparent"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() => update('primaryColor', color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Fonte</Label>
                  <Select value={data.fontFamily} onValueChange={v => update('fontFamily', v)}>
                    <SelectTrigger className="rounded-xl h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map(f => (
                        <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Layout</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {layoutOptions.map(l => (
                      <button
                        key={l.value}
                        className={cn(
                          "px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200",
                          data.layout === l.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => update('layout', l.value)}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="options" className="mt-0 space-y-4">
                <ToggleOption label="Mostrar avatar" description="Foto de perfil na assinatura" checked={data.showAvatar} onChange={v => update('showAvatar', v)} />
                <ToggleOption label="Mostrar logotipo" description="Logotipo da empresa" checked={data.showLogo} onChange={v => update('showLogo', v)} />
                <ToggleOption label="Mostrar redes sociais" description="Links para LinkedIn, X, Instagram, Facebook, YouTube, WhatsApp" checked={data.showSocials} onChange={v => update('showSocials', v)} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Eye className="h-4 w-4" />
            Pré-visualização
          </div>
          <div className="rounded-2xl border border-border/50 bg-background p-6 min-h-[200px]">
            <div className="border-t-2 border-border/30 pt-4 mt-2">
              <div dangerouslySetInnerHTML={{ __html: signatureHtml }} />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            A assinatura será adicionada automaticamente aos seus emails enviados
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function InputField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</Label>
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 rounded-lg border-border/30 bg-transparent text-sm px-2 focus-visible:ring-1"
        />
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ── HTML Generator ──

function generateSignatureHtml(data: SignatureData): string {
  const {
    fullName, jobTitle, company, email, phone, website, address,
    linkedin, twitter, instagram, facebook, youtube, whatsapp,
    logoUrl, avatarUrl,
    primaryColor, layout, showAvatar, showLogo, showSocials, fontFamily,
  } = data;

  if (!fullName && !company) {
    return '<p style="color:#999;font-size:13px;font-style:italic;">Preencha os campos para ver a pré-visualização</p>';
  }

  const socialLinks: string[] = [];
  if (showSocials) {
    if (linkedin) socialLinks.push(`<a href="${ensureUrl(linkedin)}" style="color:${primaryColor};text-decoration:none;font-size:12px;" target="_blank">LinkedIn</a>`);
    if (twitter) socialLinks.push(`<a href="${ensureUrl(twitter)}" style="color:${primaryColor};text-decoration:none;font-size:12px;" target="_blank">X</a>`);
    if (instagram) socialLinks.push(`<a href="${ensureUrl(instagram)}" style="color:${primaryColor};text-decoration:none;font-size:12px;" target="_blank">Instagram</a>`);
    if (facebook) socialLinks.push(`<a href="${ensureUrl(facebook)}" style="color:${primaryColor};text-decoration:none;font-size:12px;" target="_blank">Facebook</a>`);
    if (youtube) socialLinks.push(`<a href="${ensureUrl(youtube)}" style="color:${primaryColor};text-decoration:none;font-size:12px;" target="_blank">YouTube</a>`);
    if (whatsapp) socialLinks.push(`<a href="${ensureUrl(whatsapp)}" style="color:${primaryColor};text-decoration:none;font-size:12px;" target="_blank">WhatsApp</a>`);
  }

  const avatarHtml = showAvatar && avatarUrl
    ? `<img src="${avatarUrl}" alt="${fullName}" width="56" height="56" style="border-radius:50%;object-fit:cover;margin-right:14px;" />`
    : '';

  const logoHtml = showLogo && logoUrl
    ? `<img src="${logoUrl}" alt="${company}" height="28" style="margin-top:8px;display:block;" />`
    : '';

  const contactParts: string[] = [];
  if (phone) contactParts.push(`<span>${phone}</span>`);
  if (website) contactParts.push(`<a href="${ensureUrl(website)}" style="color:${primaryColor};text-decoration:none;" target="_blank">${website.replace(/^https?:\/\//, '')}</a>`);
  if (address) contactParts.push(`<span>${address}</span>`);

  const contactLine = contactParts.length > 0
    ? `<p style="margin:4px 0 0;font-size:12px;color:#777;">${contactParts.join(' &nbsp;|&nbsp; ')}</p>`
    : '';

  const socialLine = socialLinks.length > 0
    ? `<p style="margin:6px 0 0;font-size:12px;">${socialLinks.join(' &nbsp;·&nbsp; ')}</p>`
    : '';

  if (layout === 'minimal') {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${fontFamily},sans-serif;">
      <tr><td>
        <p style="margin:0;font-size:14px;font-weight:600;color:#222;">${fullName}</p>
        ${jobTitle || company ? `<p style="margin:2px 0 0;font-size:12px;color:#777;">${[jobTitle, company].filter(Boolean).join(' · ')}</p>` : ''}
        ${contactLine}
        ${socialLine}
      </td></tr>
    </table>`;
  }

  if (layout === 'vertical') {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${fontFamily},sans-serif;">
      <tr><td style="padding-bottom:8px;">
        ${avatarHtml}
        <p style="margin:0;font-size:16px;font-weight:700;color:#222;">${fullName}</p>
        ${jobTitle ? `<p style="margin:2px 0 0;font-size:13px;color:${primaryColor};font-weight:500;">${jobTitle}</p>` : ''}
        ${company ? `<p style="margin:2px 0 0;font-size:12px;color:#555;">${company}</p>` : ''}
      </td></tr>
      <tr><td style="border-top:2px solid ${primaryColor};padding-top:8px;">
        ${contactLine}
        ${socialLine}
        ${logoHtml}
      </td></tr>
    </table>`;
  }

  // Horizontal (default)
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:${fontFamily},sans-serif;">
    <tr>
      ${avatarHtml ? `<td style="vertical-align:top;padding-right:14px;">${avatarHtml}</td>` : ''}
      <td style="vertical-align:top;${avatarHtml ? `border-left:2px solid ${primaryColor};padding-left:14px;` : `border-left:2px solid ${primaryColor};padding-left:14px;`}">
        <p style="margin:0;font-size:16px;font-weight:700;color:#222;">${fullName}</p>
        ${jobTitle ? `<p style="margin:2px 0 0;font-size:13px;color:${primaryColor};font-weight:500;">${jobTitle}</p>` : ''}
        ${company ? `<p style="margin:1px 0 0;font-size:12px;color:#555;">${company}</p>` : ''}
        ${contactLine}
        ${socialLine}
        ${logoHtml}
      </td>
    </tr>
  </table>`;
}

function ensureUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}
