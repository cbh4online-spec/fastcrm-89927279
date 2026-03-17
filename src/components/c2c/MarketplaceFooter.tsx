import { Facebook, Instagram, Linkedin, ShieldCheck, Heart } from "lucide-react";

interface MarketplaceFooterProps {
  workspaceName: string;
  workspaceSlug: string;
}

export function MarketplaceFooter({ workspaceName, workspaceSlug }: MarketplaceFooterProps) {
  const base = `/marketplace/${workspaceSlug}`;
  const year = new Date().getFullYear();

  const columns = [
    {
      title: "Marketplace",
      links: [
        { label: "Sobre nós", href: `${base}/sobre` },
        { label: "Como funciona", href: `${base}/como-funciona` },
        { label: "Sustentabilidade", href: "#" },
        { label: "Novidades", href: "#" },
      ],
    },
    {
      title: "Descobrir",
      links: [
        { label: "Categorias populares", href: base, anchor: true },
        { label: "Publicações recentes", href: base, anchor: true },
        { label: "Vendedores verificados", href: "#" },
        { label: "Centro de ajuda", href: "#" },
      ],
    },
    {
      title: "Ajuda",
      links: [
        { label: "Apoio ao cliente", href: "#" },
        { label: "Vender no marketplace", href: "#" },
        { label: "Guia do comprador", href: "#" },
        { label: "Confiança e segurança", href: "#" },
      ],
    },
  ];

  const legalLinks = [
    { label: "Privacidade", href: "#" },
    { label: "Termos de uso", href: "#" },
    { label: "Cookies", href: "#" },
    { label: "RGPD", href: "#" },
  ];

  const socials = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
      {/* Main columns */}
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">
              {col.title}
            </h3>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-zinc-400 hover:text-amber-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800" />

      {/* Bottom bar */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left — socials */}
        <div className="flex items-center gap-3">
          {socials.map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                className="p-2 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            );
          })}
        </div>

        {/* Center — legal */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {legalLinks.map((l, i) => (
            <a
              key={l.label}
              href={l.href}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Right — copyright */}
        <div className="text-center md:text-right">
          <p className="text-xs text-zinc-500">
            © {year} {workspaceName}
          </p>
          <p className="text-[10px] text-zinc-600 flex items-center justify-center md:justify-end gap-1 mt-0.5">
            <ShieldCheck className="h-3 w-3" /> Pagamentos protegidos · 5% comissão
          </p>
        </div>
      </div>
    </footer>
  );
}
