import { lazy, Suspense, forwardRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const RichTextEditorInner = lazy(() =>
  import("@/components/ui/RichTextEditor").then((m) => ({
    default: m.RichTextEditor,
  }))
);

export type { RichTextEditorRef } from "@/components/ui/RichTextEditor";

type RichTextEditorProps = React.ComponentProps<typeof RichTextEditorInner>;

export const RichTextEditorLazy = forwardRef<any, RichTextEditorProps>(
  (props, ref) => (
    <Suspense fallback={<Skeleton className="h-24 w-full rounded-md" />}>
      <RichTextEditorInner {...props} ref={ref} />
    </Suspense>
  )
);

RichTextEditorLazy.displayName = "RichTextEditorLazy";
