import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { useTrial } from "@/hooks/useTrial";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  ArrowLeft,
  Zap,
  Search,
  Target,
  FileSearch,
  Brain,
  RefreshCcw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PipelineState {
  jobId: string | null;
  ddJobId: string | null;
  pickedCompany: { name: string; url: string } | null;
  ddResult: unknown | null;
  currentStep: number; // 0-3 (corresponds to the 4 phases)
  error: string | null;
  done: boolean;
}

interface StepDef {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  progressStart: number;
  progressEnd: number;
}

const STEPS: StepDef[] = [
  {
    label: "Sourcing France & Francos",
    sublabel: "Recherche de startups dans l'écosystème français et francophone…",
    icon: <Search className="w-5 h-5" />,
    progressStart: 0,
    progressEnd: 25,
  },
  {
    label: "Sélection automatique",
    sublabel: "Sélection de la meilleure startup par scoring IA…",
    icon: <Target className="w-5 h-5" />,
    progressStart: 25,
    progressEnd: 40,
  },
  {
    label: "Due Diligence — Collecte",
    sublabel: "Collecte des données sur la startup sélectionnée…",
    icon: <FileSearch className="w-5 h-5" />,
    progressStart: 40,
    progressEnd: 65,
  },
  {
    label: "Due Diligence — Analyse IA",
    sublabel: "Génération du rapport de due diligence par l'IA…",
    icon: <Brain className="w-5 h-5" />,
    progressStart: 65,
    progressEnd: 100,
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

async function callAutopick(
  supabaseUrl: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  // Each phase can take up to PHASE_TIMEOUT_MS
  const timeout = setTimeout(() => controller.abort(), PHASE_TIMEOUT_MS);
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/autopick-dd`, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify(body),
    });
    clearTimeout(timeout);
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_) {
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    }
    if (!res.ok) throw new Error((data.error as string) || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/** Timeout per pipeline phase in milliseconds (3 minutes). */
const PHASE_TIMEOUT_MS = 3 * 60 * 1000;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AutopickProgress() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { trialRemaining, hasTrialRemaining, useTrialCredit: consumeTrialCredit } = useTrial();
  const { toast } = useToast();

  const requestPayload = (location.state as {
    fundName?: string;
    useCustomThesis?: boolean;
    customThesis?: Record<string, unknown>;
  } | null) ||
    (() => {
      try {
        const s = sessionStorage.getItem("autopick-request");
        return s ? JSON.parse(s) : null;
      } catch {
        return null;
      }
    })();

  const [pipeline, setPipeline] = useState<PipelineState>({
    jobId: null,
    ddJobId: null,
    pickedCompany: null,
    ddResult: null,
    currentStep: 0,
    error: null,
    done: false,
  });
  const [progress, setProgress] = useState(0);
  const [stepMessage, setStepMessage] = useState(STEPS[0].sublabel);
  const [running, setRunning] = useState(false);

  // Ref to avoid double-run in Strict Mode
  const startedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!requestPayload?.fundName && !requestPayload?.customThesis) {
      navigate("/analyser", { replace: true });
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      runPipeline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  // Smooth progress animation within a step
  const animateProgress = (from: number, to: number, duration = 15000) => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const frac = Math.min(elapsed / duration, 1);
      // Ease-out so it slows near the end
      const eased = 1 - Math.pow(1 - frac, 2);
      setProgress(Math.round(from + (to - from) * eased));
      if (frac < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const runPipeline = async () => {
    setRunning(true);

    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseKey =
      (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string);

    if (!supabaseUrl || !supabaseKey) {
      setPipeline((p) => ({ ...p, error: "Configuration Supabase manquante." }));
      setRunning(false);
      return;
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || supabaseKey}`,
      apikey: supabaseKey,
    };

    let jobId: string | null = null;

    try {
      // ── Step 0: source ──────────────────────────────────────────────────
      setPipeline((p) => ({ ...p, currentStep: 0, error: null }));
      setStepMessage(STEPS[0].sublabel);
      animateProgress(0, 22, 30000);

      const sourceResult = await callAutopick(supabaseUrl, headers, {
        phase: "source",
        fundName: requestPayload.fundName,
        customThesis: requestPayload.customThesis,
      });
      jobId = sourceResult.jobId as string;
      setPipeline((p) => ({ ...p, jobId }));
      setProgress(25);

      // ── Step 1: pick ────────────────────────────────────────────────────
      setPipeline((p) => ({ ...p, currentStep: 1 }));
      setStepMessage(STEPS[1].sublabel);
      animateProgress(25, 38, 8000);

      const pickResult = await callAutopick(supabaseUrl, headers, {
        phase: "pick",
        jobId,
      });
      const pickedCompany = pickResult.pickedCompany as { name: string; url: string };
      setPipeline((p) => ({ ...p, pickedCompany }));
      setProgress(40);
      setStepMessage(`Startup sélectionnée : ${pickedCompany?.name || "inconnue"}`);

      // ── Step 2: dd_search ───────────────────────────────────────────────
      setPipeline((p) => ({ ...p, currentStep: 2 }));
      setStepMessage(STEPS[2].sublabel);
      animateProgress(40, 62, 30000);

      const ddSearchResult = await callAutopick(supabaseUrl, headers, {
        phase: "dd_search",
        jobId,
      });
      const ddJobId = ddSearchResult.ddJobId as string;
      setPipeline((p) => ({ ...p, ddJobId }));
      setProgress(65);

      // ── Step 3: dd_analyze ──────────────────────────────────────────────
      setPipeline((p) => ({ ...p, currentStep: 3 }));
      setStepMessage(STEPS[3].sublabel);
      animateProgress(65, 95, 60000);

      const ddAnalyzeResult = await callAutopick(supabaseUrl, headers, {
        phase: "dd_analyze",
        jobId,
      });
      const ddResult = ddAnalyzeResult.result;
      setPipeline((p) => ({ ...p, ddResult, done: true }));
      setProgress(100);
      setStepMessage("Rapport terminé !");

      // Consume trial credit
      if (typeof consumeTrialCredit === "function") consumeTrialCredit();

      // Navigate to DD result with pre-loaded data
      const state = {
        companyName: pickedCompany?.name || "",
        preloadedResult: ddResult,
        fromAutopick: true,
        sourcingJobId: jobId,
      };
      try {
        sessionStorage.setItem("due-diligence-request", JSON.stringify(state));
      } catch (storageErr) {
        console.warn("sessionStorage unavailable:", storageErr);
      }
      navigate("/due-diligence/result", { state, replace: false });
    } catch (err) {
      console.error("[AutopickProgress] error:", err);
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const message = isAbort
        ? "La phase a pris trop de temps (timeout). Réessayez."
        : err instanceof Error
        ? err.message
        : String(err);
      setPipeline((p) => ({ ...p, error: message }));
      toast({ title: "Erreur pipeline", description: message.slice(0, 120), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const handleRetry = () => {
    startedRef.current = false;
    setPipeline({
      jobId: null,
      ddJobId: null,
      pickedCompany: null,
      ddResult: null,
      currentStep: 0,
      error: null,
      done: false,
    });
    setProgress(0);
    setStepMessage(STEPS[0].sublabel);
    startedRef.current = true;
    runPipeline();
  };

  if (authLoading) return null;

  const { currentStep, error, done, pickedCompany } = pipeline;

  return (
    <AppLayout
      user={user}
      trialRemaining={trialRemaining}
      hasTrialRemaining={hasTrialRemaining}
      onLogin={() => {}}
      onSignOut={signOut}
    >
      <div className="max-w-2xl mx-auto">
        <Link
          to="/analyser"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;analyse
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-medium mb-4 backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5" />
            Auto-pick + Due Diligence
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Pipeline automatique
          </h1>
          <p className="text-muted-foreground text-base">
            {requestPayload?.fundName && requestPayload.fundName !== "Custom Thesis"
              ? `Sourcing pour le fonds "${requestPayload.fundName}"`
              : "Sourcing par thèse personnalisée"}{" "}
            — avec biais France &amp; Francos
          </p>
        </div>

        {/* Progress bar */}
        <div className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">Progression</span>
            <span className="text-sm font-medium text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 mb-3" />
          <p className="text-xs text-muted-foreground">{stepMessage}</p>
        </div>

        {/* Steps list */}
        <div className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm shadow-lg p-6 space-y-4">
          {STEPS.map((step, idx) => {
            const isDone = done ? true : idx < currentStep;
            const isActive = !done && idx === currentStep && !error;
            const isError = !!error && idx === currentStep;
            const isPending = idx > currentStep && !done;

            return (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-primary/10 border border-primary/30"
                    : isDone
                    ? "bg-green-500/5 border border-green-500/20"
                    : isError
                    ? "bg-red-500/10 border border-red-500/30"
                    : "opacity-50"
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isDone
                      ? "bg-green-500/20 text-green-400"
                      : isActive
                      ? "bg-primary/20 text-primary"
                      : isError
                      ? "bg-red-500/20 text-red-400"
                      : "bg-gray-800 text-gray-600"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isError ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    step.icon
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isDone
                        ? "text-green-400"
                        : isActive
                        ? "text-white"
                        : isError
                        ? "text-red-400"
                        : "text-gray-600"
                    }`}
                  >
                    {step.label}
                  </p>
                  {isActive && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.sublabel}</p>
                  )}
                  {isDone && idx === 1 && pickedCompany?.name && (
                    <p className="text-xs text-green-400/70 mt-0.5">
                      ✓ {pickedCompany.name}
                      {pickedCompany.url && (
                        <a
                          href={pickedCompany.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 underline underline-offset-2"
                        >
                          {pickedCompany.url}
                        </a>
                      )}
                    </p>
                  )}
                  {isError && (
                    <p className="text-xs text-red-400/80 mt-0.5 break-words">{error}</p>
                  )}
                </div>
                {isPending && (
                  <span className="text-xs text-gray-600 flex-shrink-0">En attente</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Error actions */}
        {error && !running && (
          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleRetry}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/analyser")}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </div>
        )}

        {/* Info */}
        {running && !error && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            ⏱️ Le pipeline complet prend généralement 2–5 minutes. Ne fermez pas cet onglet.
          </p>
        )}
      </div>
    </AppLayout>
  );
}
