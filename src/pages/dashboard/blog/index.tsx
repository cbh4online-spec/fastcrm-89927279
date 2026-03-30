import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Edit, Calendar, BarChart3 } from "lucide-react";
import BlogArticlesList from "./BlogArticlesList";
import BlogArticleEditor from "./BlogArticleEditor";
import BlogCalendar from "./BlogCalendar";
import BlogAnalytics from "./BlogAnalytics";
import type { SEOEntity } from "@/modules/growth-seo/types";

export default function BlogDashboard() {
  const [activeTab, setActiveTab] = useState("articles");
  const [editingArticle, setEditingArticle] = useState<SEOEntity | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = (article: SEOEntity) => {
    setEditingArticle(article);
    setIsEditing(true);
    setActiveTab("editor");
  };

  const handleNew = () => {
    setEditingArticle(null);
    setIsEditing(true);
    setActiveTab("editor");
  };

  const handleBack = () => {
    setIsEditing(false);
    setEditingArticle(null);
    setActiveTab("articles");
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Blog</h1>
        <p className="text-muted-foreground">
          Gerir artigos, calendário editorial e performance do blog.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="articles" className="gap-2">
            <FileText className="h-4 w-4" /> Artigos
          </TabsTrigger>
          <TabsTrigger value="editor" className="gap-2" disabled={!isEditing}>
            <Edit className="h-4 w-4" /> Editor
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="mt-6">
          <BlogArticlesList onEdit={handleEdit} onNew={handleNew} />
        </TabsContent>

        <TabsContent value="editor" className="mt-6">
          {isEditing ? (
            <BlogArticleEditor article={editingArticle} onBack={handleBack} />
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              Selecione um artigo para editar ou crie um novo.
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <BlogCalendar onEdit={handleEdit} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <BlogAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
