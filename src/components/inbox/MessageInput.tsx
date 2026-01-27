import { useState, useRef, KeyboardEvent } from "react";
import { Plus, Smile, Mic, Paperclip, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!message.trim() || isSending || disabled) return;
    
    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <div className={cn("border-t border-border p-4 bg-background", className)}>
      <div className="flex items-end gap-2 bg-muted rounded-full px-3 py-2">
        {/* Add Attachment */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0 rounded-full hover:bg-background"
          disabled={disabled}
        >
          <Plus className="w-4 h-4" />
        </Button>

        {/* Message Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          rows={1}
          className={cn(
            "flex-1 bg-transparent border-0 resize-none text-sm",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-0",
            "min-h-[32px] max-h-[120px] py-1.5",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />

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
              message.trim() 
                ? "bg-green-500 hover:bg-green-600 text-white" 
                : "bg-muted text-muted-foreground"
            )}
            onClick={handleSend}
            disabled={!message.trim() || isSending || disabled}
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
