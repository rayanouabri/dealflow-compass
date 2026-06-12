import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { useTrial } from "@/hooks/useTrial";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  Circle,
  AlertTriangle,
  ArrowLeft,
  RefreshCcw,
  ExternalLink,
  TrendingUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PipelineStatus {
  id: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  pickedStartup?: {
    name: string;
    url: string;
    totalWeighted: number;
    whyThisStartup: string;
    whyNow: string;
    riskLevel: string;
    redFlags: string[];
    comparables: string[];
    scores?: Record<string, number>;
  };
  shortlist?: Array<{
    name: string;
    url: string;
    totalWeighted: number;
    riskLevel: string;
    whyThisStartup?: string;
    whyNow?: string;
  }>;
  errorMessage?: string;
  ddJobId?: string;
  completedAt?: string;
  finalResult?: unknown;
  thesisSummary?: {
    sectors?: string[];
    stage?: { min?: string; max?: string };
    geography?: { primary?: string; frenchBias?: boolean };
  };
}

// ─── Steps ───────────────────────────────────────────────────────────────────

const STEPS = [
  {
    label: "Analyse de la these du fonds",
    doneWhen: (s: string) =>
      ["thesis_done", "sourcing_running", "sourcing_done", "picking", "pick_done", "dd_search_running", "dd_search_done", "dd_analyze_running", "dd_done"].includes(s),
    activeWhen: (s: string) => s === "thesis_analyzing",
  },
  {
    label: "Sourcing multi-source (FR + Global)",
    doneWhen: (s: string) =>
      ["sourcing_done", "picking", "pick_done", "dd_search_running", "dd_search_done", "dd_analyze_running", "dd_done"].includes(s),
    activeWhen: (s: string) => ["sourcing_running", "thesis_done"].includes(s),
  },
  {
    label: "Scoring & selection de la meilleure startup",
    doneWhen: (s: string) =>
      ["pick_done", "dd_search_running", "dd_search_done", "dd_analyze_running", "dd_done"].includes(s),
    activeWhen: (s: string) => ["picking", "sourcing_done"].includes(s),
  },
  {
    label: "Recherche due diligence",
    doneWhen: (s: string) =>
      ["dd_search_done", "dd_analyze_running", "dd_done"].includes(s),
    activeWhen: (s: string) => ["dd_search_running", "pick_done"].includes(s),
  },
  {
    label: "Analyse IA du rapport",
    doneWhen: (s: string) => s === "dd_done",
    activeWhen: (s: string) => ["dd_analyze_running", "dd_search_done"].includes(s),
  },
  {
    label: "Rapport finalise",
    doneWhen: (s: string) => s === "dd_done",
    activeWhen: (_s: string) => false,
  },
];

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    low:    { label: "Risque faible",  className: "border-success/40 text-success bg-success/5" },
    medium: { label: "Risque moyen",   className: "border-primary/40 text-primary bg-primary/5" },
    high:   { label: "Risque élevé",   className: "border-destructive/40 text-destructive bg-destructive/5" },
  };
  const c = cfg[level] ?? cfg.medium;
  return (
    <Badge variant="outline" className={`text-xs font-normal ${c.className}`}>
      {c.label}
    </Badge>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PipelineProgress() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { trialRemaining, hasTrialRemaining } = useTrial();

  const pipelineId = searchParams.get("id");

  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

  const fetchStatus = useCallback(async () => {
    if (!pipelineId) return;
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/pipeline-orchestrator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: "status", pipelineId }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data: PipelineStatus = await resp.json();
      setStatus(data);
    } catch (err) {
      console.error("Erreur poll pipeline:", err);
    } finally {
      setLoading(false);
    }
  }, [pipelineId, SUPABASE_URL, SUPABASE_ANON_KEY]);

  useEffect(() => {
    if (!pipelineId) return;
    fetchStatus();
    const interval = setInterval(() => {
      if (status?.status === "dd_done" || status?.status === "error") return;
      fetchStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [pipelineId, fetchStatus, status?.status]);

  const goToDD = useCallback(
    (name: string, url: string, preloadedResult?: unknown) => {
      const payload: Record<string, unknown> = { companyName: name, companyWebsite: url };
      if (preloadedResult) payload.preloadedResult = preloadedResult;
      try {
        sessionStorage.setItem("due-diligence-request", JSON.stringify(payload));
      } catch {
        // sessionStorage peut etre desactive
      }
      toast({
        title: "Due diligence",
        description: preloadedResult
          ? `Rapport de ${name} pret.`
          : `Generation du rapport pour ${name}...`,
      });
      navigate("/due-diligence/result", { state: payload });
    },
    [navigate, toast],
  );

  if (!pipelineId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground dark">
        <p className="text-sm">
          Identifiant de pipeline manquant.{" "}
          <Link to="/analyser" className="underline text-foreground">
            Retour au sourcing
          </Link>
        </p>
      </div>
    );
  }

  if (authLoading) return null;

  const currentStatus = status?.status ?? "pending";
  const isError = currentStatus === "error";
  const isDone = currentStatus === "dd_done";

  return (
    <AppLayout
      user={user}
      trialRemaining={trialRemaining}
      hasTrialRemaining={hasTrialRemaining}
      onLogin={() => {}}
      onSignOut={signOut}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          to="/analyser"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour au sourcing
        </Link>

        {/* Header */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] mb-3">
            Pipeline Auto
          </p>
          <h1 className="font-display text-[1.75rem] font-medium text-foreground tracking-tight leading-tight">
            {isDone ? "Analyse complète" : isError ? "Erreur pipeline" : "Analyse en cours"}
          </h1>
          {status?.thesisSummary?.sectors && (
            <p className="text-sm text-muted-foreground mt-1.5">
              {status.thesisSummary.sectors.slice(0, 3).join(", ")}
              {status.thesisSummary.geography?.primary && ` - ${status.thesisSummary.geography.primary}`}
            </p>
          )}
        </div>

        {/* Progress steps */}
        <div className="border border-border rounded-md overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-card/50 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Progression
            </p>
            <span className="text-xs text-muted-foreground tabular-nums">
              {status?.currentStep ?? 0} / {status?.totalSteps ?? 6}
            </span>
          </div>

          <div className="divide-y divide-border">
            {loading && !status && (
              <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement...
              </div>
            )}
            {STEPS.map((step, i) => {
              const done = step.doneWhen(currentStatus);
              const active = step.activeWhen(currentStatus);
              const err = isError && !done && active;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    done ? "bg-card" : active ? "bg-primary/5" : "opacity-40"
                  }`}
                >
                  <div className="shrink-0">
                    {err ? (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    ) : done ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : active ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <Circle className="w-4 h-4 text-border" />
                    )}
                  </div>
                  <span className={`text-sm flex-1 ${
                    done ? "text-foreground" : active ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}>
                    {step.label}
                  </span>
                  {active && !err && (
                    <span className="text-xs text-primary">En cours</span>
                  )}
                  {done && (
                    <span className="text-xs text-muted-foreground">OK</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Picked startup */}
        {status?.pickedStartup && (
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-card/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Startup selectionnee
                </p>
              </div>
              <RiskBadge level={status.pickedStartup.riskLevel} />
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-xl font-medium text-foreground">
                    {status.pickedStartup.name}
                  </h3>
                  <a
                    href={status.pickedStartup.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                  >
                    {status.pickedStartup.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-primary tabular-nums">
                    {status.pickedStartup.totalWeighted}
                  </div>
                  <div className="text-xs text-muted-foreground">/ 100</div>
                </div>
              </div>

              {status.pickedStartup.whyThisStartup && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Pourquoi cette startup
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {status.pickedStartup.whyThisStartup}
                  </p>
                </div>
              )}

              {status.pickedStartup.whyNow && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Why now
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {status.pickedStartup.whyNow}
                  </p>
                </div>
              )}

              {status.pickedStartup.redFlags?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    Points de vigilance
                  </p>
                  <ul className="space-y-1.5">
                    {status.pickedStartup.redFlags.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <AlertTriangle className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {status.pickedStartup.comparables?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {status.pickedStartup.comparables.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-xs font-normal border-border text-muted-foreground">
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shortlist */}
        {status?.shortlist && status.shortlist.length > 1 && (
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-card/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Autres startups identifiees ({status.shortlist.length - 1})
              </p>
            </div>
            <div className="divide-y divide-border">
              {status.shortlist.slice(1).map((s, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground">{s.name}</h4>
                      <RiskBadge level={s.riskLevel} />
                    </div>
                    {s.whyThisStartup && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {s.whyThisStartup}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-base font-bold text-primary tabular-nums">{s.totalWeighted}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-border"
                      onClick={() => goToDD(s.name, s.url)}
                    >
                      Due diligence
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="border border-destructive/30 rounded-md p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Une erreur est survenue</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {status?.errorMessage ?? "Erreur inconnue"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => navigate("/analyser")}
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Relancer une analyse
            </Button>
          </div>
        )}

        {/* CTA */}
        {isDone && status?.pickedStartup && (
          <Button
            className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium"
            onClick={() => goToDD(status.pickedStartup!.name, status.pickedStartup!.url, status.finalResult)}
          >
            {status.finalResult ? "Voir le rapport — " : "Due diligence — "}
            {status.pickedStartup.name}
          </Button>
        )}
      </div>
    </AppLayout>
  );
}
