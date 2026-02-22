import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { useTrial } from "@/hooks/useTrial";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Loader2,
  Circle,
  AlertTriangle,
  ArrowLeft,
  Sparkles,
  RefreshCcw,
  ExternalLink,
  TrendingUp,
  Shield,
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
  errorMessage?: string;
  ddJobId?: string;
  completedAt?: string;
  thesisSummary?: {
    sectors?: string[];
    stage?: { min?: string; max?: string };
    geography?: { primary?: string; frenchBias?: boolean };
  };
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    label: "Analyse de la thèse du fonds",
    statuses: ["thesis_analyzing", "thesis_done"],
    doneWhen: (s: string) =>
      ["thesis_done", "sourcing_running", "sourcing_done", "picking", "pick_done", "dd_search_running", "dd_search_done", "dd_analyze_running", "dd_done"].includes(s),
    activeWhen: (s: string) => s === "thesis_analyzing",
  },
  {
    label: "Sourcing multi-source (FR + Global)",
    statuses: ["sourcing_running", "sourcing_done"],
    doneWhen: (s: string) =>
      ["sourcing_done", "picking", "pick_done", "dd_search_running", "dd_search_done", "dd_analyze_running", "dd_done"].includes(s),
    activeWhen: (s: string) => ["sourcing_running", "thesis_done"].includes(s),
  },
  {
    label: "Scoring & sélection de la meilleure startup",
    statuses: ["picking", "pick_done"],
    doneWhen: (s: string) =>
      ["pick_done", "dd_search_running", "dd_search_done", "dd_analyze_running", "dd_done"].includes(s),
    activeWhen: (s: string) => ["picking", "sourcing_done"].includes(s),
  },
  {
    label: "Recherche due diligence",
    statuses: ["dd_search_running", "dd_search_done"],
    doneWhen: (s: string) =>
      ["dd_search_done", "dd_analyze_running", "dd_done"].includes(s),
    activeWhen: (s: string) => ["dd_search_running", "pick_done"].includes(s),
  },
  {
    label: "Analyse IA du rapport",
    statuses: ["dd_analyze_running"],
    doneWhen: (s: string) => s === "dd_done",
    activeWhen: (s: string) => ["dd_analyze_running", "dd_search_done"].includes(s),
  },
  {
    label: "Rapport terminé !",
    statuses: ["dd_done"],
    doneWhen: (s: string) => s === "dd_done",
    activeWhen: (_s: string) => false,
  },
];

// ─── Step Icon ────────────────────────────────────────────────────────────────

