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
import { ArrowLeft } from "lucide-react";

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

    (async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) throw new Error("Configuration Supabase manquante.");

        const res = await fetch(`${supabaseUrl}/functions/v1/analyze-fund`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
          body: JSON.stringify(requestBody),
        });

        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Réponse invalide (${res.status}).`);
        }

        if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : data?.error?.message || "Erreur API");
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
        const msg = e instanceof Error ? e.message : "Échec de l'analyse.";
        toast({ title: "Erreur", description: msg, variant: "destructive", duration: 10000 });
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
      .map((s) => `## ${s.title}\n\n${s.content}\n\n**Points clés:**\n${s.keyPoints.map((p) => `- ${p}`).join("\n")}\n\n`)
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
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <p className="text-muted-foreground">L&apos;analyse a échoué.</p>
            <Button onClick={handleBack} variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Nouvelle analyse
            </Button>
          </div>
        </AppLayout>
        <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} defaultView="login" onAuthSuccess={() => setShowAuthDialog(false)} />
        <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} trialRemaining={trialRemaining} />
      </>
    );
  }

  const startups = result.startups || (result.startup ? [result.startup] : []);
  const reports = result.dueDiligenceReports || (result.dueDiligenceReport ? [result.dueDiligenceReport] : []) || (result.pitchDeck ? [result.pitchDeck] : []);
  const currentStartup = startups[selectedStartupIndex];
  const currentReportData = reports[selectedStartupIndex] || reports[0];
  const currentReport: Slide[] = Array.isArray(currentReportData) ? currentReportData : currentReportData ? [currentReportData] : [];

  const thesis = result.investmentThesis || { sectors: [], stage: "", geography: "", ticketSize: "", description: "" };

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
