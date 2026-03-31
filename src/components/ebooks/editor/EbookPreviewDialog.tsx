import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FlipbookReader } from "../FlipbookReader";
import type { Ebook, EbookContactPage } from "@/hooks/useEbooks";

interface EbookPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ebook: Ebook;
  headerText?: string;
  footerText?: string;
  contactPage?: EbookContactPage;
}

export function EbookPreviewDialog({ open, onOpenChange, ebook, headerText, footerText, contactPage }: EbookPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 border-0 rounded-none bg-slate-950 [&>button]:text-white [&>button]:z-50">
        <FlipbookReader
          title={ebook.title}
          subtitle={ebook.subtitle || undefined}
          author={ebook.author_name || undefined}
          coverUrl={ebook.cover_url || undefined}
          chapters={ebook.chapters}
          headerText={headerText}
          footerText={footerText}
          contactPage={contactPage && Object.keys(contactPage).length > 0 ? contactPage : undefined}
          styleTokens={(ebook as any).global_styles || undefined}
          ebookId={ebook.id}
          workspaceId={ebook.workspace_id}
        />
      </DialogContent>
    </Dialog>
  );
}
