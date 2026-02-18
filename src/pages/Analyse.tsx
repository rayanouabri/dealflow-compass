import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { FundInfoCard } from "@/components/FundInfo";
import { InvestmentCriteria } from "@/components/InvestmentCriteria";
import { StartupCard } from "@/components/StartupCard";
import { SlideCarousel } from "@/components/SlideCarousel";
import { AnalysisHistory } from "@/components/AnalysisHistory";
import { AIQAChat } from "@/components/AIQAChat";
import { AuthDialog } from "@/components/AuthDialog";
import { PaywallModal } from "@/components/PaywallModal";
import { useTrial } from "@/hooks/useTrial";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertCircle, RefreshCcw } from "lucide-react";

interface Slide {
  title: string;
  content: string;
  keyPoints: string[];
  metrics?: Record<string, string | number>;
}

interface Startup {
  name: string;
  tagline: string;
  sector: string;
  stage: string;
  location: string;
  founded: string | number;
  teamSize: string | number;
  problem?: string;
  solution?: string;
  businessModel?: string;
  competitors?: string;
  moat?: string;
}

interface InvestmentThesis {
  sectors: string[];
  stage: string;
  geography: string;
  ticketSize: string;
  description: string;
}

interface AnalysisResult {
  fundInfo?: any;
  investmentThesis: InvestmentThesis;
  startup?: Startup;
  startups?: Startup[];
  dueDiligenceReport?: Slide[];
  dueDiligenceReports?: Slide[][];
  pitchDeck?: Slide[];
}

interface HistoryItem {
  id: string;
  fund_name: string;
  startup_name: string;
  investment_thesis: InvestmentThesis;
  pitch_deck: Slide[];
  created_at: string;
}

type AnalyseState =
  | { requestBody: any; fundName: string; useCustomThesis: boolean }
  | { fromHistory: true; result: AnalysisResult; fundName: string };

