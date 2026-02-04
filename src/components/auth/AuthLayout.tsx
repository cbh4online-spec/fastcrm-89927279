import { ReactNode } from "react";
import { Building2, CheckCircle, Star } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - AIDA Marketing */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary p-12 flex-col justify-between">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-primary-foreground">FastCRM</span>
        </div>
        
        <div className="space-y-8">
          {/* ATENÇÃO - Headline impactante */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-primary-foreground leading-tight">
              Transforme leads em clientes
            </h1>
            <p className="text-xl text-primary-foreground/90">
              com o CRM mais inteligente de Portugal
            </p>
          </div>

          {/* INTERESSE - Lista de benefícios */}
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-primary-foreground">
              <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
              <span>Gestão de contactos simplificada</span>
            </li>
            <li className="flex items-center gap-3 text-primary-foreground">
              <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
              <span>Automação de vendas com IA</span>
            </li>
            <li className="flex items-center gap-3 text-primary-foreground">
              <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
              <span>Relatórios em tempo real</span>
            </li>
            <li className="flex items-center gap-3 text-primary-foreground">
              <CheckCircle className="w-5 h-5 text-green-300 flex-shrink-0" />
              <span>Integrações com WhatsApp e Email</span>
            </li>
          </ul>

          {/* DESEJO - Prova social */}
          <div className="space-y-4">
            <p className="text-primary-foreground/80 text-sm font-medium">
              Mais de 500 empresas já confiam no FastCRM
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5">
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-primary-foreground italic mb-2">
                "Aumentámos as vendas em 40% no primeiro trimestre. O FastCRM revolucionou a nossa operação comercial."
              </p>
              <p className="text-primary-foreground/70 text-sm">
                — João Silva, CEO da TechStart
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-primary-foreground/60 text-sm">
          <span>© 2024 FastCRM</span>
          <span>•</span>
          <span>Privacidade</span>
          <span>•</span>
          <span>Termos</span>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">FastCRM</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
