import { useState } from "react";
import { Plus, Globe, GlobeLock, Trash2, Pencil, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLandingPages, useDeleteLandingPage, usePublishLandingPage } from "@/hooks/useLandingPages";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { CreateLandingPageDialog } from "./CreateLandingPageDialog";
import { LandingPageBuilder } from "./LandingPageBuilder";
import { formatDistanceToNow } from "date-fns";

export function LandingPagesList() {
  const { data: pages, isLoading } = useLandingPages();
  const deletePage = useDeleteLandingPage();
  const publishPage = usePublishLandingPage();
  const { currentWorkspace } = useWorkspace();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [deletePageId, setDeletePageId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deletePageId) {
      deletePage.mutate(deletePageId);
      setDeletePageId(null);
    }
  };

  const handleTogglePublish = (id: string, currentlyPublished: boolean) => {
    publishPage.mutate({ id, publish: !currentlyPublished });
  };

  const getPublicUrl = (slug: string) => {
    return `${window.location.origin}/p/${currentWorkspace?.slug}/${slug}`;
  };

  if (editingPageId) {
    return (
      <LandingPageBuilder
        pageId={editingPageId}
        onBack={() => setEditingPageId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Landing Pages</h1>
          <p className="text-muted-foreground">Create conversion-focused landing pages</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Page
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted" />
              <CardContent className="space-y-2 pt-4">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pages?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No landing pages yet</h3>
          <p className="text-muted-foreground mb-4">Create your first landing page to start capturing leads</p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Landing Page
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages?.map((page) => (
            <Card key={page.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg line-clamp-1">{page.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">/{page.slug}</p>
                  </div>
                  <Badge variant={page.is_published ? "default" : "secondary"}>
                    {page.is_published ? (
                      <>
                        <Globe className="h-3 w-3 mr-1" />
                        Published
                      </>
                    ) : (
                      <>
                        <GlobeLock className="h-3 w-3 mr-1" />
                        Draft
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {page.headline && (
                  <p className="text-sm line-clamp-2">{page.headline}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingPageId(page.id)}
                    className="flex-1"
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant={page.is_published ? "secondary" : "default"}
                    size="sm"
                    onClick={() => handleTogglePublish(page.id, !!page.is_published)}
                    className="flex-1"
                  >
                    {page.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  {page.is_published && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(getPublicUrl(page.slug), "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletePageId(page.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateLandingPageDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(id) => {
          setCreateDialogOpen(false);
          setEditingPageId(id);
        }}
      />

      <AlertDialog open={!!deletePageId} onOpenChange={() => setDeletePageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Landing Page</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this landing page. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