export default function Analyse() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { trialRemaining, hasTrialRemaining, useTrialCredit } = useTrial();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fundName, setFundName] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedStartupIndex, setSelectedStartupIndex] = useState(0);
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
    document.title = result ? `Résultats — ${fundName || "Analyse"} | AI-VC` : loading ? "Analyse en cours | AI-VC" : "Analyse | AI-VC";
    return () => { document.title = t; };
  }, [loading, result, fundName]);

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
      setResult(effective.result);
      setFundName(effective.fundName);
      setLoading(false);
      return;
    }

    const { requestBody, fundName: fn, useCustomThesis } = effective;
    setFundName(fn);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const TIMEOUT_PHASE_MS = 90_000;
    const TIMEOUT_ANALYZE_MS = 180_000;

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

        // Phase analyse (charge le job, appelle LLM, retourne le résultat)
        const ctrlAnalyze = new AbortController();
        const tAnalyze = setTimeout(() => ctrlAnalyze.abort(), TIMEOUT_ANALYZE_MS);
        const resAnalyze = await fetch(`${supabaseUrl}/functions/v1/analyze-fund`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
          body: JSON.stringify({ phase: "analyze", jobId }),
          signal: ctrlAnalyze.signal,
        });
        clearTimeout(tAnalyze);
        const { data, errorMsg } = await parseResponse(resAnalyze);
        if (!resAnalyze.ok) {
          if (resAnalyze.status === 546) throw new Error("Limite de ressources serveur dépassée (546). L'analyse a été interrompue.\n\nConseils :\n• Réessayez dans 1–2 minutes.\n• Choisissez « 1 startup » dans les options pour réduire la charge.");
          if (resAnalyze.status >= 500) throw new Error((errorMsg || "Erreur serveur") + "\n\nRéessayez dans quelques instants ou avec 1 startup.");
          if (resAnalyze.status === 429) throw new Error("Trop de requêtes simultanées. Veuillez patienter.");
          if (resAnalyze.status === 401 || resAnalyze.status === 403) throw new Error("Erreur d'authentification. Veuillez vous reconnecter.");
          throw new Error(errorMsg || "Erreur phase analyse");
        }
        if (data?.error) throw new Error(typeof data.error === "string" ? data.error : data.error?.message || "Erreur");

        useTrialCredit();
        setResult(data as AnalysisResult);

        const startups = data.startups || (data.startup ? [data.startup] : []);
        const reports = data.dueDiligenceReports || (data.dueDiligenceReport ? [data.dueDiligenceReport] : []);

        if (startups.length > 0 && user) {
          await supabase.from("analysis_history").insert({
            user_id: user.id,
            fund_name: fn,
            startup_name: startups[0].name,
            investment_thesis: data.investmentThesis,
            pitch_deck: reports[0] || data.pitchDeck,
          });
          fetchHistory();
        }

        toast({
          title: "Analyse terminée",
          description: `${startups.length} startup(s) trouvée(s). Rapports prêts.`,
        });
      } catch (e) {
        let msg = e instanceof Error ? e.message : "Échec de l'analyse.";
        // Failed to fetch / CORS souvent dû au 546 côté serveur
        if (typeof msg === "string" && (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("abort"))) {
          msg = "Impossible de joindre le serveur (connexion ou timeout). Cause fréquente : limite serveur (546).\n\n• Réessayez dans 1–2 minutes.\n• Utilisez l’option « 1 startup » pour réduire la charge.\n• La qualité reste identique pour une seule startup.";
        }
        setErrorMessage(msg);
        toast({ title: "Erreur", description: msg.split("\n")[0], variant: "destructive", duration: 10000 });
        setResult(null);
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
    const res: AnalysisResult = {
      investmentThesis: item.investment_thesis,
      startup: {
        name: item.startup_name,
        tagline: "",
        sector: "",
        stage: "",
        location: "",
        founded: "",
        teamSize: "",
      },
      dueDiligenceReport: item.pitch_deck,
      dueDiligenceReports: Array.isArray(item.pitch_deck) ? [item.pitch_deck] : item.pitch_deck ? [item.pitch_deck] : [],
    };
    navigate("/analyse", { state: { fromHistory: true, result: res, fundName: item.fund_name } });
  };

  const handleExport = () => {
    if (!result) return;
    const startups = result.startups || (result.startup ? [result.startup] : []);
    const reports = result.dueDiligenceReports || (result.dueDiligenceReport ? [result.dueDiligenceReport] : []) || (result.pitchDeck ? [result.pitchDeck] : []);
    const current = startups[selectedStartupIndex] || startups[0];
    const reportData = reports[selectedStartupIndex] || reports[0];
    const slides: Slide[] = Array.isArray(reportData) ? reportData : reportData ? [reportData] : [];
    if (!current) return;

    const content = slides
      .map((s) => `## ${s.title}\n\n${s.content}\n\n**Points clés:**\n${(s.keyPoints ?? []).map((p) => `- ${p}`).join("\n")}\n\n`)
      .join("---\n\n");
    const blob = new Blob([`# Due Diligence: ${current.name}\n\n${content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${current.name.replace(/\s+/g, "_")}_due_diligence.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Export OK", description: `Rapport ${current.name} téléchargé.` });
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
          onUpgrade={() => setShowPaywall(true)}
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
          onUpgrade={() => setShowPaywall(true)}
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

  const startups = Array.isArray(result.startups) ? result.startups : (result.startup ? [result.startup] : []);
  const reportsRaw = result.dueDiligenceReports ?? result.dueDiligenceReport ?? result.pitchDeck;
  const reports = Array.isArray(reportsRaw) ? reportsRaw : (reportsRaw ? [reportsRaw] : []);
  const currentStartup = startups[selectedStartupIndex];
  const currentReportData = reports[selectedStartupIndex] ?? reports[0];
  const currentReport: Slide[] = Array.isArray(currentReportData) ? currentReportData : (currentReportData ? [currentReportData] : []);

  const rawThesis = result.investmentThesis;
  const thesis = {
    sectors: Array.isArray(rawThesis?.sectors) ? rawThesis.sectors : [],
    stage: rawThesis?.stage ?? "",
    geography: rawThesis?.geography ?? "",
    ticketSize: rawThesis?.ticketSize ?? "",
    description: rawThesis?.description ?? "",
  };

  return (
    <AppLayout
      user={user}
      trialRemaining={trialRemaining}
      hasTrialRemaining={hasTrialRemaining}
      onLogin={handleLogin}
      onSignOut={signOut}
      onUpgrade={() => setShowPaywall(true)}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 max-w-full overflow-x-hidden" data-page="analyse">
        <nav className="lg:col-span-12 flex items-center gap-2 text-sm text-foreground/70 mb-4 min-w-0 overflow-x-hidden">
          <Link to="/" className="hover:text-foreground transition-all duration-300 flex-shrink-0">Accueil</Link>
          <span className="flex-shrink-0 text-foreground/50">/</span>
          <Link to="/analyser" className="hover:text-foreground transition-all duration-300 flex-shrink-0">Configuration</Link>
          <span className="flex-shrink-0 text-foreground/50">/</span>
          <span className="text-foreground font-medium truncate min-w-0">Résultats — {fundName || "Analyse"}</span>
        </nav>
        <aside className="lg:col-span-4 xl:col-span-3 space-y-5 lg:col-start-1 lg:row-start-2">
          <Link
            to="/analyser"
            className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-primary transition-all duration-300 hover:bg-primary/10 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-primary/40 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Nouvelle analyse
          </Link>

          {startups.length > 1 ? (
            <div className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm p-5 space-y-3 shadow-lg">
              <h3 className="text-sm font-semibold text-foreground">Startups ({startups.length})</h3>
              <div className="space-y-2">
                {startups.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedStartupIndex(i)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedStartupIndex === i 
                        ? "border-primary/50 bg-primary/20 glow-ai-vc" 
                        : "border-primary/20 hover:border-primary/40 hover:bg-primary/10"
                    }`}
                  >
                    <div className="font-medium text-sm truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{s.tagline}</div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{s.sector}</Badge>
                      <Badge variant="secondary" className="text-xs">{s.stage}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : startups.length === 1 ? (
            <StartupCard startup={startups[0]} />
          ) : null}

          {result.fundInfo && (
            <FundInfoCard fundInfo={result.fundInfo} metadata={result.analysisMetadata} />
          )}
          <InvestmentCriteria fundName={fundName} thesis={thesis} />

          {history.length > 0 && (
            <AnalysisHistory history={history} onSelect={handleHistorySelect} />
          )}
        </aside>

        <div className="lg:col-span-8 xl:col-span-9 lg:row-start-2 min-w-0 max-w-full overflow-x-hidden">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 break-words bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Page d&apos;analyse — Résultats
          </h1>
          {!currentStartup ? (
            <p className="text-foreground/70">Aucune startup à afficher.</p>
          ) : (
            <Tabs defaultValue="report" className="w-full max-w-full overflow-x-hidden">
              <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-700 p-1 shadow-lg">
                <TabsTrigger 
                  value="report" 
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground glow-ai-vc transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground"
                >
                  Rapport
                </TabsTrigger>
                <TabsTrigger 
                  value="qa" 
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground glow-ai-vc transition-all duration-300 text-foreground/70 data-[state=active]:text-primary-foreground"
                >
                  Assistant IA
                </TabsTrigger>
              </TabsList>
              <TabsContent value="report" className="mt-0 max-w-full overflow-x-hidden">
                <SlideCarousel
                  slides={currentReport}
                  startupName={currentStartup.name}
                  onExport={handleExport}
                />
              </TabsContent>
              <TabsContent value="qa" className="mt-0 max-w-full overflow-x-hidden">
                <div className="rounded-xl border border-primary/40 bg-card/80 backdrop-blur-sm overflow-hidden max-w-full w-full shadow-lg">
                  <div className="h-[580px] overflow-hidden w-full">
                    <AIQAChat
                      startupData={{ ...currentStartup, dueDiligenceReport: currentReport }}
                      investmentThesis={thesis}
                      fundName={fundName}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        defaultView="login"
        onAuthSuccess={() => setTimeout(() => setShowAuthDialog(false), 300)}
      />
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} trialRemaining={trialRemaining} />
    </AppLayout>
  );
}