function StepIcon({
  done,
  active,
  error,
}: {
  done: boolean;
  active: boolean;
  error: boolean;
}) {
  if (error) return <AlertTriangle className="w-5 h-5 text-destructive" />;
  if (done) return <CheckCircle2 className="w-5 h-5 text-primary" />;
  if (active) return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
  return <Circle className="w-5 h-5 text-muted-foreground/40" />;
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    low: { label: "Risque faible", className: "border-green-500/40 bg-green-500/10 text-green-400" },
    medium: { label: "Risque moyen", className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" },
    high: { label: "Risque élevé", className: "border-red-500/40 bg-red-500/10 text-red-400" },
  };
  const c = cfg[level] ?? cfg.medium;
  return (
    <Badge variant="outline" className={`text-xs ${c.className}`}>
      <Shield className="w-3 h-3 mr-1" />
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
  const [redirecting, setRedirecting] = useState(false);

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

  // Polling toutes les 3 secondes
  useEffect(() => {
    if (!pipelineId) return;
    fetchStatus();
    const interval = setInterval(() => {
      if (status?.status === "dd_done" || status?.status === "error") return;
      fetchStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [pipelineId, fetchStatus, status?.status]);

  // Auto-redirect quand DD terminé
  useEffect(() => {
    if (status?.status === "dd_done" && status.pickedStartup && !redirecting) {
      setRedirecting(true);
      toast({
        title: "Rapport terminé ! 🎉",
        description: "Redirection vers le rapport de due diligence…",
      });
      const payload = {
        companyName: status.pickedStartup.name,
        companyWebsite: status.pickedStartup.url,
      };
      try {
        sessionStorage.setItem("due-diligence-request", JSON.stringify(payload));
      } catch {
        // sessionStorage peut être désactivé
      }
      setTimeout(() => {
        navigate("/due-diligence/result", { state: payload });
      }, 2000);
    }
  }, [status, navigate, toast, redirecting]);

  const handleLogin = () => {
    // Pas de dialog de login sur cette page — l'utilisateur vient de l'app déjà connecté
  };

  if (!pipelineId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <p>Identifiant de pipeline manquant. <Link to="/analyser" className="underline text-primary">Retour</Link></p>
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
      onLogin={handleLogin}
      onSignOut={signOut}
    >
      <div className="max-w-2xl mx-auto">
        <Link
          to="/analyser"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au sourcing
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-medium mb-4 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Pipeline Auto — 1 clic
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            {isDone ? "Analyse complète !" : isError ? "Erreur pipeline" : "Analyse en cours…"}
          </h1>
          {status?.thesisSummary?.sectors && (
            <p className="text-muted-foreground text-sm mt-1">
              Secteurs : {status.thesisSummary.sectors.slice(0, 3).join(", ")}
              {status.thesisSummary.geography?.primary && ` · ${status.thesisSummary.geography.primary}`}
            </p>
          )}
        </div>

        {/* Steps */}
        <Card className="bg-card/70 border border-primary/30 backdrop-blur-sm shadow-lg mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">
              Progression{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({status?.currentStep ?? 0} / {status?.totalSteps ?? 7})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && !status && (
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement…
              </div>
            )}
            {STEPS.map((step, i) => {
              const done = step.doneWhen(currentStatus);
              const active = step.activeWhen(currentStatus);
              const err = isError && !done;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all ${
                    done
                      ? "bg-primary/10"
                      : active
                      ? "bg-primary/5 border border-primary/20"
                      : "opacity-40"
                  }`}
                >
                  <StepIcon done={done} active={active} error={err && active} />
                  <span
                    className={`text-sm flex-1 ${
                      done
                        ? "text-foreground"
                        : active
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                  {done && (
                    <Badge variant="outline" className="text-xs border-primary/30 bg-primary/10 text-primary">
                      ✓
                    </Badge>
                  )}
                  {active && (
                    <Badge variant="outline" className="text-xs border-primary/40 bg-primary/20 text-primary animate-pulse">
                      En cours
                    </Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Picked startup card */}
        {status?.pickedStartup && (
          <Card className="bg-card/70 border border-primary/40 backdrop-blur-sm shadow-lg mb-6 glow-ai-vc">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Startup sélectionnée
                </CardTitle>
                <RiskBadge level={status.pickedStartup.riskLevel} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
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
                  <div className="text-2xl font-bold text-primary">
                    {status.pickedStartup.totalWeighted}
                  </div>
                  <div className="text-xs text-muted-foreground">score / 100</div>
                </div>
              </div>

              {status.pickedStartup.whyThisStartup && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Pourquoi cette startup
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {status.pickedStartup.whyThisStartup}
                  </p>
                </div>
              )}

              {status.pickedStartup.whyNow && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Why now
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {status.pickedStartup.whyNow}
                  </p>
                </div>
              )}

              {status.pickedStartup.redFlags?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Points de vigilance
                  </p>
                  <ul className="space-y-1">
                    {status.pickedStartup.redFlags.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {status.pickedStartup.comparables?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {status.pickedStartup.comparables.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-xs border-primary/20 bg-primary/5 text-muted-foreground">
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {isError && (
          <Card className="bg-card/70 border border-destructive/30 backdrop-blur-sm shadow-lg mb-6">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    Une erreur est survenue
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {status?.errorMessage ?? "Erreur inconnue"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-destructive/30 hover:border-destructive/50"
                onClick={() => navigate("/analyser")}
              >
                <RefreshCcw className="w-4 h-4" />
                Relancer une analyse
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Redirect notice */}
        {redirecting && (
          <div className="flex items-center gap-3 text-sm text-primary bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirection vers le rapport de due diligence…
          </div>
        )}

        {/* CTA si DD terminée mais pas encore redirigé */}
        {isDone && status?.pickedStartup && !redirecting && (
          <Button
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground glow-ai-vc"
            onClick={() => {
              const payload = {
                companyName: status.pickedStartup!.name,
                companyWebsite: status.pickedStartup!.url,
              };
              try {
                sessionStorage.setItem("due-diligence-request", JSON.stringify(payload));
              } catch {
                // sessionStorage peut être désactivé
              }
              navigate("/due-diligence/result", { state: payload });
            }}
          >
            Voir le rapport complet →
          </Button>
        )}
      </div>
    </AppLayout>
  );
}
