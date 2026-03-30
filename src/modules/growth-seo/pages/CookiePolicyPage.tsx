import { LegalPageLayout } from '../components/legal/LegalPageLayout';
import { usePublicLegalPage } from '../hooks/usePublicLegalPage';
import { DEFAULT_LEGAL_PAGES } from '../components/admin/legalPageDefaults';
import { PageSkeleton } from '../components/shared/PageSkeleton';

export default function CookiePolicyPage() {
  const { page, isLoading } = usePublicLegalPage('legal_page_cookies', DEFAULT_LEGAL_PAGES.legal_page_cookies);

  if (isLoading) return <PageSkeleton />;

  return (
    <LegalPageLayout
      title={page.title}
      description={page.description}
      lastUpdated={page.lastUpdated}
    >
      {page.sections.map((section, index) => (
        <section key={index}>
          <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
          <div
            className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        </section>
      ))}
    </LegalPageLayout>
  );
}
