import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function LandingFooter() {
  const { t } = useTranslation("landing");
  return (
    <footer className="border-t border-[hsl(217,33%,17%)] py-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[hsl(215,20%,55%)]">
          <span className="font-black uppercase tracking-wide text-sm text-[hsl(210,40%,98%)]">
            FAST<span className="text-primary">CRM</span>
          </span>
          <nav className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-[hsl(210,40%,98%)] transition-colors">{t("footer.privacy")}</Link>
            <Link to="/terms" className="hover:text-[hsl(210,40%,98%)] transition-colors">{t("footer.terms")}</Link>
            <Link to="/gdpr" className="hover:text-[hsl(210,40%,98%)] transition-colors">{t("footer.gdpr")}</Link>
          </nav>
          <span>&copy; {new Date().getFullYear()} FastCRM. {t("footer.allRightsReserved")}</span>
        </div>
      </div>
    </footer>
  );
}
