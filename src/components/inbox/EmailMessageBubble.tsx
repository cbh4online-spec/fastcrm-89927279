import { useState, useRef, useEffect } from "react";
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
import { ChevronDown, ChevronUp, Mail, FileText, Code, Type } from "lucide-react";
import { Message } from "@/hooks/useMessages";
import { cleanEmailContent } from "@/lib/cleanEmailPreview";

// Fix UTF-8 encoding issues (mojibake)
function fixEncoding(text: string): string {
  if (!text) return text;
  try {
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

function isHtmlContent(content: string): boolean {
  const htmlTags = /<\/?(?:div|p|br|span|a|table|tr|td|th|ul|ol|li|h[1-6]|strong|em|b|i|img|hr|blockquote|pre|code)[^>]*>/i;
  return htmlTags.test(content);
}

function plainTextToHtml(text: string): string {
  const fixed = fixEncoding(text);
  return fixed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');
}

interface EmailMessageBubbleProps {
  message: Message;
  channelMetadata?: Record<string, unknown> | null;
}

/** Sandboxed iframe for HTML email rendering */
function HtmlEmailFrame({ html, isOutbound }: { html: string; isOutbound: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    const wrappedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            max-width: 100%;
            overflow-x: hidden;
            background: transparent;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: ${isOutbound ? '#ffffff' : '#1a1a1a'};
            padding: 8px;
            width: 100% !important;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          img, video, canvas, svg {
            max-width: 100% !important;
            height: auto !important;
          }
          table {
            max-width: 100% !important;
            width: 100% !important;
            border-collapse: collapse;
          }
          td, th, p, div, span, a, li {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          pre, code {
            white-space: pre-wrap !important;
            word-break: break-word !important;
          }
          a { color: ${isOutbound ? '#bfdbfe' : '#2563eb'}; }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `;

    doc.open();
    doc.write(wrappedHtml);
    doc.close();

    let frameId: number | null = null;
    const timeouts: number[] = [];

    const resize = () => {
      const body = doc.body;
      const root = doc.documentElement;
      if (!body || !root) return;

      const nextHeight = Math.ceil(
        Math.max(
          body.scrollHeight,
          body.offsetHeight,
          root.scrollHeight,
          root.offsetHeight,
          root.clientHeight,
        ) + 16,
      );

      setHeight(Math.max(nextHeight, 80));
    };

    const scheduleResize = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(resize);
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleResize)
        : null;

    if (doc.body && resizeObserver) resizeObserver.observe(doc.body);
    if (doc.documentElement && resizeObserver) resizeObserver.observe(doc.documentElement);

    const images = Array.from(doc.images);
    images.forEach((img) => {
      img.addEventListener("load", scheduleResize);
      img.addEventListener("error", scheduleResize);
    });

    timeouts.push(window.setTimeout(scheduleResize, 0));
    timeouts.push(window.setTimeout(scheduleResize, 100));
    timeouts.push(window.setTimeout(scheduleResize, 500));

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      images.forEach((img) => {
        img.removeEventListener("load", scheduleResize);
        img.removeEventListener("error", scheduleResize);
      });
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [html, isOutbound]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      className="w-full min-w-0 border-0 rounded"
      style={{ height: `${height}px`, background: "transparent" }}
      title="Email HTML"
    />
  );
}

export function EmailMessageBubble({ message, channelMetadata }: EmailMessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHtml, setShowHtml] = useState(true);
  
  const isOutbound = message.direction === "outbound";
  const hasHtmlContent = isHtmlContent(message.content);
  const hasSubject = !!message.email_subject;
  
  const displaySubject = hasSubject ? fixEncoding(message.email_subject!) : null;

  const fromEmail = (channelMetadata?.from_email as string) || (channelMetadata?.from_name as string) || null;
  const toEmail = (channelMetadata?.to_email as string) || (channelMetadata?.email as string) || null;
  const ccEmail = (channelMetadata?.cc as string) || null;
  
  const cleanedContent = cleanEmailContent(message.content);
  const hasHtmlContentCleaned = isHtmlContent(cleanedContent);

  const isLongContent = message.content.length > 300 || (message.content.match(/\n/g) || []).length > 5;

  return (
    <div className={cn("flex w-full min-w-0", isOutbound ? "justify-end" : "justify-start")}>
      <div className={cn(
        "w-full max-w-[56rem] rounded-lg overflow-hidden",
        isOutbound ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
      )}>
        {/* Email Header */}
        {(displaySubject || fromEmail || toEmail) && (
          <div className={cn(
            "px-3 py-2 border-b space-y-1",
            isOutbound ? "bg-primary/90 border-primary-foreground/20" : "bg-muted/80 border-border"
          )}>
            {displaySubject && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate flex-1">{displaySubject}</span>
                {hasHtmlContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 px-2 text-[10px] gap-1",
                      isOutbound
                        ? "text-primary-foreground/80 hover:bg-primary-foreground/10"
                        : "text-muted-foreground hover:bg-muted-foreground/10"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowHtml(!showHtml);
                    }}
                  >
                    {showHtml ? (
                      <>
                        <Type className="w-3 h-3" />
                        Ver Texto
                      </>
                    ) : (
                      <>
                        <Code className="w-3 h-3" />
                        Ver HTML
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
            {(fromEmail || toEmail) && (
              <div className={cn(
                "text-[11px] space-y-0.5",
                isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {fromEmail && <div><span className="font-medium">De:</span> {fromEmail}</div>}
                {toEmail && <div><span className="font-medium">Para:</span> {toEmail}</div>}
                {ccEmail && <div><span className="font-medium">Cc:</span> {ccEmail}</div>}
              </div>
            )}
          </div>
        )}

        {/* Email Body */}
        <div className="px-3 py-2">
          {hasHtmlContentCleaned && showHtml ? (
            <HtmlEmailFrame html={cleanedContent} isOutbound={isOutbound} />
          ) : (
            /* Plain text fallback */
            isLongContent ? (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                {!isExpanded && (
                  <div className="relative text-sm overflow-hidden" style={{ maxHeight: "150px" }}>
                    <div dangerouslySetInnerHTML={{ __html: plainTextToHtml(cleanedContent) }} className="whitespace-pre-wrap" />
                    <div className={cn(
                      "absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t pointer-events-none",
                      isOutbound ? "from-primary to-transparent" : "from-muted to-transparent"
                    )} />
                  </div>
                )}
                <CollapsibleContent>
                  <ScrollArea className="max-h-[500px]">
                    <p className="text-sm whitespace-pre-wrap">{fixEncoding(cleanedContent)}</p>
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
                      <><ChevronUp className="w-3 h-3 mr-1" />Mostrar menos</>
                    ) : (
                      <><ChevronDown className="w-3 h-3 mr-1" />Mostrar mais</>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{fixEncoding(cleanedContent)}</p>
            )
          )}
        </div>

        {/* Footer */}
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
