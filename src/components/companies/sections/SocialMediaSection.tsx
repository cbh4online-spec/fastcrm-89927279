import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { Company } from "@/hooks/useCompanies";
import { Share2, Linkedin, Instagram, Facebook, Twitter, Youtube, Pin, MessageCircle } from "lucide-react";

// TikTok SVG icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.16 15a6.34 6.34 0 0 0 6.33 6.33 6.34 6.34 0 0 0 6.33-6.33V8.28a8.28 8.28 0 0 0 4.77 1.51V6.35a4.85 4.85 0 0 1-1-.16z" />
    </svg>
  );
}

interface SocialMediaSectionProps {
  company: Company;
  onFieldChange: (field: keyof Company, value: unknown) => Promise<void>;
}

function buildWhatsAppUrlFromPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 6) return null;
  // Se não tem indicativo internacional, assumir Portugal (351)
  const withCountry = digits.length <= 9 ? `351${digits}` : digits;
  return `https://wa.me/${withCountry}`;
}

export function SocialMediaSection({ company, onFieldChange }: SocialMediaSectionProps) {
  const storedWhatsApp = (company as any).whatsapp_url as string | null | undefined;
  const fallbackWhatsApp = buildWhatsAppUrlFromPhone(company.phone);
  const effectiveWhatsApp = storedWhatsApp || fallbackWhatsApp || "";
  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
      <CardHeader className="pb-3 bg-gradient-to-r from-pink-500/10 via-transparent to-transparent">
        <CardTitle className="text-base font-semibold flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-500/20 text-pink-600 dark:text-pink-400">
            <Share2 className="w-4 h-4" />
          </div>
          Redes Sociais
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/50">
          <InlineEditableField
            label="LinkedIn"
            fieldId="linkedin_url"
            fieldType="text"
            value={company.linkedin_url}
            onChange={(val) => onFieldChange("linkedin_url", val)}
            icon={<Linkedin className="w-4 h-4" />}
            isLink={!!company.linkedin_url}
            linkType="url"
            placeholder="https://linkedin.com/company/..."
          />
          <InlineEditableField
            label="Instagram"
            fieldId="instagram_url"
            fieldType="text"
            value={company.instagram_url}
            onChange={(val) => onFieldChange("instagram_url", val)}
            icon={<Instagram className="w-4 h-4" />}
            isLink={!!company.instagram_url}
            linkType="url"
            placeholder="https://instagram.com/..."
          />
          <InlineEditableField
            label="Facebook"
            fieldId="facebook_url"
            fieldType="text"
            value={company.facebook_url}
            onChange={(val) => onFieldChange("facebook_url", val)}
            icon={<Facebook className="w-4 h-4" />}
            isLink={!!company.facebook_url}
            linkType="url"
            placeholder="https://facebook.com/..."
          />
          <InlineEditableField
            label="Twitter/X"
            fieldId="twitter_url"
            fieldType="text"
            value={company.twitter_url}
            onChange={(val) => onFieldChange("twitter_url", val)}
            icon={<Twitter className="w-4 h-4" />}
            isLink={!!company.twitter_url}
            linkType="url"
            placeholder="https://x.com/..."
          />
          <InlineEditableField
            label="YouTube"
            fieldId="youtube_url"
            fieldType="text"
            value={(company as any).youtube_url}
            onChange={(val) => onFieldChange("youtube_url" as keyof Company, val)}
            icon={<Youtube className="w-4 h-4" />}
            isLink={!!(company as any).youtube_url}
            linkType="url"
            placeholder="https://youtube.com/@..."
          />
          <InlineEditableField
            label="TikTok"
            fieldId="tiktok_url"
            fieldType="text"
            value={(company as any).tiktok_url}
            onChange={(val) => onFieldChange("tiktok_url" as keyof Company, val)}
            icon={<TikTokIcon className="w-4 h-4" />}
            isLink={!!(company as any).tiktok_url}
            linkType="url"
            placeholder="https://tiktok.com/@..."
          />
          <InlineEditableField
            label="Pinterest"
            fieldId="pinterest_url"
            fieldType="text"
            value={(company as any).pinterest_url}
            onChange={(val) => onFieldChange("pinterest_url" as keyof Company, val)}
            icon={<Pin className="w-4 h-4" />}
            isLink={!!(company as any).pinterest_url}
            linkType="url"
            placeholder="https://pinterest.com/..."
          />
          <InlineEditableField
            label="WhatsApp Business"
            fieldId="whatsapp_url"
            fieldType="text"
            value={effectiveWhatsApp}
            onChange={(val) => onFieldChange("whatsapp_url" as keyof Company, val)}
            icon={<MessageCircle className="w-4 h-4" />}
            isLink={!!effectiveWhatsApp}
            linkType="url"
            placeholder="https://wa.me/..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
