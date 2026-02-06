import { ReactNode } from 'react';
import { SEOHead } from '../seo/SEOHead';
import { SEOPublicLayout } from '../layout/SEOPublicLayout';

interface LegalPageLayoutProps {
  title: string;
  description: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, description, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <SEOPublicLayout>
      <SEOHead
        title={`${title} | FastCRM`}
        description={description}
        canonicalUrl={`https://fastcrm.lovable.app/${title.toLowerCase().replace(/\s+/g, '-')}`}
      />
      <div className="container max-w-4xl py-12 md:py-16">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-3">
            Última atualização: {lastUpdated}
          </p>
        </header>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {children}
        </div>
      </div>
    </SEOPublicLayout>
  );
}
