import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  HelpCircle, 
  BookOpen, 
  MessageCircle, 
  Video, 
  FileText, 
  ExternalLink,
  Keyboard,
  Lightbulb,
  Bug
} from "lucide-react";
import { toast } from "sonner";

export function HelpSupportDropdown() {
  const handleOpenKnowledgeBase = () => {
    toast.info("Base de conhecimento em desenvolvimento");
  };
  
  const handleOpenSupport = () => {
    toast.info("Chat de suporte em desenvolvimento");
  };
  
  const handleOpenTutorials = () => {
    toast.info("Tutoriais em vídeo em desenvolvimento");
  };
  
  const handleOpenDocs = () => {
    window.open("https://docs.lovable.dev", "_blank");
  };
  
  const handleReportBug = () => {
    toast.info("Formulário de reporte em desenvolvimento");
  };
  
  const handleShowShortcuts = () => {
    toast.info("Atalhos de teclado: Ctrl+K para pesquisa global", {
      duration: 5000
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Ajuda & Suporte</p>
          <p className="text-xs text-muted-foreground">Recursos e assistência</p>
        </div>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleOpenKnowledgeBase}>
          <BookOpen className="mr-2 h-4 w-4" />
          Base de Conhecimento
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleOpenTutorials}>
          <Video className="mr-2 h-4 w-4" />
          Tutoriais em Vídeo
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleOpenDocs}>
          <FileText className="mr-2 h-4 w-4" />
          Documentação
          <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleShowShortcuts}>
          <Keyboard className="mr-2 h-4 w-4" />
          Atalhos de Teclado
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => toast.info("Dicas ativadas!")}>
          <Lightbulb className="mr-2 h-4 w-4" />
          Dicas & Truques
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleOpenSupport}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Chat de Suporte
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleReportBug} className="text-amber-600">
          <Bug className="mr-2 h-4 w-4" />
          Reportar Problema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
