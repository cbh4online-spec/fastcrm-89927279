import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const staticSuggestions = [
  { text: "Review 3 deals with low confidence", action: "/dashboard/objects?tab=deals" },
  { text: "Follow up on stale opportunities", action: "/dashboard/automations" },
  { text: "Generate revenue forecast", action: "/dashboard/intelligence?tab=analyze" },
  { text: "Create automation for follow-ups", action: "/dashboard/intelligence?tab=automate" },
];

export function AIActionSuggestions() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {staticSuggestions.map((suggestion, i) => (
            <button
              key={i}
              className="w-full flex items-center justify-between py-2 px-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
              onClick={() => navigate(suggestion.action)}
            >
              <span className="text-sm">{suggestion.text}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
