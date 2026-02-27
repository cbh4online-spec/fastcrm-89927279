import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Send, Mic, MicOff, Slash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { SlashCommand, useSlashCommands } from "@/hooks/useSlashCommands";
import { AnimatePresence } from "framer-motion";

interface Props {
  onSubmit: (query: string) => void;
  onSlashCommand: (cmd: SlashCommand, args: string) => void;
  isLoading?: boolean;
}

export function CommandInput({ onSubmit, onSlashCommand, isLoading }: Props) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const { isSlashInput, getFilteredCommands, parseSlashCommand } = useSlashCommands();

  const showMenu = isSlashInput(input);
  const filteredCmds = showMenu ? getFilteredCommands(input) : [];

  useEffect(() => { setMenuIndex(0); }, [input]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const { command, args } = parseSlashCommand(trimmed);
    if (command) {
      onSlashCommand(command, args);
    } else {
      onSubmit(trimmed);
    }
    setInput("");
  }, [input, isLoading, parseSlashCommand, onSlashCommand, onSubmit]);

  const handleKey = (e: KeyboardEvent) => {
    if (showMenu && filteredCmds.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMenuIndex(i => (i + 1) % filteredCmds.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMenuIndex(i => (i - 1 + filteredCmds.length) % filteredCmds.length); return; }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        const cmd = filteredCmds[menuIndex];
        setInput(cmd.command + " ");
        return;
      }
    }
    if (e.key === "Enter") { e.preventDefault(); handleSubmit(); }
  };

  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { return; }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-PT";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const hasSpeechAPI = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="relative w-full">
      <AnimatePresence>
        {showMenu && <SlashCommandMenu commands={filteredCmds} selectedIndex={menuIndex} onSelect={(cmd) => { setInput(cmd.command + " "); inputRef.current?.focus(); }} />}
      </AnimatePresence>

      <div className={cn(
        "flex items-center gap-2 rounded-2xl border bg-card/80 backdrop-blur-sm px-4 py-3 transition-all",
        "border-border/50 focus-within:border-primary/50 focus-within:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)]"
      )}>
        <Slash className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Pergunte algo ou digite / para comandos..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
          disabled={isLoading}
          autoFocus
        />
        {hasSpeechAPI && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 shrink-0 rounded-full", listening && "text-destructive bg-destructive/10")}
            onClick={toggleVoice}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        <Button
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full bg-primary text-primary-foreground"
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
