import { useState, useRef, lazy, Suspense, KeyboardEvent } from "react";
import { Plus, Smile, Mic, Paperclip, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { RichTextEditorRef } from "./RichTextEditor";

const RichTextEditor = lazy(() =>
  import("./RichTextEditor").then((m) => ({ default: m.RichTextEditor }))
);

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MessageInput({
  onSend,
  placeholder = "Escreva a sua mensagem...",
  disabled = false,
  className,
}: MessageInputProps) {
  const [hasContent, setHasContent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const editorRef = useRef<RichTextEditorRef>(null);

  const handleSend = async () => {
    if (!editorRef.current || editorRef.current.isEmpty() || isSending || disabled) return;

    const html = editorRef.current.getHTML();
    setIsSending(true);
    try {
      await onSend(html);
      editorRef.current.clearContent();
      setHasContent(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdate = (html: string) => {
    setHasContent(!editorRef.current?.isEmpty());
  };

  return (
    <div className={cn("border-t border-border p-4 bg-background", className)}>
      <div className="flex items-end gap-2 bg-muted rounded-2xl px-3 py-2">
        {/* Add Attachment */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-background"
          disabled={disabled}
        >
          <Plus className="w-4 h-4" />
        </Button>

        {/* Rich Text Editor */}
        <Suspense fallback={<Skeleton className="h-10 flex-1 rounded-md" />}>
          <RichTextEditor
            ref={editorRef}
            placeholder={placeholder}
            disabled={disabled || isSending}
            onEnterSend={handleSend}
            onUpdate={handleUpdate}
          />
        </Suspense>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-background"
            disabled={disabled}
          >
            <Smile className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-background"
            disabled={disabled}
          >
            <Mic className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-background"
            disabled={disabled}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          {/* Send Button */}
          <Button
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full",
              hasContent
                ? "bg-green-500 hover:bg-green-600 text-white" 
                : "bg-muted text-muted-foreground"
            )}
            onClick={handleSend}
            disabled={!hasContent || isSending || disabled}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
