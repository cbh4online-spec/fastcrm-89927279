import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-[hsl(217,33%,17%)] py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold">FastCRM</span>
            <span className="text-xs text-[hsl(215,20%,65%)] ml-2">
              AI-Native Revenue CRM
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-[hsl(215,20%,65%)]">
            <Link to="/privacy" className="hover:text-[hsl(210,40%,98%)] transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-[hsl(210,40%,98%)] transition-colors">
              Terms
            </Link>
            <Link to="/gdpr" className="hover:text-[hsl(210,40%,98%)] transition-colors">
              GDPR
            </Link>
          </nav>

          <div className="text-xs text-[hsl(215,20%,65%)]">
            &copy; {new Date().getFullYear()} FastCRM. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
