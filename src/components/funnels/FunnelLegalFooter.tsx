import { Link } from "react-router-dom";
import { ExternalLink, BookOpen, Scale, Mail, Phone, MapPin } from "lucide-react";
import { usePublicCompanyData } from "@/modules/growth-seo/hooks/usePublicCompanyData";

/**
 * Footer legal obrigatório para todas as páginas públicas (funis e landing pages).
 * Cumpre DL 7/2004 (identificação do prestador), DL 144/2015 (RAL) e Reg. (UE) 524/2013 (ODR).
 */
export function FunnelLegalFooter() {
  const { company, fullAddress, socialLinks } = usePublicCompanyData();

  return (
    <footer className="border-t border-border mt-16 pt-8 pb-6">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        {/* Company identification (DL 7/2004) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-muted-foreground">
          <div className="space-y-1.5">
            {company.company_name && (
              <p className="font-medium text-foreground/70">{company.company_name}</p>
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
                <a href={`mailto:${company.email_general}`} className="hover:text-foreground transition-colors">
                  {company.email_general}
                </a>
              </p>
            )}
            {company.phone && (
              <p className="flex items-center gap-1.5">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <a href={`tel:${company.phone}`} className="hover:text-foreground transition-colors">
                  {company.phone}
                </a>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="font-medium text-foreground/70">Legal</p>
            <nav className="flex flex-col gap-1">
              <Link to="/terms" className="hover:text-foreground transition-colors">Termos e Condições</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
              <Link to="/cookies" className="hover:text-foreground transition-colors">Política de Cookies</Link>
              <a
                href="https://www.livroreclamacoes.pt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <BookOpen className="h-3 w-3" />
                Livro de Reclamações
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Scale className="h-3 w-3" />
                Resolução de Litígios (RAL)
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </nav>
          </div>
        </div>

        {/* ODR / RAL legal text */}
        <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
          Em caso de litígio, o consumidor pode recorrer à Plataforma Europeia de Resolução de Litígios em Linha, disponível em{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-muted-foreground transition-colors"
          >
            ec.europa.eu/consumers/odr
          </a>
          , nos termos do Regulamento (UE) 524/2013 e do DL 144/2015.
        </p>

        <p className="text-[10px] text-muted-foreground/40 text-center">
          &copy; {new Date().getFullYear()} FastCRM. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
