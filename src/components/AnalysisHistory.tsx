import { History, Building2, Rocket, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface HistoryItem {
  id: string;
  fund_name: string;
  startup_name: string;
  created_at: string;
}

interface AnalysisHistoryProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}

export function AnalysisHistory({ history, onSelect }: AnalysisHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-foreground">
          <History className="w-4 h-4 text-muted-foreground" />
          Recent Analyses
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors text-left group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <span className="truncate font-medium">{item.fund_name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Rocket className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{item.startup_name}</span>
                <span className="text-border">•</span>
                <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
