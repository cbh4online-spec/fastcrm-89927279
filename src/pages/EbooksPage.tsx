import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EbooksList } from "@/components/ebooks/EbooksList";
import { EbookEditor } from "@/components/ebooks/EbookEditor";
import { EbookWizard } from "@/components/ebooks/EbookWizard";

export default function EbooksPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  return (
    <DashboardLayout>
      {showWizard ? (
        <EbookWizard
          onComplete={(id) => { setShowWizard(false); setSelectedId(id); }}
          onCancel={() => setShowWizard(false)}
        />
      ) : selectedId ? (
        <EbookEditor ebookId={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <EbooksList
          onSelectEbook={setSelectedId}
          onOpenWizard={() => setShowWizard(true)}
        />
      )}
    </DashboardLayout>
  );
}
