import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Filter,
  PlayCircle,
  Clock,
  SkipForward,
  Shield,
  Loader2,
  ChevronRight,
  User,
  FileText,
} from "lucide-react";
import { AutomationRule, AutomationTrigger } from "@/hooks/useAutomations";
import { useLeads } from "@/hooks/useLeads";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";
import { cn } from "@/lib/utils";

// Step status types
type StepStatus = "pending" | "running" | "passed" | "failed" | "skipped" | "blocked";

interface ExecutionStep {
  id: string;
  type: "trigger" | "condition" | "action";
  name: string;
  description: string;
  status: StepStatus;
  details?: string;
  duration?: number;
  blockedReason?: string;
}

// Actions that are blocked in test mode
const BLOCKED_ACTIONS = [
  "send_template_message",
  "send_message",
  "send_proposal_link",
  "notify_user",
];

const PAYMENT_ACTIONS = [
  "create_proposal", // Could lead to payment
];

const getEntityFromTrigger = (trigger: AutomationTrigger): string => {
  if (trigger.startsWith("lead")) return "lead";
  if (trigger.startsWith("opportunity")) return "opportunity";
  if (trigger.startsWith("contact")) return "contact";
  if (trigger.startsWith("company")) return "company";
  if (trigger.startsWith("proposal")) return "proposal";
  if (trigger.startsWith("payment")) return "payment";
  if (trigger.startsWith("message") || trigger.startsWith("conversation")) return "conversation";
  return "lead";
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: AutomationRule;
}

