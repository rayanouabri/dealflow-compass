import { Loader2, CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

type Phase = "search_fund" | "search_market" | "search_startups" | "pick";

const STEPS = [
  { label: "Analyse de la thèse et du marché" },
  { label: "Sourcing des startups" },
  { label: "Scoring et sélection" },
  { label: "Transfert vers la due diligence" },
];

const PHASE_TO_STEP: Record<Phase, number> = {
  search_fund: 0,
  search_market: 1,
  search_startups: 2,
  pick: 3,
};

interface AnalysisLoadingProps {
  currentPhase?: Phase | null;
}

export function AnalysisLoading({ currentPhase }: AnalysisLoadingProps) {
  const [fallbackStep, setFallbackStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFallbackStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const currentStep = currentPhase ? PHASE_TO_STEP[currentPhase] ?? 0 : fallbackStep;

  return (
    <div className="max-w-xl mx-auto py-8 animate-fade-in" data-page="analyse">
      <Link
        to="/analyser"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour à la configuration
      </Link>

      <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] mb-3">
        Sourcing en cours
      </p>
      <h1 className="font-display text-[1.75rem] font-medium text-foreground tracking-tight leading-tight mb-2">
        Analyse de l'opportunité
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8">
        Le moteur croise les sources, score les candidats puis transfère la meilleure startup
        vers la due diligence. Comptez 2 à 4 minutes.
      </p>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border bg-card/50 flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Progression
          </p>
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.min(currentStep + 1, STEPS.length)} / {STEPS.length}
          </span>
        </div>
        <div className="divide-y divide-border">
          {STEPS.map(({ label }, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 ${
                  done ? "bg-card" : active ? "bg-primary/5" : "opacity-40"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                ) : active ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-border shrink-0" />
                )}
                <span
                  className={`text-sm flex-1 ${
                    done ? "text-foreground" : active ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                {active && <span className="text-xs text-primary">En cours</span>}
                {done && <span className="text-xs text-muted-foreground">OK</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
