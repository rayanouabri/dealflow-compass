import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { AnalysisParameters, AnalysisParams, defaultParams } from "@/components/AnalysisParameters";
import { CustomThesisInput, CustomThesis } from "@/components/CustomThesisInput";
import { AnalysisHistory } from "@/components/AnalysisHistory";
import { AuthDialog } from "@/components/AuthDialog";
import { PaywallModal } from "@/components/PaywallModal";
import { useTrial } from "@/hooks/useTrial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building2, FileEdit, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

interface HistoryItem {
  id: string;
  fund_name: string;
  startup_name: string;
  investment_thesis: any;
  pitch_deck: any[];
  created_at: string;
}

const EXAMPLE_FUNDS = ["Supernova Invest", "Breega", "Elaia Partners", "Partech", "Index Ventures"];

const HOW_IT_WORKS = [
  { step: "01", label: "Analyse de la these", desc: "L'IA extrait et structure les criteres d'investissement du fonds cible." },
  { step: "02", label: "Sourcing multi-source", desc: "Recherche simultanee sur le web, bases FR, GitHub et Hacker News." },
  { step: "03", label: "Scoring & selection", desc: "Chaque startup est notee sur 100 points selon la these du fonds." },
  { step: "04", label: "Due diligence auto", desc: "Rapport complet : equipe, marche, financement, risques." },
];

