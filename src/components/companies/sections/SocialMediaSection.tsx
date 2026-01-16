import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineEditableField } from "@/components/custom-fields/InlineEditableField";
import { Company } from "@/hooks/useCompanies";
import { Share2, Linkedin, Instagram, Facebook, Twitter } from "lucide-react";

interface SocialMediaSectionProps {
  company: Company;
  onFieldChange: (field: keyof Company, value: unknown) => Promise<void>;
}

export function SocialMediaSection({ company, onFieldChange }: SocialMediaSectionProps) {
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
        </div>
      </CardContent>
    </Card>
  );
}
