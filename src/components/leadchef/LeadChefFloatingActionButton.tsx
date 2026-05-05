import { useState } from "react";
import { Plus, UserPlus, CalendarPlus, Share2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LeadChefQuickLeadSheet } from "./LeadChefQuickLeadSheet";

export function LeadChefFloatingActionButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const openLead = () => {
    setMenuOpen(false);
    setQuickOpen(true);
  };
  const notImpl = (label: string) => {
    setMenuOpen(false);
    toast.info(`${label} — disponível na próxima fase.`);
  };

  return (
    <>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Criar novo"
            className="fixed right-4 z-50 flex items-center gap-2 rounded-full px-5 py-3.5 shadow-lg bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:bottom-6"
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm font-semibold">Novo</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>O que queres registar?</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid gap-2">
            <Button variant="outline" className="justify-start h-14" onClick={openLead}>
              <UserPlus className="mr-3 h-5 w-5 text-emerald-600" />
              Novo lead
            </Button>
            <Button variant="outline" className="justify-start h-14" onClick={() => notImpl("Nova demonstração")}>
              <CalendarPlus className="mr-3 h-5 w-5 text-emerald-600" />
              Nova demonstração
            </Button>
            <Button variant="outline" className="justify-start h-14" onClick={() => notImpl("Nova referência")}>
              <Share2 className="mr-3 h-5 w-5 text-emerald-600" />
              Nova referência
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <LeadChefQuickLeadSheet open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}
