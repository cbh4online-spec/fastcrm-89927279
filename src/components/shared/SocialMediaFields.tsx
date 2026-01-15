import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Linkedin, Facebook, Instagram, Twitter } from "lucide-react";

interface SocialMediaFieldsProps {
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  onChange: (field: string, value: string) => void;
}

export function SocialMediaFields({
  linkedinUrl = "",
  facebookUrl = "",
  instagramUrl = "",
  twitterUrl = "",
  onChange,
}: SocialMediaFieldsProps) {
  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Redes Sociais</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="linkedin_url" className="text-xs text-muted-foreground flex items-center gap-1">
            <Linkedin className="h-3 w-3" /> LinkedIn
          </Label>
          <Input
            id="linkedin_url"
            placeholder="https://linkedin.com/in/..."
            value={linkedinUrl}
            onChange={(e) => onChange("linkedin_url", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="facebook_url" className="text-xs text-muted-foreground flex items-center gap-1">
            <Facebook className="h-3 w-3" /> Facebook
          </Label>
          <Input
            id="facebook_url"
            placeholder="https://facebook.com/..."
            value={facebookUrl}
            onChange={(e) => onChange("facebook_url", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram_url" className="text-xs text-muted-foreground flex items-center gap-1">
            <Instagram className="h-3 w-3" /> Instagram
          </Label>
          <Input
            id="instagram_url"
            placeholder="https://instagram.com/..."
            value={instagramUrl}
            onChange={(e) => onChange("instagram_url", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="twitter_url" className="text-xs text-muted-foreground flex items-center gap-1">
            <Twitter className="h-3 w-3" /> X (Twitter)
          </Label>
          <Input
            id="twitter_url"
            placeholder="https://x.com/..."
            value={twitterUrl}
            onChange={(e) => onChange("twitter_url", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
