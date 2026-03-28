import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { EbooksList } from "@/components/ebooks/EbooksList";
import { EbookEditor } from "@/components/ebooks/EbookEditor";

export default function EbooksPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <DashboardLayout>
      {selectedId ? (
        <EbookEditor ebookId={selectedId} onBack={() => setSelectedId(null)} />
      ) : (
        <EbooksList onSelectEbook={setSelectedId} />
      )}
    </DashboardLayout>
  );
}
