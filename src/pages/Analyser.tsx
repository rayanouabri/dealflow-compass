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
import { ArrowLeft, Sparkles, Building2, FileEdit, Zap, Loader2 } from "lucide-react";
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
        toast({ title: "Inscription requise", description: "Créez un compte pour continuer.", variant: "destructive" });
      } else setShowPaywall(true);
      return;
    }
    if (!useCustomThesis && !fundName.trim()) {
      toast({ title: "Fond requis", description: "Saisissez un fond ou utilisez une thèse personnalisée.", variant: "destructive" });
      return;
    }
    if (useCustomThesis && !customThesis.sectors?.length && !customThesis.description) {
      toast({ title: "Thèse requise", description: "Indiquez au moins des secteurs ou une description.", variant: "destructive" });
      return;
    }

    const requestBody: any = {
      params: {
        // Ne pas envoyer les paramètres redondants si on utilise une thèse personnalisée
        numberOfStartups: params.numberOfStartups || 1,
        includeCompetitors: params.includeCompetitors,
        includeMarketSize: params.includeMarketSize,
        detailedFinancials: params.detailedFinancials,
        includeMoat: params.includeMoat,
        detailLevel: params.detailLevel,
        slideCount: params.slideCount || 8,
        // En mode fonds : inclure UNIQUEMENT les critères que l'utilisateur a explicitement modifiés (pas "auto")
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
    // Redirige vers l'outil Due Diligence avec le nom de la startup pré-rempli
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
        toast({ title: "Inscription requise", description: "Créez un compte pour continuer.", variant: "destructive" });
      } else setShowPaywall(true);
      return;
    }
    if (!useCustomThesis && !fundName.trim()) {
      toast({ title: "Fond requis", description: "Saisissez un fond ou utilisez une thèse personnalisée.", variant: "destructive" });
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

  if (authLoading) return null;

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
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-medium mb-4 glow-ai-vc backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Étape 1 — Configuration
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Sourcez des startups
          </h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            Analysez un fond VC ou définissez votre thèse pour trouver des startups correspondantes.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex rounded-xl border border-primary/50 bg-card/70 backdrop-blur-sm overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => setUseCustomThesis(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-medium transition-all ${
                !useCustomThesis 
                  ? "bg-primary text-primary-foreground glow-ai-vc shadow-[0_0_20px_rgba(48,100%,60%,0.3)]" 
                  : "bg-card/30 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Fond VC
            </button>
            <button
              type="button"
              onClick={() => setUseCustomThesis(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-4 text-sm font-medium transition-all ${
                useCustomThesis 
                  ? "bg-primary text-primary-foreground glow-ai-vc shadow-[0_0_20px_rgba(48,100%,60%,0.3)]" 
                  : "bg-card/30 text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              }`}
            >
              <FileEdit className="w-4 h-4" />
              Thèse personnalisée
            </button>
          </div>

          {!useCustomThesis ? (
            <div className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm shadow-lg p-6 space-y-4">
              <label className="block text-sm font-medium text-gray-100">Nom du fond</label>
              <Input
                placeholder="ex. Accel, Sequoia, a16z…"
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                className="h-11 bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 rounded-lg focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20"
              />
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_FUNDS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFundName(f)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-all"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm shadow-lg p-6">
              <CustomThesisInput thesis={customThesis} onChange={setCustomThesis} onClear={() => setCustomThesis({})} />
            </div>
          )}

          <div className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm shadow-lg p-6">
            <AnalysisParameters 
              params={params} 
              onChange={setParams} 
              isPro={false}
              useCustomThesis={useCustomThesis}
            />
          </div>

          <Button
            type="button"
            size="lg"
            className="w-full h-14 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground glow-ai-vc shadow-[0_0_30px_rgba(48,100%,55%,0.4)]"
            onClick={handleSubmit}
            disabled={!hasTrialRemaining || (!useCustomThesis && !fundName.trim())}
          >
            Lancer l&apos;analyse — {params.numberOfStartups || 1} startup{(params.numberOfStartups || 1) > 1 ? "s" : ""}
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full h-12 text-sm font-medium border-primary/50 hover:border-primary hover:bg-primary/10 text-primary gap-2"
            onClick={handlePipeline}
            disabled={pipelineLoading || !hasTrialRemaining || (!useCustomThesis && !fundName.trim())}
          >
            {pipelineLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Auto-Pick + Due Diligence (1 clic)
          </Button>
        </div>

        {history.length > 0 && (
          <div className="mt-10">
            <AnalysisHistory history={history} onSelect={handleHistorySelect} />
          </div>
        )}
      </div>

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
