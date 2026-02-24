import { useState } from "react";
import { useSJCopilot } from "@/hooks/useSJCopilot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function AssistTab() {
  const { messages, isLoading, askQuestion } = useSJCopilot();
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    askQuestion(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] rounded-lg border bg-card">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Bot className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg mb-1">AI Assistant</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ask anything about your CRM data, get insights on deals, or request help with tasks.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={cn(
                  "rounded-lg px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2.5 text-sm text-muted-foreground">
                  A pensar...
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI assistant..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
