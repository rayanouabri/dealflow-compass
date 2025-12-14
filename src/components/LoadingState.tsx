import { Loader2 } from "lucide-react";

const LOADING_STEPS = [
  "Researching fund investment thesis...",
  "Analyzing portfolio patterns...",
  "Identifying matching opportunities...",
  "Generating investment memo...",
];

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-pulse" />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-4">
        Analyzing Investment Opportunity
      </h3>

      <div className="space-y-3 max-w-md">
        {LOADING_STEPS.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-3 text-sm text-muted-foreground"
            style={{ animationDelay: `${i * 0.5}s` }}
          >
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary typing-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary typing-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary typing-dot" />
            </div>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
