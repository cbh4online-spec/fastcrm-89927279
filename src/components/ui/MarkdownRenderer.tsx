import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  className?: string;
}

/**
 * Renders sanitised Markdown with GFM support and Tailwind typography.
 */
export function MarkdownRenderer({ content, className }: Props) {
  const clean = DOMPurify.sanitize(content);

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{clean}</ReactMarkdown>
    </div>
  );
}
