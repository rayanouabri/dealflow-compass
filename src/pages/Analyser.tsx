import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { CustomThesisInput, CustomThesis } from "@/components/CustomThesisInput";
import { AnalysisHistory } from "@/components/AnalysisHistory";
import { AuthDialog } from "@/components/AuthDialog";
import { PaywallModal } from "@/components/PaywallModal";
import { useTrial } from "@/hooks/useTrial";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface HistoryItem {
  id: string;
  fund_name: string;
  startup_name: string;
  investment_thesis: any;
  pitch_deck: any[];
  created_at: string;
}

const HOW_IT_WORKS = [
  { step: "01", label: "Vos critères", desc: "Vous cochez secteurs, stades, géographie et précisez votre thèse." },
  { step: "02", label: "Sourcing multi-source", desc: "Recherche simultanée sur le web, bases FR, GitHub et Hacker News." },
  { step: "03", label: "Scoring & sélection", desc: "Chaque startup est notée selon vos critères, la meilleure est retenue." },
  { step: "04", label: "Due diligence auto", desc: "Rapport complet : équipe, marché, financement, risques." },
];

export default function Analyser() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { trialRemaining, hasTrialRemaining } = useTrial();

  const [thesis, setThesis] = useState<CustomThesis>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [showPaywall, setShowPaywall] = useState(false);
  const [pipelineLoading, setPipelineLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) fetchHistory();
    else if (!authLoading && !user) setHistory([]);
  }, [user, authLoading]);

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

  const canSubmit = !!(thesis.sectors?.length || thesis.description?.trim());

  const handlePipeline = async () => {
    if (!hasTrialRemaining) {
      if (!user) {
        setAuthView("signup");
        setShowAuthDialog(true);
        toast({ title: "Inscription requise", description: "Créez un compte pour continuer.", variant: "destructive" });
      } else setShowPaywall(true);
      return;
    }
    if (!canSubmit) {
      toast({ title: "Critères requis", description: "Cochez au moins un secteur ou décrivez votre thèse.", variant: "destructive" });
      return;
    }

    setPipelineLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const resp = await fetch(`${supabaseUrl}/functions/v1/pipeline-orchestrator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || supabaseKey}`,
        },
        body: JSON.stringify({ action: "start", customThesis: thesis }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${resp.status}`);
      }

      const { pipelineId } = await resp.json();
      if (!pipelineId) throw new Error("Pas de pipelineId retourné");

      navigate(`/pipeline?id=${pipelineId}`);
    } catch (err) {
      toast({
        title: "Erreur pipeline",
        description: err instanceof Error ? err.message : "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setPipelineLoading(false);
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    navigate("/due-diligence", { state: { companyName: item.startup_name }, replace: false });
  };

  const handleLogin = () => {
    setAuthView("login");
    setShowAuthDialog(true);
  };

  if (authLoading) return null;

  return (
    <AppLayout
      user={user}
      trialRemaining={trialRemaining}
      hasTrialRemaining={hasTrialRemaining}
      onLogin={handleLogin}
      onSignOut={signOut}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Main form column */}
        <div className="lg:col-span-2 space-y-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Accueil
          </Link>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] mb-3">
              Sourcing automatique
            </p>
            <h1 className="font-display text-[1.75rem] font-medium text-foreground tracking-tight leading-tight">
              Définissez votre thèse, on source les startups
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-lg">
              Cochez vos secteurs et stades, précisez votre thèse, et l'IA source, score et
              sélectionne la meilleure opportunité en 2-4 minutes — puis génère sa due diligence.
            </p>
          </div>

          {/* Parameter form */}
          <div className="border border-border rounded-md p-5 bg-card">
            <CustomThesisInput thesis={thesis} onChange={setThesis} />
          </div>

          {/* Action */}
          <div className="space-y-2.5">
            <Button
              type="button"
              size="lg"
              className="w-full h-11 text-sm font-medium bg-foreground text-background hover:bg-foreground/90"
              onClick={handlePipeline}
              disabled={pipelineLoading || !hasTrialRemaining || !canSubmit}
            >
              {pipelineLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Lancement...
                </>
              ) : (
                <>Lancer l'analyse complète — sourcing + due diligence</>
              )}
            </Button>
            {!canSubmit && (
              <p className="text-xs text-muted-foreground text-center">
                Cochez au moins un secteur ou décrivez votre thèse pour lancer.
              </p>
            )}
          </div>

          {!hasTrialRemaining && (
            <p className="text-xs text-destructive text-center">
              Quota d'analyses épuisé.{" "}
              {!user ? (
                <button
                  className="underline hover:no-underline"
                  onClick={() => { setAuthView("signup"); setShowAuthDialog(true); }}
                >
                  Créer un compte pour continuer
                </button>
              ) : (
                "Contactez-nous pour upgrader."
              )}
            </p>
          )}
        </div>

        {/* Info column */}
        <div className="space-y-5">
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-card/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Comment ça marche
              </p>
            </div>
            <div className="divide-y divide-border">
              {HOW_IT_WORKS.map(({ step, label, desc }) => (
                <div key={step} className="px-4 py-3.5 flex items-start gap-3">
                  <span className="text-xs font-bold text-primary tabular-nums shrink-0 mt-0.5 w-5">
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-card/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ce qui est analysé
              </p>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {[
                "Sources web, bases FR, GitHub, Hacker News",
                "Scoring selon vos critères cochés",
                "Filtrage des vraies startups (IA)",
                "Rapport DD : équipe, marché, risques",
                "Export Markdown du rapport complet",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Temps estimé :</span>{" "}
              2 à 4 minutes pour le pipeline complet (sourcing + DD auto).
            </p>
          </div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-10 pt-8 border-t border-border">
          <AnalysisHistory history={history} onSelect={handleHistorySelect} />
        </div>
      )}

      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        defaultView={authView}
        onAuthSuccess={() => setTimeout(() => setShowAuthDialog(false), 300)}
      />
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} trialRemaining={trialRemaining} />
    </AppLayout>
  );
}
