import { LegalPageLayout } from '../components/legal/LegalPageLayout';
import { usePublicLegalPage } from '../hooks/usePublicLegalPage';
import { DEFAULT_LEGAL_PAGES } from '../components/admin/legalPageDefaults';
import { PageSkeleton } from '../components/shared/PageSkeleton';

export default function PrivacyPolicyPage() {
  const { page, isLoading } = usePublicLegalPage('legal_page_privacy', DEFAULT_LEGAL_PAGES.legal_page_privacy);

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
            className="text-muted-foreground leading-relaxed prose-content"
            dangerouslySetInnerHTML={{ __html: section.content }}
          />
        </section>
      ))}
    </LegalPageLayout>
  );
}
