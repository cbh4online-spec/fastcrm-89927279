import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface CheckoutBackHeaderProps {
  /** Título da página atual (último nível do breadcrumb). */
  title: string;
  /** Nível intermédio opcional, ex.: Funis de Checkout. */
  parent?: { label: string; to: string };
  /** Destino do botão de regresso. Por omissão, o menu principal do FastCRM. */
  backTo?: string;
  backLabel?: string;
}

/**
 * Cabeçalho de navegação partilhado pelas páginas de /dashboard/checkout/*:
 * botão de regresso ao menu principal + breadcrumb clicável.
 */
export function CheckoutBackHeader({
  title,
  parent,
  backTo = "/dashboard",
  backLabel = "Voltar ao FastCRM",
}: CheckoutBackHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 shrink-0"
        onClick={() => navigate(backTo)}
        aria-label={backLabel}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {backLabel}
      </Button>

      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {parent && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={parent.to}>{parent.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
