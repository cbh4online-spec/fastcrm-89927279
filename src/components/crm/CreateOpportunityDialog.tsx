import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateOpportunity } from "@/hooks/useOpportunities";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import { useLeads } from "@/hooks/useLeads";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CustomFieldsFormCreate, CustomFieldsFormCreateRef } from "@/components/custom-fields/CustomFieldsForm";

const opportunitySchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  lead_id: z.string().optional(),
  value: z.coerce.number().min(0, "Value must be positive").default(0),
  stage_id: z.string().min(1, "Stage is required"),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

interface CreateOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOpportunityDialog({
  open,
  onOpenChange,
}: CreateOpportunityDialogProps) {
  const createOpportunity = useCreateOpportunity();
  const { data: stages } = usePipelineStages();
  const { data: leads } = useLeads();
  const customFieldsRef = useRef<CustomFieldsFormCreateRef>(null);

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      title: "",
      lead_id: "",
      value: 0,
      stage_id: "",
    },
  });

  const onSubmit = async (values: OpportunityFormValues) => {
    try {
      const result = await createOpportunity.mutateAsync({
        title: values.title,
        lead_id: values.lead_id || undefined,
        value: values.value,
        stage_id: values.stage_id,
      });
      
      // Save custom fields if any
      if (result?.id && customFieldsRef.current) {
        await customFieldsRef.current.saveCustomFields(result.id);
      }
      
      toast.success("Opportunity created successfully");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create opportunity");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Opportunity</DialogTitle>
          <DialogDescription>
            Create a new opportunity to track in your pipeline.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="New Enterprise Deal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lead_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Lead</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "__none__" ? undefined : value)} value={field.value || "__none__"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lead (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No lead</SelectItem>
                      {leads?.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="10000"
                      min={0}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stage_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stages?.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Custom Fields */}
            <CustomFieldsFormCreate
              ref={customFieldsRef}
              entityType="opportunity"
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createOpportunity.isPending}>
                {createOpportunity.isPending ? "Creating..." : "Create Opportunity"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
