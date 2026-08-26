/**
 * IX-style Navigation Config
 * ────────────────────────────────────────────────────────────────────────────
 * Reagrupamento minimalista (estilo InvoiceXpress) das 40+ rotas do FastCRM
 * em 8 grupos-topo. NÃO duplica URLs — referencia chaves do ROUTE_MANIFEST.
 *
 * Item primário do grupo = href do próprio grupo (destino ao clicar no topo).
 * children = sub-rotas expostas quando o grupo está expandido (accordion).
 *
 * Regras:
 *  - Não remover módulos: se um módulo actual não cabe nas categorias óbvias,
 *    vai para "operacoes" (Módulos) para ficar sempre acessível.
 *  - Respeitar menuKey e moduleSlug via ROUTE_MANIFEST (aplicado no componente).
 */
import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Inbox,
  Calendar,
  TrendingUp,
  Receipt,
  Package,
  Boxes,
  Store,
  BarChart3,
  Settings,
} from "lucide-react";

export interface IXNavChild {
  /** Chave do ROUTE_MANIFEST (para herdar label/href/menuKey/moduleSlug). */
  key: string;
  /** Override opcional do label. */
  label?: string;
}

export interface IXNavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Rota primária (destino ao clicar no cabeçalho do grupo). */
  href: string;
  /** Chave opcional do manifest para o próprio grupo (menuKey/permissões). */
  primaryKey?: string;
  /** Sub-rotas do grupo (accordion). Ordem é preservada. */
  children?: IXNavChild[];
}

export interface IXNavSection {
  key: string;
  label: string;
  groups: IXNavGroup[];
}

// ─── Estrutura IX ────────────────────────────────────────────────────────────

export const IX_NAV_SECTIONS: IXNavSection[] = [
  {
    key: "trabalho",
    label: "Trabalho",
    groups: [
      {
        key: "overview",
        label: "Visão Global",
        icon: LayoutGrid,
        href: "/dashboard",
        primaryKey: "dashboard",
        children: [
          { key: "daily-brief" },
          { key: "alerts" },
          { key: "feed" },
          { key: "productivity" },
        ],
      },
      {
        key: "inbox",
        label: "Inbox",
        icon: Inbox,
        href: "/dashboard/inbox",
        primaryKey: "inbox",
        children: [
          { key: "whatsapp-pro" },
          { key: "telegram" },
          { key: "voicehub" },
          { key: "groups" },
          { key: "templates" },
        ],
      },
      {
        key: "agenda",
        label: "Agenda",
        icon: Calendar,
        href: "/dashboard/scheduling",
        primaryKey: "calendar",
        children: [
          { key: "followups" },
          { key: "whatsapp-scheduled" },
          { key: "whatsapp-recurring" },
        ],
      },
    ],
  },
  {
    key: "vendas",
    label: "Vendas",
    groups: [
      {
        key: "pipeline",
        label: "Pipeline",
        icon: TrendingUp,
        href: "/dashboard/opportunities",
        primaryKey: "opportunities",
        children: [
          { key: "leads" },
          { key: "contacts" },
          { key: "companies" },
          { key: "gestores" },
          { key: "renewals" },
          { key: "lifecycle" },
          { key: "sequences" },
          { key: "account-brief" },
          { key: "prospecting" },
          { key: "lead-enricher" },
          { key: "fastmatch" },
          { key: "google-local" },
        ],
      },
      {
        key: "faturacao",
        label: "Faturação",
        icon: Receipt,
        href: "/dashboard/invoices",
        primaryKey: "invoices",
        children: [
          { key: "proposals" },
          { key: "order-notes" },
          { key: "collections" },
          { key: "collections-sequences" },
          { key: "rentals" },
          { key: "payments" },
          { key: "imports-saft" },
          { key: "checkout-admin" },
        ],
      },
      {
        key: "catalogo",
        label: "Catálogo",
        icon: Package,
        href: "/dashboard/products",
        primaryKey: "products",
        children: [
          { key: "products-ocr" },
          { key: "products-ocr-drafts" },
          { key: "bundles" },
          { key: "composite-products" },
          { key: "stock-valuation" },
          { key: "stock-counts" },
        ],
      },
    ],
  },
  {
    key: "aplicacoes",
    label: "Aplicações",
    groups: [
      {
        key: "loja-online",
        label: "Loja Online",
        icon: ShoppingBag,
        href: "/dashboard/store-orders",
        primaryKey: "store-orders",
        children: [
          { key: "store-products" },
          { key: "store-categories" },
          { key: "store-coupons" },
          { key: "store-reviews" },
          { key: "store-returns" },
          { key: "store-analytics" },
          { key: "store-settings" },
        ],
      },
      {
        key: "marketplace",
        label: "Marketplace C2C",
        icon: Store,
        href: "/dashboard/c2c",
        primaryKey: "c2c",
      },
    ],
  },
  {
    key: "operacoes",
    label: "Operações",
    groups: [
      {
        key: "modulos",
        label: "Módulos",
        icon: Boxes,
        // Hub genérico — usa dashboard como fallback seguro
        href: "/dashboard",
        children: [
          // Marketing
          { key: "email-campaigns" },
          { key: "conversion-hub" },
          { key: "funnels" },
          { key: "landing-pages" },
          { key: "form-studio" },
          { key: "builder" },
          { key: "ebooks" },
          { key: "seo" },
          { key: "bio-os" },
          { key: "instagram-looter" },
          { key: "meta-module" },
          { key: "sponsors" },
          // Loja / Marketplace / B2B
          { key: "store-orders" },
          // People / Suporte / Operações
          { key: "onboarding-projects" },
          { key: "delivery-projects" },
          { key: "customer-success" },
        ],
      },
      {
        key: "relatorios",
        label: "Relatórios",
        icon: BarChart3,
        href: "/dashboard/reports",
        primaryKey: "reports",
        children: [
          { key: "reports-financial" },
          { key: "kpis" },
          { key: "perf-dashboard" },
          { key: "perf-metrics" },
          { key: "perf-leaderboard" },
          { key: "exec-command" },
          { key: "revenue-flight-control" },
        ],
      },
    ],
  },
  {
    key: "conta",
    label: "Conta",
    groups: [
      {
        key: "configuracoes",
        label: "Configurações",
        icon: Settings,
        href: "/settings",
        children: [
          { key: "workspace-plan" },
          { key: "plan-mgmt" },
        ],
      },
    ],
  },
];
