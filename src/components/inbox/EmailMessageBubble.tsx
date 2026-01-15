import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, Mail, FileText } from "lucide-react";
import { Message } from "@/hooks/useMessages";

interface EmailMessageBubbleProps {
  message: Message;
}

// Fix UTF-8 encoding issues (mojibake) - common double-encoded patterns
function fixEncoding(text: string): string {
  if (!text) return text;
  
  try {
    // Common mojibake patterns: UTF-8 bytes interpreted as Latin-1, then encoded as UTF-8 again
    const replacements: [RegExp, string][] = [
      [/Ã§/g, 'ç'], [/Ã£/g, 'ã'], [/Ãµ/g, 'õ'], [/Ã¡/g, 'á'],
      [/Ã©/g, 'é'], [/Ã­/g, 'í'], [/Ã³/g, 'ó'], [/Ãº/g, 'ú'],
      [/Ã¢/g, 'â'], [/Ãª/g, 'ê'], [/Ã´/g, 'ô'], [/Ã /g, 'à'],
      [/Ã¨/g, 'è'], [/Ã¬/g, 'ì'], [/Ã²/g, 'ò'], [/Ã¹/g, 'ù'],
      [/Ã¤/g, 'ä'], [/Ã«/g, 'ë'], [/Ã¯/g, 'ï'], [/Ã¶/g, 'ö'],
      [/Ã¼/g, 'ü'], [/Ã±/g, 'ñ'], [/Ã¿/g, 'ÿ'], [/Ã®/g, 'î'],
      [/Ã»/g, 'û'], [/Ã‡/g, 'Ç'], [/Ãƒ/g, 'Ã'], [/Ã•/g, 'Õ'],
      [/Ã"/g, 'Ó'], [/Ã‰/g, 'É'], [/Ã/g, 'Í'], [/Ãš/g, 'Ú'],
      [/Ã‚/g, 'Â'], [/ÃŠ/g, 'Ê'], [/Ã"/g, 'Ô'], [/Ã€/g, 'À'],
      [/Ãˆ/g, 'È'], [/ÃŒ/g, 'Ì'], [/Ã'/g, 'Ò'], [/Ã™/g, 'Ù'],
      [/Ã„/g, 'Ä'], [/Ã‹/g, 'Ë'], [/Ã/g, 'Ï'], [/Ã–/g, 'Ö'],
      [/Ãœ/g, 'Ü'], [/Ã'/g, 'Ñ'], [/ÃŽ/g, 'Î'], [/Ã›/g, 'Û'],
      // Fix â€ patterns (curly quotes, etc.)
      [/â€œ/g, '"'], [/â€/g, '"'], [/â€™/g, "'"], [/â€˜/g, "'"],
      [/â€"/g, '—'], [/â€"/g, '–'], [/â€¦/g, '…'], [/Â /g, ' '],
      [/Â«/g, '«'], [/Â»/g, '»'], [/Âº/g, 'º'], [/Âª/g, 'ª'],
    ];
    
    let fixed = text;
    for (const [pattern, replacement] of replacements) {
      fixed = fixed.replace(pattern, replacement);
    }
    
    return fixed;
  } catch {
    return text;
  }
}

// Simple HTML sanitizer - removes dangerous tags but keeps formatting
function sanitizeHtml(html: string): string {
  // First fix encoding
  let clean = fixEncoding(html);
  // Remove script tags and their content
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove style tags and their content  
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove event handlers
  clean = clean.replace(/\s*on\w+="[^"]*"/gi, '');
  clean = clean.replace(/\s*on\w+='[^']*'/gi, '');
  // Remove javascript: URLs
  clean = clean.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  return clean;
}

// Check if content appears to be HTML
function isHtmlContent(content: string): boolean {
  const htmlTags = /<\/?(?:div|p|br|span|a|table|tr|td|th|ul|ol|li|h[1-6]|strong|em|b|i|img|hr|blockquote|pre|code)[^>]*>/i;
  return htmlTags.test(content);
}

// Convert plain text to preserve line breaks
function plainTextToHtml(text: string): string {
  const fixed = fixEncoding(text);
  return fixed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');
}

export function EmailMessageBubble({ message }: EmailMessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHtml, setShowHtml] = useState(true);
  
  const isOutbound = message.direction === "outbound";
  const hasHtmlContent = isHtmlContent(message.content);
  const hasSubject = !!message.email_subject;
  
  // Fix encoding in subject
  const displaySubject = hasSubject ? fixEncoding(message.email_subject!) : null;
  
  // Prepare content for display
  const displayContent = hasHtmlContent && showHtml 
    ? sanitizeHtml(message.content)
    : plainTextToHtml(message.content);

  // Check if content is long (more than 300 chars or more than 5 lines)
  const isLongContent = message.content.length > 300 || (message.content.match(/\n/g) || []).length > 5;

  return (
    <div
      className={cn(
        "flex",
        isOutbound ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg overflow-hidden",
          isOutbound
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {/* Email Header with Subject */}
        {displaySubject && (
          <div className={cn(
            "px-3 py-2 border-b flex items-center gap-2",
            isOutbound 
              ? "bg-primary/90 border-primary-foreground/20" 
              : "bg-muted/80 border-border"
          )}>
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate flex-1">
              {displaySubject}
            </span>
            {hasHtmlContent && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] py-0 cursor-pointer",
                  isOutbound 
                    ? "border-primary-foreground/30 text-primary-foreground/80 hover:bg-primary-foreground/10"
                    : "border-border"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHtml(!showHtml);
                }}
              >
                {showHtml ? "HTML" : "Texto"}
              </Badge>
            )}
          </div>
        )}

        {/* Email Body */}
        <div className="px-3 py-2">
          {isLongContent ? (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <div className="relative">
                {!isExpanded && (
                  <div 
                    className="text-sm overflow-hidden"
                    style={{ maxHeight: "150px" }}
                  >
                    {hasHtmlContent && showHtml ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: displayContent }}
                        className={cn(
                          "prose prose-sm max-w-none",
                          isOutbound ? "prose-invert" : "",
                          "[&_a]:underline [&_img]:max-w-full [&_img]:h-auto"
                        )}
                      />
                    ) : (
                      <div 
                        dangerouslySetInnerHTML={{ __html: displayContent }}
                        className="whitespace-pre-wrap"
                      />
                    )}
                    <div className={cn(
                      "absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t pointer-events-none",
                      isOutbound 
                        ? "from-primary to-transparent" 
                        : "from-muted to-transparent"
                    )} />
                  </div>
                )}
                
                <CollapsibleContent>
                  <ScrollArea className="max-h-[500px]">
                    {hasHtmlContent && showHtml ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: displayContent }}
                        className={cn(
                          "prose prose-sm max-w-none",
                          isOutbound ? "prose-invert" : "",
                          "[&_a]:underline [&_img]:max-w-full [&_img]:h-auto"
                        )}
                      />
                    ) : (
                      <div 
                        dangerouslySetInnerHTML={{ __html: displayContent }}
                        className="whitespace-pre-wrap"
                      />
                    )}
                  </ScrollArea>
                </CollapsibleContent>

                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "w-full h-6 text-xs mt-1",
                      isOutbound 
                        ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Mostrar menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Mostrar mais
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </Collapsible>
          ) : (
            // Short content - show directly
            hasHtmlContent && showHtml ? (
              <div 
                dangerouslySetInnerHTML={{ __html: displayContent }}
                className={cn(
                  "prose prose-sm max-w-none text-sm",
                  isOutbound ? "prose-invert" : "",
                  "[&_a]:underline [&_img]:max-w-full [&_img]:h-auto"
                )}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{fixEncoding(message.content)}</p>
            )
          )}
        </div>

        {/* Footer with timestamp */}
        <div className={cn(
          "px-3 py-1 flex items-center justify-between text-[10px]",
          isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <span>{format(new Date(message.sent_at), "dd/MM HH:mm")}</span>
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{message.attachments.length} anexo(s)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
