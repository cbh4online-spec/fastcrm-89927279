import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Linkedin, Facebook, Instagram, Twitter, Youtube, Pin, MessageCircle } from "lucide-react";

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

        <div className="space-y-2">
          <Label htmlFor="youtube_url" className="text-xs text-muted-foreground flex items-center gap-1">
            <Youtube className="h-3 w-3" /> YouTube
          </Label>
          <Input
            id="youtube_url"
            placeholder="https://youtube.com/@..."
            value={youtubeUrl}
            onChange={(e) => onChange("youtube_url", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tiktok_url" className="text-xs text-muted-foreground flex items-center gap-1">
            <TikTokIcon className="h-3 w-3" /> TikTok
          </Label>
          <Input
            id="tiktok_url"
            placeholder="https://tiktok.com/@..."
            value={tiktokUrl}
            onChange={(e) => onChange("tiktok_url", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pinterest_url" className="text-xs text-muted-foreground flex items-center gap-1">
            <Pin className="h-3 w-3" /> Pinterest
          </Label>
          <Input
            id="pinterest_url"
            placeholder="https://pinterest.com/..."
            value={pinterestUrl}
            onChange={(e) => onChange("pinterest_url", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp_url" className="text-xs text-muted-foreground flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> WhatsApp Business
          </Label>
          <Input
            id="whatsapp_url"
            placeholder="https://wa.me/..."
            value={whatsappUrl}
            onChange={(e) => onChange("whatsapp_url", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
