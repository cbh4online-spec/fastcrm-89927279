import { Helmet } from 'react-helmet-async';
import type { SEOEntity, SEOComparison, Breadcrumb, SchemaOrg } from '../../types';

interface SEOHeadProps {
  entity?: SEOEntity | null;
  comparison?: SEOComparison | null;
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
  breadcrumbs?: Breadcrumb[];
  additionalSchema?: SchemaOrg[];
}

const BASE_URL = 'https://fastcrm.lovable.app';
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = 'FastCRM';

export function SEOHead({
  entity,
  comparison,
  title: customTitle,
  description: customDescription,
  canonicalUrl: customCanonical,
  ogImage: customOgImage,
  noIndex = false,
  breadcrumbs,
  additionalSchema = [],
}: SEOHeadProps) {
  // Determine values from entity, comparison, or custom props
  const title = customTitle || entity?.title || comparison?.title || SITE_NAME;
  const description = customDescription || entity?.meta_description || comparison?.meta_description || '';
  const canonical = customCanonical || entity?.canonical_url || `${BASE_URL}/${entity?.entity_type}s/${entity?.slug}` || '';
  const ogImage = customOgImage || entity?.og_image || DEFAULT_OG_IMAGE;

  // Build schema markup
  const schemas: SchemaOrg[] = [];

  // Entity schema
  if (entity?.schema_markup) {
    schemas.push(entity.schema_markup as SchemaOrg);
  }

  // Comparison schema
  if (comparison?.schema_markup) {
    schemas.push(comparison.schema_markup as SchemaOrg);
  }

  // Breadcrumb schema
  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url.startsWith('http') ? crumb.url : `${BASE_URL}${crumb.url}`,
      })),
    });
  }

  // FAQ schema from entity content
  if (entity?.content?.faqs && entity.content.faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: entity.content.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  // Tool/Software schema
  if (entity?.entity_type === 'tool') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: entity.title,
      description: entity.meta_description,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'EUR',
      },
    });
  }

  // Article schema for blog/guide/glossary
  if (['blog', 'guide', 'glossary'].includes(entity?.entity_type || '')) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: entity?.h1 || entity?.title,
      description: entity?.meta_description,
      datePublished: entity?.published_at,
      dateModified: entity?.updated_at,
      author: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: {
          '@type': 'ImageObject',
          url: `${BASE_URL}/logo.png`,
        },
      },
    });
  }

  // Add additional schemas
  schemas.push(...additionalSchema);

  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      {/* Basic Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Language */}
      <html lang={entity?.language || 'pt'} />
      {entity?.language && <meta property="og:locale" content={entity.language === 'pt' ? 'pt_PT' : 'en_US'} />}

      {/* Schema.org JSON-LD */}
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

// Helper to generate breadcrumbs
export function generateBreadcrumbs(entity: SEOEntity): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [
    { name: 'Início', url: '/' },
  ];

  // Add entity type listing
  const typeLabels: Record<string, string> = {
    keyword: 'Keywords',
    template: 'Templates',
    category: 'Categorias',
    tool: 'Ferramentas',
    glossary: 'Glossário',
    guide: 'Guias',
    blog: 'Blog',
    profile: 'Perfis',
  };

  crumbs.push({
    name: typeLabels[entity.entity_type] || entity.entity_type,
    url: `/${entity.entity_type}s`,
  });

  // Add current entity
  crumbs.push({
    name: entity.title,
    url: `/${entity.entity_type}s/${entity.slug}`,
  });

  return crumbs;
}