export default function Analyser() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { trialRemaining, hasTrialRemaining } = useTrial();

  const [fundName, setFundName] = useState("");
  const [useCustomThesis, setUseCustomThesis] = useState(false);
  const [customThesis, setCustomThesis] = useState<CustomThesis>({});
  const [params, setParams] = useState<AnalysisParams>(defaultParams);
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

  const handleSubmit = () => {
    if (!hasTrialRemaining) {
      if (!user) {
        setAuthView("signup");
        setShowAuthDialog(true);
        toast({ title: "Inscription requise", description: "Creez un compte pour continuer.", variant: "destructive" });
      } else setShowPaywall(true);
      return;
    }
    if (!useCustomThesis && !fundName.trim()) {
      toast({ title: "Fond requis", description: "Saisissez un fond ou utilisez une these personnalisee.", variant: "destructive" });
      return;
    }
    if (useCustomThesis && !customThesis.sectors?.length && !customThesis.description) {
      toast({ title: "These requise", description: "Indiquez au moins des secteurs ou une description.", variant: "destructive" });
      return;
    }

    const requestBody: any = {
      params: {
        numberOfStartups: params.numberOfStartups || 1,
        includeCompetitors: params.includeCompetitors,
        includeMarketSize: params.includeMarketSize,
        detailedFinancials: params.detailedFinancials,
        includeMoat: params.includeMoat,
        detailLevel: params.detailLevel,
        slideCount: params.slideCount || 8,
        ...(useCustomThesis ? {} : {
          ...(params.startupStage !== "auto" && { startupStage: params.startupStage }),
          ...(params.startupSector !== "auto" && { startupSector: params.startupSector }),
          ...(params.businessModel !== "auto" && { businessModel: params.businessModel }),
          ...(params.targetMarket !== "auto" && { targetMarket: params.targetMarket }),
          ...(params.teamSize !== "auto" && { teamSize: params.teamSize }),
          ...(params.fundingAmount !== "auto" && { fundingAmount: params.fundingAmount }),
          ...(params.fundingStage !== "auto" && { fundingStage: params.fundingStage }),
          ...(params.timeline !== "auto" && { timeline: params.timeline }),
          ...(params.headquartersRegion !== "auto" && { headquartersRegion: params.headquartersRegion }),
          ...(params.targetGeography !== "auto" && { targetGeography: params.targetGeography }),
        }),
      },
    };
    if (useCustomThesis) requestBody.customThesis = customThesis;
    else requestBody.fundName = fundName.trim();

    const payload = { requestBody, fundName: useCustomThesis ? "Custom Thesis" : fundName.trim(), useCustomThesis };
    try {
      sessionStorage.setItem("analyse-request", JSON.stringify(payload));
    } catch (_) {}
    navigate("/analyse", { state: payload, replace: false });
  };

  const handleHistorySelect = (item: HistoryItem) => {
    navigate("/due-diligence", {
      state: { companyName: item.startup_name },
      replace: false,
    });
  };

  const handleLogin = () => {
    setAuthView("login");
    setShowAuthDialog(true);
  };

  const handlePipeline = async () => {
    if (!hasTrialRemaining) {
      if (!user) {
        setAuthView("signup");
        setShowAuthDialog(true);
        toast({ title: "Inscription requise", description: "Creez un compte pour continuer.", variant: "destructive" });
      } else setShowPaywall(true);
      return;
    }
    if (!useCustomThesis && !fundName.trim()) {
      toast({ title: "Fond requis", description: "Saisissez un fond ou utilisez une these personnalisee.", variant: "destructive" });
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
        body: JSON.stringify({
          action: "start",
          fundName: useCustomThesis ? undefined : fundName.trim() || undefined,
          customThesis: useCustomThesis ? customThesis : undefined,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${resp.status}`);
      }

      const { pipelineId } = await resp.json();
      if (!pipelineId) throw new Error("Pas de pipelineId retourne");

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

  if (authLoading) return null;

  const canSubmit = useCustomThesis
    ? !!(customThesis.sectors?.length || customThesis.description)
    : !!fundName.trim();

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
              Trouvez des startups alignées avec votre thèse
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-lg">
              Entrez le nom d'un fonds VC ou definissez votre propre these. L'IA source, score et selectionne la meilleure opportunite en 2-4 minutes.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="border-b border-border flex">
            <button
              type="button"
              onClick={() => setUseCustomThesis(false)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                !useCustomThesis
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Fonds VC
            </button>
            <button
              type="button"
              onClick={() => setUseCustomThesis(true)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                useCustomThesis
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              These personnalisee
            </button>
          </div>

          {!useCustomThesis ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-foreground">
                Nom du fonds
              </label>
              <Input
                placeholder="ex. Accel, Sequoia, a16z..."
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canSubmit && handlePipeline()}
                className="h-10 bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/30"
              />
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_FUNDS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFundName(f)}
                    className={`text-xs px-2.5 py-1 rounded border transition-all ${
                      fundName === f
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-md p-4 bg-card">
              <CustomThesisInput thesis={customThesis} onChange={setCustomThesis} onClear={() => setCustomThesis({})} />
            </div>
          )}

          {/* Parameters section */}
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-card/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Parametres d&apos;analyse
              </p>
            </div>
            <div className="p-4">
              <AnalysisParameters
                params={params}
                onChange={setParams}
                isPro={false}
                useCustomThesis={useCustomThesis}
              />
            </div>
          </div>

          {/* Action buttons */}
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

            <Button
              type="button"
              variant="outline"
              className="w-full h-10 text-sm border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
              onClick={handleSubmit}
              disabled={!hasTrialRemaining || !canSubmit}
            >
              Sourcing seul — {params.numberOfStartups || 1} startup{(params.numberOfStartups || 1) > 1 ? "s" : ""}
            </Button>
          </div>

          {!hasTrialRemaining && (
            <p className="text-xs text-destructive text-center">
              Quota d'analyses epuise.{" "}
              {!user ? (
                <button
                  className="underline hover:no-underline"
                  onClick={() => { setAuthView("signup"); setShowAuthDialog(true); }}
                >
                  Creer un compte pour continuer
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
                Comment ca marche
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
                Ce qui est analyse
              </p>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {[
                "Sources web, bases FR, GitHub, Hacker News",
                "Scoring sur 100 pts par rapport a la these",
                "Filtrage des vraies startups (IA)",
                "Rapport DD : equipe, marche, risques",
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
              <span className="text-foreground font-medium">Temps estime :</span>{" "}
              2 a 4 minutes pour le pipeline complet (sourcing + DD auto).
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
