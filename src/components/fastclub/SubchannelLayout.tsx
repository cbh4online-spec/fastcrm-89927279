import { ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { PageBreadcrumbs, type BreadcrumbItem } from "@/components/layout/PageBreadcrumbs";
import { FastCRMDeepLink } from "@/components/fastclub/FastCRMDeepLink";

interface SubchannelLayoutProps {
  title: string;
  subtitle: string;
  zoneBadge: string;
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
  backPath?: string;
  ctaLabel?: string;
  ctaPath?: string;
  gradient?: string;
}

const stagger = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function SubchannelLayout({
  title,
  subtitle,
  zoneBadge,
  breadcrumbs,
  children,
  backPath = "/dashboard/fastclub",
  ctaLabel,
  ctaPath,
  gradient = "from-primary via-primary to-primary/80",
}: SubchannelLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className={`bg-gradient-to-br ${gradient} relative overflow-hidden`}>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle at 30% 50%, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative container mx-auto px-4 pt-6 pb-12">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(backPath)}
            className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <motion.div {...stagger} transition={{ delay: 0.05 }}>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border-0 mb-3">
              {zoneBadge}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary-foreground tracking-tight">
              {title}
            </h1>
            <p className="text-primary-foreground/70 mt-2 max-w-xl text-base">{subtitle}</p>
          </motion.div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <PageBreadcrumbs items={breadcrumbs} />
        {children}

        {ctaLabel && ctaPath && (
          <motion.div {...stagger} transition={{ delay: 0.5 }} className="pt-4 text-center">
            <FastCRMDeepLink targetPath={ctaPath} size="lg" className="gap-2">
              {ctaLabel}
            </FastCRMDeepLink>
          </motion.div>
        )}
      </main>
    </div>
  );
}
