import { forwardRef, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Shared sidebar primitives — single source of truth for cor, tamanho,
 * hover e tipografia dos itens das sidebars (Watidy, Adaptive, SuperAdmin).
 *
 * Tokens canónicos:
 * - Item:   px-3 py-2 · rounded-full · text-[13.5px] · font-semibold
 * - Ativo:  bg [--sidebar-active-bg] / fg [--sidebar-active-fg] · shadow-sm
 * - Idle:   text-sidebar-foreground/80 · hover bg-sidebar-accent
 * - Ícone:  18×18 · strokeWidth 1.75 · idle text-sidebar-foreground/70
 * - Secção: 11px · font-bold · uppercase · tracking-[0.14em] · opacidade 40%
 */

export type SidebarNavItemVariant = "full" | "icon";

type CommonProps = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  variant?: SidebarNavItemVariant;
  indent?: boolean;
  trailing?: ReactNode;
  badge?: ReactNode;
  className?: string;
  iconClassName?: string;
  /** Override colour palette (e.g. SuperAdmin uses `text-foreground/*`). */
  palette?: "sidebar" | "foreground";
};

type LinkProps = CommonProps & {
  as?: "link";
  to: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, "to" | "className" | "children">;

type ButtonProps = CommonProps & {
  as: "button";
  to?: never;
} & Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

export type SidebarNavItemProps = LinkProps | ButtonProps;

const BASE_FULL =
  "relative flex items-center gap-3 px-3 py-2 rounded-full text-[13.5px] font-semibold transition-colors duration-150 ease-out";
const BASE_ICON =
  "relative flex items-center justify-center p-2 rounded-lg transition-colors";

const ACTIVE =
  "bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-fg))] shadow-sm";

const IDLE_SIDEBAR = "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground";
const IDLE_FOREGROUND = "text-foreground/80 hover:bg-accent hover:text-foreground";
const ICON_IDLE_SIDEBAR = "text-sidebar-foreground/70";
const ICON_IDLE_FOREGROUND = "text-foreground/70";

export const SidebarNavItem = forwardRef<HTMLElement, SidebarNavItemProps>((props, ref) => {
  const {
    icon: Icon,
    label,
    active = false,
    variant = "full",
    indent = false,
    trailing,
    badge,
    className,
    iconClassName,
    palette = "sidebar",
    ...rest
  } = props as CommonProps & { as?: "link" | "button"; to?: string };

  const idle = palette === "foreground" ? IDLE_FOREGROUND : IDLE_SIDEBAR;
  const iconIdle = palette === "foreground" ? ICON_IDLE_FOREGROUND : ICON_IDLE_SIDEBAR;

  const root = cn(
    variant === "icon" ? BASE_ICON : BASE_FULL,
    variant === "full" && indent && "pl-10",
    active ? ACTIVE : idle,
    className,
  );

  const iconCls = cn(
    "w-[18px] h-[18px] shrink-0 transition-colors",
    active ? "text-[hsl(var(--sidebar-active-fg))]" : iconIdle,
    iconClassName,
  );

  const content = (
    <>
      <Icon className={iconCls} strokeWidth={1.75} aria-hidden="true" />
      {variant === "full" && (
        <>
          <span className="flex-1 truncate text-left">{label}</span>
          {trailing}
          {badge}
        </>
      )}
      {variant === "icon" && badge}
    </>
  );

  if ((props as ButtonProps).as === "button") {
    const { as: _as, ...buttonRest } = rest as ButtonProps;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        aria-current={active ? "page" : undefined}
        aria-label={variant === "icon" ? label : undefined}
        className={root}
        {...buttonRest}
      >
        {content}
      </button>
    );
  }

  const { as: _as, to, ...linkRest } = rest as LinkProps;
  return (
    <Link
      ref={ref as React.Ref<HTMLAnchorElement>}
      to={to!}
      aria-current={active ? "page" : undefined}
      aria-label={variant === "icon" ? label : undefined}
      className={root}
      {...linkRest}
    >
      {content}
    </Link>
  );
}) as <T extends SidebarNavItemProps = SidebarNavItemProps>(
  props: T & { ref?: React.Ref<HTMLElement> },
) => JSX.Element;

(SidebarNavItem as unknown as { displayName: string }).displayName = "SidebarNavItem";

export function SidebarSectionLabel({
  children,
  className,
  palette = "sidebar",
}: {
  children: ReactNode;
  className?: string;
  palette?: "sidebar" | "foreground";
}) {
  return (
    <span
      className={cn(
        "text-[11px] font-bold uppercase tracking-[0.14em]",
        palette === "foreground" ? "text-muted-foreground/60" : "text-sidebar-foreground/40",
        className,
      )}
    >
      {children}
    </span>
  );
}
