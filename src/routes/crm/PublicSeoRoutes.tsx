import { Route } from "react-router-dom";
import {
  KeywordsListPage,
  KeywordDetailPage,
  TemplatesListPage,
  TemplateDetailPage,
  ToolsListPage,
  ToolDetailPage,
  CategoriesListPage,
  CategoryDetailPage,
  ComparePage,
  CompareListPage,
  BlogListPage,
  BlogPostPage,
  GuidePage,
  GuidesListPage,
  GlossaryListPage,
  GlossaryTermPage,
  KeywordIdeasToolPage,
  PrivacyPolicyPage,
  TermsOfUsePage,
  GDPRPage,
  CookiePolicyPage,
} from "@/modules/growth-seo";

export function PublicSeoRoutes() {
  return (
    <>
      {/* SEO Public Routes */}
      <Route path="/keywords" element={<KeywordsListPage />} />
      <Route path="/keywords/:slug" element={<KeywordDetailPage />} />
      <Route path="/templates" element={<TemplatesListPage />} />
      <Route path="/templates/:slug" element={<TemplateDetailPage />} />
      <Route path="/tools" element={<ToolsListPage />} />
      <Route path="/tools/keyword-ideas" element={<KeywordIdeasToolPage />} />
      <Route path="/tools/:slug" element={<ToolDetailPage />} />
      <Route path="/categories" element={<CategoriesListPage />} />
      <Route path="/categories/:slug" element={<CategoryDetailPage />} />
      <Route path="/compare" element={<CompareListPage />} />
      <Route path="/compare/:slug" element={<ComparePage />} />
      <Route path="/blog" element={<BlogListPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/guides" element={<GuidesListPage />} />
      <Route path="/guides/:slug" element={<GuidePage />} />
      <Route path="/glossary" element={<GlossaryListPage />} />
      <Route path="/glossary/:slug" element={<GlossaryTermPage />} />

      {/* Legal Pages */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfUsePage />} />
      <Route path="/gdpr" element={<GDPRPage />} />
      <Route path="/cookies" element={<CookiePolicyPage />} />
    </>
  );
}