export function AutomationTestRunner({ open, onOpenChange, rule }: Props) {
  const [testMode, setTestMode] = useState<"real" | "mock">("mock");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // Mock data for test mode
  const [mockData, setMockData] = useState({
    name: "Test Lead",
    email: "test@example.com",
    phone: "+351912345678",
    status: "new",
    source: "website",
    value: 1000,
  });

  const entityType = getEntityFromTrigger(rule.trigger);

  // Fetch real entities based on trigger type
  const { data: leads } = useLeads();
  const { data: opportunities } = useOpportunities();
  const { contacts } = useContacts();
  const { companies } = useCompanies();

  const entities = (() => {
    switch (entityType) {
      case "lead": return leads || [];
      case "opportunity": return opportunities || [];
      case "contact": return contacts || [];
      case "company": return companies || [];
      default: return [];
    }
  })();

  // Build execution steps from rule
  useEffect(() => {
    const newSteps: ExecutionStep[] = [];

    // Trigger step
    newSteps.push({
      id: "trigger",
      type: "trigger",
      name: "Trigger Fired",
      description: getTriggerDescription(rule.trigger),
      status: "pending",
    });

    // Condition steps
    (rule.conditions || []).forEach((condition, index) => {
      newSteps.push({
        id: `condition-${index}`,
        type: "condition",
        name: `Condition ${index + 1}`,
        description: `Check if ${condition.field_name} ${getOperatorLabel(condition.operator)} ${condition.value || ""}`,
        status: "pending",
      });
    });

    // Action steps
    (rule.actions || []).forEach((action, index) => {
      const isBlocked = BLOCKED_ACTIONS.includes(action.action_type);
      const isPaymentRelated = PAYMENT_ACTIONS.includes(action.action_type);
      
      newSteps.push({
        id: `action-${index}`,
        type: "action",
        name: `Action ${index + 1}: ${getActionLabel(action.action_type)}`,
        description: getActionDescription(action.action_type, action.config as Record<string, unknown>),
        status: "pending",
        blockedReason: isBlocked 
          ? "Blocked in test mode - would send messages"
          : isPaymentRelated
          ? "Simulated only - no actual proposal created"
          : undefined,
      });
    });

    setSteps(newSteps);
  }, [rule]);

  const runTest = async () => {
    setIsRunning(true);
    setHasRun(true);
    setCurrentStepIndex(0);

    // Get test data
    const testData = testMode === "mock" 
      ? mockData 
      : entities.find((e: any) => e.id === selectedEntityId);

    if (!testData && testMode === "real") {
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: "failed", details: "No entity selected" } : s));
      setIsRunning(false);
      return;
    }

    // Simulate step-by-step execution
    for (let i = 0; i < steps.length; i++) {
      setCurrentStepIndex(i);
      
      // Update current step to running
      setSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: "running" } : s
      ));

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

      const step = steps[i];
      let newStatus: StepStatus = "passed";
      let details = "";

      if (step.type === "trigger") {
        details = `Trigger evaluated with ${testMode === "mock" ? "test" : "real"} data`;
      } else if (step.type === "condition") {
        // Evaluate condition against test data
        const condition = rule.conditions?.[parseInt(step.id.split("-")[1])];
        if (condition) {
          const result = evaluateCondition(condition, testData as Record<string, unknown>);
          newStatus = result.passed ? "passed" : "failed";
          details = result.details;

          // If condition fails, skip remaining steps
          if (!result.passed) {
            setSteps(prev => prev.map((s, idx) => {
              if (idx === i) return { ...s, status: "failed", details };
              if (idx > i) return { ...s, status: "skipped", details: "Skipped due to failed condition" };
              return s;
            }));
            break;
          }
        }
      } else if (step.type === "action") {
        // Check if action is blocked
        const action = rule.actions?.[parseInt(step.id.split("-")[1])];
        if (action && BLOCKED_ACTIONS.includes(action.action_type)) {
          newStatus = "blocked";
          details = "Blocked in test mode - no messages sent";
        } else if (action && PAYMENT_ACTIONS.includes(action.action_type)) {
          newStatus = "passed";
          details = "Simulated - no actual changes made";
        } else {
          details = "Would execute in production";
        }
      }

      setSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: newStatus, details, duration: 100 + Math.random() * 200 } : s
      ));
    }

    setIsRunning(false);
  };

  const resetTest = () => {
    setSteps(prev => prev.map(s => ({ ...s, status: "pending", details: undefined, duration: undefined })));
    setCurrentStepIndex(-1);
    setHasRun(false);
  };

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "running": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "passed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      case "skipped": return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      case "blocked": return <Shield className="h-4 w-4 text-amber-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStepTypeIcon = (type: ExecutionStep["type"]) => {
    switch (type) {
      case "trigger": return <Zap className="h-4 w-4 text-amber-500" />;
      case "condition": return <Filter className="h-4 w-4 text-blue-500" />;
      case "action": return <PlayCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const passedSteps = steps.filter(s => s.status === "passed").length;
  const failedSteps = steps.filter(s => s.status === "failed").length;
  const blockedSteps = steps.filter(s => s.status === "blocked").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Test Automation: {rule.name}
          </DialogTitle>
          <DialogDescription>
            Run this automation in test mode to see how it would execute step-by-step.
          </DialogDescription>
        </DialogHeader>

        {/* Safety Notice */}
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <Shield className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            <strong>Test Mode:</strong> Messages will NOT be sent and payments will NOT be charged.
            Actions that would send communications are blocked and marked with a shield icon.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="setup" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Test Setup</TabsTrigger>
            <TabsTrigger value="execution">
              Execution
              {hasRun && (
                <Badge variant="outline" className="ml-2">
                  {passedSteps}/{steps.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="flex-1 overflow-auto space-y-4 mt-4">
            {/* Test Mode Selection */}
            <div className="space-y-3">
              <Label>Test Data Source</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTestMode("mock")}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-colors",
                    testMode === "mock" 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">Mock Data</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use simulated test data that you can customize
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTestMode("real")}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-colors",
                    testMode === "real" 
                      ? "border-primary bg-primary/5" 
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5" />
                    <span className="font-medium">Real {entityType}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Test with an existing {entityType} from your CRM
                  </p>
                </button>
              </div>
            </div>

            <Separator />

            {/* Data Configuration */}
            {testMode === "mock" ? (
              <div className="space-y-4">
                <Label>Configure Mock Data</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      value={mockData.name}
                      onChange={(e) => setMockData({ ...mockData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <Input
                      value={mockData.email}
                      onChange={(e) => setMockData({ ...mockData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <Input
                      value={mockData.phone}
                      onChange={(e) => setMockData({ ...mockData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select
                      value={mockData.status}
                      onValueChange={(value) => setMockData({ ...mockData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Source</Label>
                    <Input
                      value={mockData.source}
                      onChange={(e) => setMockData({ ...mockData, source: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Value</Label>
                    <Input
                      type="number"
                      value={mockData.value}
                      onChange={(e) => setMockData({ ...mockData, value: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Label>Select {entityType}</Label>
                <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select a ${entityType} to test with`} />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.slice(0, 20).map((entity: any) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name || entity.title || entity.id}
                        {entity.email && (
                          <span className="text-muted-foreground ml-2">({entity.email})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Showing first 20 {entityType}s. Actions will be simulated only.
                </p>
              </div>
            )}

            <div className="pt-4">
              <Button 
                onClick={runTest} 
                disabled={isRunning || (testMode === "real" && !selectedEntityId)}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Test
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="execution" className="flex-1 overflow-hidden mt-4">
            {!hasRun ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Play className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Configure test data and run the test to see execution steps
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{passedSteps} passed</span>
                  </div>
                  {failedSteps > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">{failedSteps} failed</span>
                    </div>
                  )}
                  {blockedSteps > 0 && (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">{blockedSteps} blocked</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetTest}
                    className="ml-auto"
                  >
                    Reset
                  </Button>
                </div>

                {/* Steps */}
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2 pr-4">
                    {steps.map((step, index) => (
                      <div
                        key={step.id}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          step.status === "running" && "border-blue-500 bg-blue-500/5",
                          step.status === "passed" && "border-green-500/30 bg-green-500/5",
                          step.status === "failed" && "border-red-500/30 bg-red-500/5",
                          step.status === "blocked" && "border-amber-500/30 bg-amber-500/5",
                          step.status === "skipped" && "opacity-50",
                          step.status === "pending" && "border-muted"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2 mt-0.5">
                            {getStepTypeIcon(step.type)}
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            {getStatusIcon(step.status)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{step.name}</span>
                              {step.blockedReason && step.status !== "blocked" && (
                                <Badge variant="outline" className="text-xs text-amber-600">
                                  Will be blocked
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                            {step.details && (
                              <p className={cn(
                                "text-xs mt-1",
                                step.status === "failed" ? "text-red-600" : 
                                step.status === "blocked" ? "text-amber-600" :
                                "text-muted-foreground"
                              )}>
                                {step.details}
                              </p>
                            )}
                            {step.duration && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Completed in {step.duration.toFixed(0)}ms
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function getTriggerDescription(trigger: AutomationTrigger): string {
  const descriptions: Record<AutomationTrigger, string> = {
    lead_created: "When a new lead is created",
    lead_updated: "When a lead is updated",
    lead_status_changed: "When lead status changes",
    lead_no_response: "When a lead doesn't respond",
    lead_score_changed: "When lead score changes",
    lead_temperature_changed: "When lead temperature changes",
    opportunity_created: "When an opportunity is created",
    opportunity_updated: "When an opportunity is updated",
    opportunity_stage_changed: "When opportunity stage changes",
    opportunity_value_changed: "When opportunity value changes",
    contact_created: "When a contact is created",
    contact_updated: "When a contact is updated",
    contact_score_changed: "When contact score changes",
    contact_temperature_changed: "When contact temperature changes",
    company_created: "When a company is created",
    company_updated: "When a company is updated",
    company_score_changed: "When company score changes",
    company_temperature_changed: "When company temperature changes",
    custom_field_updated: "When a custom field changes",
    payment_confirmed: "When payment is confirmed",
    message_received: "When a message is received",
    first_message_from_lead: "When a lead sends the first message",
    conversation_no_reply: "When there's no reply",
    conversation_resolved: "When a conversation is resolved",
    conversation_priority_changed: "When conversation priority changes",
    proposal_created: "When a proposal is created",
    proposal_viewed: "When a proposal is viewed",
    proposal_paid: "When a proposal is paid",
    scheduled_time: "At scheduled time",
    tag_added: "When a tag is added",
    tag_removed: "When a tag is removed",
    form_submitted: "When a form is submitted",
    store_purchase_completed: "When a store purchase is completed",
    store_cart_abandoned: "When a cart is abandoned",
    store_repurchase: "When a customer makes a repeat purchase",
    store_first_purchase: "When a customer makes their first purchase",
    store_order_status_changed: "When an order status changes",
    health_label_changed: "When deal health label changes",
    health_score_below_threshold: "When health score drops below threshold",
    health_score_dropped: "When health score drops significantly",
  };
  return descriptions[trigger] || trigger;
}

function getOperatorLabel(operator: string): string {
  const labels: Record<string, string> = {
    equals: "equals",
    not_equals: "does not equal",
    contains: "contains",
    not_contains: "does not contain",
    greater_than: "is greater than",
    less_than: "is less than",
    is_empty: "is empty",
    is_not_empty: "is not empty",
  };
  return labels[operator] || operator;
}

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    create_task: "Create Task",
    move_opportunity_stage: "Move Stage",
    send_message: "Send Message",
    notify_user: "Notify User",
    assign_owner: "Assign Owner",
    add_tag: "Add Tag",
    create_opportunity: "Create Opportunity",
    update_field: "Update Field",
    send_template_message: "Send Template Message",
    create_proposal: "Create Proposal",
    send_proposal_link: "Send Proposal Link",
    wait_time: "Wait",
    stop_automation: "Stop Automation",
    change_lead_status: "Change Lead Status",
  };
  return labels[actionType] || actionType;
}

function getActionDescription(actionType: string, config: Record<string, unknown>): string {
  switch (actionType) {
    case "create_task":
      return `Create task: "${config.task_title || config.title || "New task"}"`;
    case "add_tag":
      return `Add tag: "${config.tag || "tag"}"`;
    case "change_lead_status":
      return `Change status to: "${config.new_status || "new status"}"`;
    case "send_template_message":
      return `Send message via ${config.channel || "channel"} using template`;
    case "notify_user":
      return "Send notification to user";
    case "wait_time":
      const days = config.wait_days as number;
      const hours = config.wait_hours as number;
      return `Wait ${days ? `${days} day(s)` : ""} ${hours ? `${hours} hour(s)` : ""}`.trim();
    case "stop_automation":
      return "Stop automation execution";
    default:
      return `Execute ${getActionLabel(actionType)}`;
  }
}

function evaluateCondition(
  condition: { field_name: string; operator: string; value: string | null },
  data: Record<string, unknown>
): { passed: boolean; details: string } {
  const fieldValue = data[condition.field_name];
  const compareValue = condition.value;

  let passed = false;
  let details = "";

  switch (condition.operator) {
    case "equals":
      passed = String(fieldValue) === String(compareValue);
      details = `"${fieldValue}" ${passed ? "equals" : "does not equal"} "${compareValue}"`;
      break;
    case "not_equals":
      passed = String(fieldValue) !== String(compareValue);
      details = `"${fieldValue}" ${passed ? "does not equal" : "equals"} "${compareValue}"`;
      break;
    case "contains":
      passed = String(fieldValue || "").toLowerCase().includes(String(compareValue || "").toLowerCase());
      details = `"${fieldValue}" ${passed ? "contains" : "does not contain"} "${compareValue}"`;
      break;
    case "not_contains":
      passed = !String(fieldValue || "").toLowerCase().includes(String(compareValue || "").toLowerCase());
      details = `"${fieldValue}" ${passed ? "does not contain" : "contains"} "${compareValue}"`;
      break;
    case "greater_than":
      passed = Number(fieldValue) > Number(compareValue);
      details = `${fieldValue} ${passed ? ">" : "≤"} ${compareValue}`;
      break;
    case "less_than":
      passed = Number(fieldValue) < Number(compareValue);
      details = `${fieldValue} ${passed ? "<" : "≥"} ${compareValue}`;
      break;
    case "is_empty":
      passed = !fieldValue || String(fieldValue).trim() === "";
      details = `Field is ${passed ? "empty" : "not empty"}`;
      break;
    case "is_not_empty":
      passed = !!fieldValue && String(fieldValue).trim() !== "";
      details = `Field is ${passed ? "not empty" : "empty"}`;
      break;
    default:
      passed = true;
      details = "Condition evaluated";
  }

  return { passed, details };
}
