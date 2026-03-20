import { Link } from "react-router-dom";
import { Zap, Facebook, Instagram, Linkedin, Youtube, Twitter, MessageCircle, Globe, ExternalLink } from "lucide-react";
import type { VerticalConfig } from "@/config/verticalConfigs";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.16 15a6.34 6.34 0 0 0 6.33 6.33 6.34 6.34 0 0 0 6.33-6.33V8.28a8.28 8.28 0 0 0 4.77 1.51V6.35a4.85 4.85 0 0 1-1-.16z" />
    </svg>
  );
}

interface Props {
  config: VerticalConfig;
}

const socialIcons: { key: string; icon: React.ReactNode; label: string }[] = [
  { key: "facebook", icon: <Facebook className="h-4 w-4" />, label: "Facebook" },
  { key: "instagram", icon: <Instagram className="h-4 w-4" />, label: "Instagram" },
  { key: "linkedin", icon: <Linkedin className="h-4 w-4" />, label: "LinkedIn" },
  { key: "youtube", icon: <Youtube className="h-4 w-4" />, label: "YouTube" },
  { key: "twitter", icon: <Twitter className="h-4 w-4" />, label: "X" },
  { key: "tiktok", icon: <TikTokIcon className="h-4 w-4" />, label: "TikTok" },
  { key: "whatsapp", icon: <MessageCircle className="h-4 w-4" />, label: "WhatsApp" },
  { key: "website", icon: <Globe className="h-4 w-4" />, label: "Website" },
];

export function VerticalFooter({ config }: Props) {
  const links = config.social_links || {};
  const activeSocials = socialIcons.filter((s) => links[s.key as keyof typeof links]);
  const publications = links.publications?.filter((p) => p.title && p.url) || [];

  return (
    <footer className="border-t border-[hsl(217,33%,17%)] py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Social icons row */}
        {activeSocials.length > 0 && (
          <div className="flex items-center justify-center gap-4 mb-8">
            {activeSocials.map((s) => (
              <a
                key={s.key}
                href={links[s.key as keyof typeof links] as string}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="w-10 h-10 rounded-full bg-[hsl(217,33%,12%)] flex items-center justify-center text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217,33%,17%)] transition-colors"
              >
                {s.icon}
              </a>
            ))}
          </div>
        )}

        {/* Publications */}
        {publications.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            {publications.map((pub, i) => (
              <a
                key={i}
                href={pub.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[hsl(215,20%,65%)] hover:text-[hsl(210,40%,98%)] transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                {pub.title}
              </a>
            ))}
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold">FastCRM</span>
            <span className="text-xs text-[hsl(215,20%,65%)] ml-2">
              para {config.nome}
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-[hsl(215,20%,65%)]">
            <Link to="/privacy" className="hover:text-[hsl(210,40%,98%)] transition-colors">Privacidade</Link>
            <Link to="/terms" className="hover:text-[hsl(210,40%,98%)] transition-colors">Termos</Link>
            <Link to="/gdpr" className="hover:text-[hsl(210,40%,98%)] transition-colors">RGPD</Link>
          </nav>

          <div className="text-xs text-[hsl(215,20%,65%)]">
            &copy; {new Date().getFullYear()} FastCRM. Todos os direitos reservados.
          </div>
        </div>
      </div>
    </footer>
  );
}
