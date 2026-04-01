import { useTranslation } from "react-i18next";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText } from "lucide-react";
import { CreateOpportunityEnhancedDialog } from "../CreateOpportunityEnhancedDialog";
import { PipelineSettingsDialog } from "@/components/crm/PipelineSettingsDialog";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
import { CreateViewDialog } from "../CreateViewDialog";
import { OpportunitiesModuleState } from "./useOpportunitiesModule";

interface Props {
  state: OpportunitiesModuleState;
}

export function OpportunitiesDialogs({ state }: Props) {
  const { t } = useTranslation('crm');

  return (
    <>
      <CreateOpportunityEnhancedDialog
        open={state.isCreateDialogOpen}
        onOpenChange={state.setIsCreateDialogOpen}
      />

      <PipelineSettingsDialog
        open={state.isSettingsDialogOpen}
        onOpenChange={state.setIsSettingsDialogOpen}
      />

      {/* Won Opportunity - Create Invoice Prompt */}
      <AlertDialog open={state.showInvoicePrompt} onOpenChange={state.setShowInvoicePrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              {t('createInvoiceTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('createInvoiceDesc', { title: state.wonOpportunity?.title })}
              {state.wonOpportunity?.value && (
                <span className="block mt-2">
                  {t('createInvoiceValue')}{" "}
                  <strong>
                    {new Intl.NumberFormat("pt-PT", {
                      style: "currency",
                      currency: state.wonOpportunity.currency || "EUR",
                    }).format(Number(state.wonOpportunity.value))}
                  </strong>
                </span>
              )}
              <span className="block mt-2">{t('createInvoicePrompt')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={state.handleSkipInvoice}>{t('laterButton')}</AlertDialogCancel>
            <AlertDialogAction onClick={state.handleCreateInvoiceFromWon} className="bg-green-600 hover:bg-green-700">
              <FileText className="w-4 h-4 mr-2" />
              {t('createInvoice')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateInvoiceDialog
        open={state.showInvoiceDialog}
        onOpenChange={(open) => {
          state.setShowInvoiceDialog(open);
          if (!open) state.setWonOpportunity(null);
        }}
        defaultContactId={state.wonOpportunity?.contact_id || undefined}
        defaultCompanyId={state.wonOpportunity?.company_id || undefined}
        defaultOpportunityId={state.wonOpportunity?.id}
      />

      <CreateViewDialog
        open={state.showCreateViewDialog}
        onOpenChange={state.setShowCreateViewDialog}
        onCreated={(id) => state.setActiveViewId(id)}
      />
    </>
  );
}
