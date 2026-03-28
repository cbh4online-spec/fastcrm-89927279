import { useState } from "react";
import { EbooksList } from "@/components/ebooks/EbooksList";
import { EbookEditor } from "@/components/ebooks/EbookEditor";

export default function EbooksPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return <EbookEditor ebookId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <EbooksList onSelectEbook={setSelectedId} />;
}
