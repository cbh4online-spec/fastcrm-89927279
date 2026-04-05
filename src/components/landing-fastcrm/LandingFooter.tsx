import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ExternalLink, BookOpen, Scale, Mail, Phone, MapPin } from "lucide-react";
import { usePublicCompanyData } from "@/modules/growth-seo/hooks/usePublicCompanyData";

export function LandingFooter() {
  const { t } = useTranslation("landing");
  const { company, fullAddress, socialLinks } = usePublicCompanyData();

  return (
    <footer className="border-t border-[hsl(217,33%,17%)] py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Main footer grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand + Company identification (DL 7/2004) */}
          <div className="space-y-3">
            <span className="font-black uppercase tracking-wide text-sm text-[hsl(210,40%,98%)]">
              FAST<span className="text-primary">CRM</span>
            </span>
            <div className="text-xs text-[hsl(215,20%,55%)] leading-relaxed space-y-1.5">
              {company.company_name && (
                <p className="font-medium text-[hsl(215,20%,65%)]">{company.company_name}</p>
              )}
              {company.nif && <p>NIF: {company.nif}</p>}
              {fullAddress && (
                <p className="flex items-start gap-1.5">
                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {fullAddress}
                </p>
              )}
              {company.email_general && (
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <a href={`mailto:${company.email_general}`} className="hover:text-[hsl(210,40%,98%)] transition-colors">
                    {company.email_general}
                  </a>
                </p>
              )}
              {company.phone && (
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 flex-shrink-0" />
                  <a href={`tel:${company.phone}`} className="hover:text-[hsl(210,40%,98%)] transition-colors">
                    {company.phone}
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Product links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[hsl(210,40%,98%)] uppercase tracking-wider">Produto</h4>
            <nav className="flex flex-col gap-2 text-xs text-[hsl(215,20%,55%)]">
              <Link to="/pricing" className="hover:text-[hsl(210,40%,98%)] transition-colors">Preços</Link>
              <Link to="/changelog" className="hover:text-[hsl(210,40%,98%)] transition-colors">Changelog</Link>
              <Link to="/fastclub" className="hover:text-[hsl(210,40%,98%)] transition-colors">FastClub</Link>
            </nav>
          </div>

          {/* Legal links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[hsl(210,40%,98%)] uppercase tracking-wider">Legal</h4>
            <nav className="flex flex-col gap-2 text-xs text-[hsl(215,20%,55%)]">
              <Link to="/terms" className="hover:text-[hsl(210,40%,98%)] transition-colors">{t("footer.terms")}</Link>
              <Link to="/privacy" className="hover:text-[hsl(210,40%,98%)] transition-colors">{t("footer.privacy")}</Link>
              <Link to="/cookies" className="hover:text-[hsl(210,40%,98%)] transition-colors">Política de Cookies</Link>
              <Link to="/gdpr" className="hover:text-[hsl(210,40%,98%)] transition-colors">{t("footer.gdpr")}</Link>
            </nav>
          </div>

          {/* Compliance links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[hsl(210,40%,98%)] uppercase tracking-wider">Resolução de Conflitos</h4>
            <nav className="flex flex-col gap-2 text-xs text-[hsl(215,20%,55%)]">
              <a
                href="https://www.livroreclamacoes.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[hsl(210,40%,98%)] transition-colors"
              >
                <BookOpen className="h-3 w-3" />
                Livro de Reclamações
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[hsl(210,40%,98%)] transition-colors"
              >
                <Scale className="h-3 w-3" />
                Resolução de Litígios (RAL)
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </nav>
          </div>
        </div>

        {/* Legal compliance text */}
        <div className="border-t border-[hsl(217,33%,17%)] pt-6 space-y-3 text-[10px] text-[hsl(215,20%,45%)] leading-relaxed">
          <p className="text-center">
            Em caso de litígio, o consumidor pode recorrer à Plataforma Europeia de Resolução de Litígios em Linha, disponível em{" "}
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[hsl(215,20%,65%)] transition-colors"
            >
              ec.europa.eu/consumers/odr
            </a>
            , nos termos do Regulamento (UE) 524/2013 e do DL 144/2015.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs text-[hsl(215,20%,55%)]">
            <span>&copy; {new Date().getFullYear()} FastCRM. {t("footer.allRightsReserved")}</span>
            {socialLinks && (
              <div className="flex items-center gap-4">
                {socialLinks.linkedin_url && (
                  <a href={socialLinks.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(210,40%,98%)] transition-colors">LinkedIn</a>
                )}
                {socialLinks.instagram_url && (
                  <a href={socialLinks.instagram_url} target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(210,40%,98%)] transition-colors">Instagram</a>
                )}
                {socialLinks.facebook_url && (
                  <a href={socialLinks.facebook_url} target="_blank" rel="noopener noreferrer" className="hover:text-[hsl(210,40%,98%)] transition-colors">Facebook</a>
                )}
              </div>
            )}
            <span className="text-[10px] opacity-40 select-none" aria-hidden="true">v20260313-2130</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
