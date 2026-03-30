import { lazy, Suspense, useState } from "react";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Configure worker from CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Document = lazy(() =>
  import("react-pdf").then((m) => ({ default: m.Document })),
);
const Page = lazy(() =>
  import("react-pdf").then((m) => ({ default: m.Page })),
);

interface Props {
  url: string;
  className?: string;
}

export function PDFViewer({ url, className }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <Document
          file={url}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={<Skeleton className="h-[600px] w-full" />}
        >
          <Page pageNumber={page} width={600} />
        </Document>
      </Suspense>

      {numPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {numPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= numPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
