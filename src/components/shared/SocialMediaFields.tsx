import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Linkedin, Facebook, Instagram, Twitter, Youtube, Pin, MessageCircle, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import {
  type SocialNetwork,
  normalizeSocialValue,
  parseSocialProfile,
  socialPlaceholder,
} from "@/lib/social/socialProfiles";

// TikTok SVG icon (not available in lucide)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.16 15a6.34 6.34 0 0 0 6.33 6.33 6.34 6.34 0 0 0 6.33-6.33V8.28a8.28 8.28 0 0 0 4.77 1.51V6.35a4.85 4.85 0 0 1-1-.16z" />
    </svg>
  );
}

interface SocialMediaFieldsProps {
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  pinterestUrl?: string;
  whatsappUrl?: string;
  onChange: (field: string, value: string) => void;
}

interface SocialFieldProps {
  id: string;
  label: string;
  icon: ReactNode;
  network: SocialNetwork;
  value: string;
  onChange: (field: string, value: string) => void;
}

function SocialField({ id, label, icon, network, value, onChange }: SocialFieldProps) {
  const parsed = parseSocialProfile(network, value);
  const hasValue = !!value.trim();

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </Label>
      <Input
        id={id}
        placeholder={socialPlaceholder(network)}
        value={value}
        onChange={(e) => onChange(id, e.target.value)}
        onBlur={(e) => {
          const normalized = normalizeSocialValue(network, e.target.value) ?? "";
          if (normalized !== e.target.value) onChange(id, normalized);
        }}
      />
      {hasValue && parsed && (
        <p className="text-[11px] text-muted-foreground">Perfil: {parsed.displayHandle}</p>
      )}
      {hasValue && !parsed && (
        <p className="text-[11px] text-amber-600 dark:text-amber-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Não reconhecido — indique o @utilizador ou o endereço do perfil.
        </p>
      )}
    </div>
  );
}

export function SocialMediaFields({
  linkedinUrl = "",
  facebookUrl = "",
  instagramUrl = "",
  twitterUrl = "",
  youtubeUrl = "",
  tiktokUrl = "",
  pinterestUrl = "",
  whatsappUrl = "",
  onChange,
}: SocialMediaFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-sm font-medium">Redes Sociais</Label>
        <p className="text-xs text-muted-foreground">
          Basta indicar o @utilizador — também aceitamos o endereço completo.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SocialField id="linkedin_url" label="LinkedIn" network="linkedin" value={linkedinUrl} onChange={onChange} icon={<Linkedin className="h-3 w-3" />} />
        <SocialField id="facebook_url" label="Facebook" network="facebook" value={facebookUrl} onChange={onChange} icon={<Facebook className="h-3 w-3" />} />
        <SocialField id="instagram_url" label="Instagram" network="instagram" value={instagramUrl} onChange={onChange} icon={<Instagram className="h-3 w-3" />} />
        <SocialField id="twitter_url" label="Twitter/X" network="twitter" value={twitterUrl} onChange={onChange} icon={<Twitter className="h-3 w-3" />} />
        <SocialField id="youtube_url" label="YouTube" network="youtube" value={youtubeUrl} onChange={onChange} icon={<Youtube className="h-3 w-3" />} />
        <SocialField id="tiktok_url" label="TikTok" network="tiktok" value={tiktokUrl} onChange={onChange} icon={<TikTokIcon className="h-3 w-3" />} />
        <SocialField id="pinterest_url" label="Pinterest" network="pinterest" value={pinterestUrl} onChange={onChange} icon={<Pin className="h-3 w-3" />} />
        <SocialField id="whatsapp_url" label="WhatsApp Business" network="whatsapp" value={whatsappUrl} onChange={onChange} icon={<MessageCircle className="h-3 w-3" />} />
      </div>
    </div>
  );
}
