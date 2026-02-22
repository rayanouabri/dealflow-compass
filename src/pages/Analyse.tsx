import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { AnalysisHistory } from "@/components/AnalysisHistory";
import { AuthDialog } from "@/components/AuthDialog";
import { PaywallModal } from "@/components/PaywallModal";
import { useTrial } from "@/hooks/useTrial";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertCircle, RefreshCcw } from "lucide-react";

interface Slide {
  title: string;
  content: string;
  keyPoints: string[];
  metrics?: Record<string, string | number>;
}

interface HistoryItem {
  id: string;
  fund_name: string;
  startup_name: string;
  investment_thesis: Record<string, unknown>;
  pitch_deck: unknown[];
  created_at: string;
}

type AnalyseState =
  | { requestBody: any; fundName: string; useCustomThesis: boolean }
  | { fromHistory: true; result: any; fundName: string };

export default function Analyse() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { trialRemaining, hasTrialRemaining, useTrialCredit } = useTrial();

  const [loading, setLoading] = useState(true);
  const [fundName, setFundName] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [restoredState, setRestoredState] = useState<AnalyseState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const analyseState = (state as AnalyseState | null) ?? restoredState;

  useEffect(() => {
    if (!authLoading && user) fetchHistory();
    else if (!authLoading && !user) setHistory([]);
  }, [user, authLoading]);

  useEffect(() => {
    const t = document.title;
    document.title = loading ? "Analyse en cours | AI-VC" : "Analyse | AI-VC";
    return () => { document.title = t; };
  }, [loading]);

  useEffect(() => {
    if (authLoading) return;
    let effective: AnalyseState | null = (state as AnalyseState | null) ?? restoredState;
    if (!effective) {
      try {
        const raw = sessionStorage.getItem("analyse-request");
        if (raw) {
          const parsed = JSON.parse(raw) as AnalyseState;
          sessionStorage.removeItem("analyse-request");
          setRestoredState(parsed);
          effective = parsed;
        }
      } catch (_) {}
    }
    if (!effective) {
      navigate("/analyser", { replace: true });
      return;
    }

    if ("fromHistory" in effective && effective.fromHistory) {
      // Redirige vers l'outil Due Diligence avec le nom de la startup pré-rempli
      const startupName = (effective.result as any)?.startup?.name || (effective.result as any)?.startups?.[0]?.name || "";
      navigate("/due-diligence", {
        state: { companyName: startupName },
        replace: true,
      });
      return;
    }

    const { requestBody, fundName: fn, useCustomThesis } = effective;
    setFundName(fn);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const TIMEOUT_PHASE_MS = 90_000;

    const parseResponse = async (res: Response): Promise<{ data: any; errorMsg?: string }> => {
      const text = await res.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        if (res.status === 546) throw new Error("Limite de ressources serveur dépassée (546). Réessayez dans 1–2 minutes ou avec « 1 startup ».");
        if (res.status >= 500) throw new Error(`Erreur serveur (${res.status}). Le service est temporairement indisponible.`);
        if (res.status === 429) throw new Error("Trop de requêtes. Veuillez patienter quelques instants.");
        if (res.status >= 400) throw new Error(`Erreur de requête (${res.status}).`);
        throw new Error(`Réponse invalide (${res.status}).`);
      }
      const errorMsg = typeof data?.error === "string" ? data.error : data?.error?.message;
      return { data, errorMsg };
    };

    (async () => {
      try {
        if (!supabaseUrl || !supabaseKey) throw new Error("Configuration Supabase manquante.");

        const runPhase = async (phase: string, body: object) => {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), TIMEOUT_PHASE_MS);
          const res = await fetch(`${supabaseUrl}/functions/v1/analyze-fund`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
            body: JSON.stringify(body),
            signal: ctrl.signal,
          });
          clearTimeout(t);
          const { data, errorMsg } = await parseResponse(res);
          if (!res.ok) {
            if (res.status === 546) throw new Error("Limite de ressources serveur dépassée (546). Réessayez dans 1–2 minutes.");
            if (res.status >= 500) throw new Error((errorMsg || "Erreur serveur") + "\n\nRéessayez dans quelques instants.");
            if (res.status === 429) throw new Error("Trop de requêtes simultanées. Veuillez patienter.");
            if (res.status === 401 || res.status === 403) throw new Error("Erreur d'authentification. Veuillez vous reconnecter.");
            throw new Error(errorMsg || `Erreur phase ${phase}`);
          }
          return data;
        };

        const dataFund = await runPhase("search_fund", { ...requestBody, phase: "search_fund" });
        const jobId = dataFund?.jobId;
        if (!jobId) throw new Error("Réponse invalide : jobId manquant après search_fund.");

        await runPhase("search_market", { phase: "search_market", jobId });
        await runPhase("search_startups", { phase: "search_startups", jobId });

        // Phase pick : sélectionne la meilleure startup (mini appel IA, sans générer de rapport)
        const ctrlPick = new AbortController();
        const tPick = setTimeout(() => ctrlPick.abort(), TIMEOUT_PHASE_MS);
        const resPick = await fetch(`${supabaseUrl}/functions/v1/analyze-fund`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
          body: JSON.stringify({ phase: "pick", jobId }),
          signal: ctrlPick.signal,
        });
        clearTimeout(tPick);
        const { data: pickData, errorMsg: pickError } = await parseResponse(resPick);
        if (!resPick.ok) throw new Error(pickError || "Erreur phase pick");
        const pickedStartup = pickData?.startup;
        if (!pickedStartup?.name) throw new Error("Aucune startup sélectionnée par le sourcing.");

        useTrialCredit();

        // Transférer vers l'outil Due Diligence avec la startup sélectionnée
        const ddPayload = {
          companyName: pickedStartup.name,
          companyWebsite: pickedStartup.website || undefined,
          additionalContext: pickedStartup.description
            ? `Startup identifiée par sourcing IA pour ${fn} : ${pickedStartup.description}`
            : `Startup identifiée par sourcing IA pour le fonds ${fn}`,
        };
        try {
          sessionStorage.setItem("due-diligence-request", JSON.stringify(ddPayload));
        } catch (ssErr) {
          console.warn("sessionStorage indisponible (fallback via location.state):", ssErr);
        }
        navigate("/due-diligence/result", { state: ddPayload, replace: false });
      } catch (e) {
        let msg = e instanceof Error ? e.message : "Échec de l'analyse.";
        // Failed to fetch / CORS souvent dû au 546 côté serveur
        if (typeof msg === "string" && (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("cors"))) {
          msg = "Impossible de joindre le serveur (connexion ou timeout). Cause fréquente : limite serveur (546).\n\n• Réessayez dans 1–2 minutes.\n• Utilisez l’option « 1 startup » pour réduire la charge.\n• La qualité reste identique pour une seule startup.";
        }
        setErrorMessage(msg);
        toast({ title: "Erreur", description: msg.split("\n")[0], variant: "destructive", duration: 10000 });
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, state, user]);

  const fetchHistory = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("analysis_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!error && data) setHistory(data as HistoryItem[]);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    navigate("/due-diligence", { state: { companyName: item.startup_name }, replace: false });
  };

  const handleBack = () => navigate("/analyser");

  const handleLogin = () => setShowAuthDialog(true);

  if (authLoading || !analyseState) return null;

  if (loading) {
    return (
      <>
        <AppLayout
          user={user}
          trialRemaining={trialRemaining}
          hasTrialRemaining={hasTrialRemaining}
          onLogin={handleLogin}
          onSignOut={signOut}
        >
          <AnalysisLoading />
        </AppLayout>
        <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} defaultView="login" onAuthSuccess={() => setShowAuthDialog(false)} />
        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} trialRemaining={trialRemaining} />
      </>
    );
  }

  if (!result) {
    const handleRetry = () => {
      setErrorMessage(null);
      setLoading(true);
      // Reload the page to retry
      window.location.reload();
    };

    return (
      <>
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
              Retour à la configuration
            </Link>

            <Card className="bg-card/80 border-red-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  L&apos;analyse a échoué
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-sm text-gray-300 leading-relaxed">{errorMessage}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Causes possibles :
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Problème de connexion au serveur</li>
                    <li>Configuration manquante (clés API)</li>
                    <li>Timeout de la requête</li>
                    <li>Erreur serveur temporaire</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleRetry} variant="default" className="gap-2">
                    <RefreshCcw className="w-4 h-4" />
                    Réessayer
                  </Button>
                  <Button onClick={handleBack} variant="outline" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Nouvelle analyse
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </AppLayout>
        <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} defaultView="login" onAuthSuccess={() => setShowAuthDialog(false)} />
        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} trialRemaining={trialRemaining} />
      </>
    );
  }

  // Ce point n'est jamais atteint : les nouvelles analyses redirigent vers /due-diligence/result
  // et les éléments d'historique redirigent vers /due-diligence via fromHistory
  return null;
}
