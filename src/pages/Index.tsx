import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SearchInput } from "@/components/SearchInput";
import { InvestmentCriteria } from "@/components/InvestmentCriteria";
import { StartupCard } from "@/components/StartupCard";
import { SlideCarousel } from "@/components/SlideCarousel";
import { AnalysisHistory } from "@/components/AnalysisHistory";
import { LoadingState } from "@/components/LoadingState";
import { FundInfoCard } from "@/components/FundInfo";
import { LandingPage } from "@/components/LandingPage";
import { AnalysisParameters, AnalysisParams, defaultParams } from "@/components/AnalysisParameters";
import { CustomThesisInput, CustomThesis } from "@/components/CustomThesisInput";
import { PaywallModal } from "@/components/PaywallModal";
import { useTrial } from "@/hooks/useTrial";
import { BarChart3, ArrowLeft, Crown, Sparkles, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FundInfo {
  officialName: string;
  website?: string;
  headquarters?: string;
  foundedYear?: number | string;
  aum?: string;
  teamSize?: number | string;
  keyPartners?: string[];
  notablePortfolio?: string[];
  recentNews?: string[];
  sources?: string[];
}

interface InvestmentThesis {
  sectors: string[];
  stage: string;
  geography: string;
  ticketSize: string;
  description: string;
  differentiators?: string;
  valueAdd?: string;
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

interface Slide {
  title: string;
  content: string;
  keyPoints: string[];
  metrics?: Record<string, string | number>;
}

interface AnalysisMetadata {
  confidence: "high" | "medium" | "low";
  dataQuality?: string;
  limitations?: string;
  lastUpdated?: string;
}

interface AnalysisResult {
  fundInfo?: FundInfo;
  investmentThesis: InvestmentThesis;
  startup?: Startup; // Keep for backward compatibility
  startups?: Startup[]; // New: array of startups
  dueDiligenceReport?: Slide[]; // Keep for backward compatibility
  dueDiligenceReports?: Slide[]; // New: array of reports
  pitchDeck?: Slide[]; // Keep for backward compatibility
  analysisMetadata?: AnalysisMetadata;
}

interface HistoryItem {
  id: string;
  fund_name: string;
  startup_name: string;
  investment_thesis: InvestmentThesis;
  pitch_deck: Slide[];
  created_at: string;
}

type AppView = "landing" | "analyzer" | "results";

export default function Index() {
  const { toast } = useToast();
  const { trialRemaining, hasTrialRemaining, useTrialCredit } = useTrial();
  
  const [view, setView] = useState<AppView>("landing");
  const [isLoading, setIsLoading] = useState(false);
  const [fundName, setFundName] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [params, setParams] = useState<AnalysisParams>(defaultParams);
  const [showPaywall, setShowPaywall] = useState(false);
  const [useCustomThesis, setUseCustomThesis] = useState(false);
  const [customThesis, setCustomThesis] = useState<CustomThesis>({});
  const [selectedStartupIndex, setSelectedStartupIndex] = useState(0);

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("analysis_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setHistory(data as unknown as HistoryItem[]);
    }
  };

  const handleStartTrial = () => {
    setView("analyzer");
  };

  const handleLogin = () => {
    // TODO: Implement login
    toast({
      title: "Coming Soon",
      description: "Sign in functionality will be available soon.",
    });
  };

  const handleSearch = async (searchFundName?: string) => {
    // Check trial credits
    if (!hasTrialRemaining) {
      setShowPaywall(true);
      return;
    }

    // Validation
    if (!useCustomThesis && !searchFundName?.trim()) {
      toast({
        title: "Fund name required",
        description: "Please enter a fund name or use custom thesis",
        variant: "destructive",
      });
      return;
    }

    if (useCustomThesis && !customThesis.sectors?.length && !customThesis.description) {
      toast({
        title: "Thesis required",
        description: "Please provide at least sectors or description for your custom thesis",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    if (searchFundName) setFundName(searchFundName);
    setResult(null);
    setSelectedStartupIndex(0);

    try {
      const requestBody: any = {
        params: {
          ...params,
          numberOfStartups: params.numberOfStartups || 1,
          includeCompetitors: params.includeCompetitors,
          includeMarketSize: params.includeMarketSize,
          detailedFinancials: params.detailedFinancials,
          includeMoat: params.includeMoat,
          detailLevel: params.detailLevel,
          slideCount: params.slideCount || 8,
        },
      };

      if (useCustomThesis) {
        requestBody.customThesis = customThesis;
      } else {
        requestBody.fundName = searchFundName;
      }

      // Use direct fetch to get better error messages
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase configuration missing. Please check your .env file.");
      }

      const functionUrl = `${supabaseUrl}/functions/v1/analyze-fund`;
      
      console.log("Calling Edge Function:", functionUrl);
      console.log("Request body:", JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify(requestBody),
      });

      let data: any;
      const responseText = await response.text();
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse response:", responseText);
        throw new Error(`Edge Function returned invalid JSON. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        // Extract error message from response
        const errorMessage = data?.error 
          ? (typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error))
          : `Edge Function error (${response.status}): ${responseText.substring(0, 200)}`;
        
        console.error("Edge Function error:", { status: response.status, data, responseText });
        throw new Error(errorMessage);
      }

      if (data?.error) {
        // Extract detailed error message from Edge Function response
        const errorMessage = typeof data.error === 'string' 
          ? data.error 
          : (data.error?.message || JSON.stringify(data.error));
        console.error("Edge Function error response:", data);
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error("No data returned from Edge Function. Please check the function logs.");
      }

      // Use trial credit
      useTrialCredit();

      setResult(data as AnalysisResult);
      setView("results");

      // Save to history (save first startup if multiple)
      const startups = data.startups || (data.startup ? [data.startup] : []);
      const reports = data.dueDiligenceReports || (data.dueDiligenceReport ? [data.dueDiligenceReport] : []);
      
      if (startups.length > 0) {
        const { error: insertError } = await supabase.from("analysis_history").insert({
          fund_name: useCustomThesis ? "Custom Thesis" : searchFundName,
          startup_name: startups[0].name,
          investment_thesis: data.investmentThesis,
          pitch_deck: reports[0] || data.pitchDeck,
        });

        if (!insertError) {
          fetchHistory();
        }
      }

      toast({
        title: "Sourcing Complete",
        description: `Found ${startups.length} matching startup(s). Due diligence reports ready.`,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to analyze";
      
      // Log full error details for debugging
      console.error("Full error details:", {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Détecter les différents types d'erreurs
      const isPaymentRequired = /payment required/i.test(errorMessage);
      const isApiKeyMissing = /api key|key not found|gemini_api_key|not configured/i.test(errorMessage);
      const isRateLimited = /rate limit|429/i.test(errorMessage);

      let title = "Analysis Failed";
      let description = errorMessage;

      if (isApiKeyMissing) {
        title = "🔧 Configuration Requise";
        description = `La clé API Gemini n'est pas configurée.\n\n📖 Étapes :\n1. Obtenez une clé gratuite sur https://makersuite.google.com/app/apikey\n2. Dans Supabase Dashboard → Edge Functions → analyze-fund → Settings → Secrets\n3. Ajoutez le secret "GEMINI_API_KEY" avec votre clé\n\nGuide complet : Voir GEMINI_SETUP.md`;
      } else if (isRateLimited) {
        title = "⏱️ Rate Limit Exceeded";
        description = "Trop de requêtes. Veuillez attendre 30-60 secondes avant de réessayer.";
      } else if (isPaymentRequired) {
        title = "AI credits required";
        description = "Your AI backend is out of credits. Top up your Lovable AI usage (Workspace → Usage) then retry.";
      }

      toast({
        title,
        description,
        variant: "destructive",
        duration: isApiKeyMissing ? 20000 : 10000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setFundName(item.fund_name);
    setResult({
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
      dueDiligenceReport: item.pitch_deck, // Store as due diligence report
      pitchDeck: item.pitch_deck, // Keep for compatibility
    });
    setView("results");
  };

  const handleExport = () => {
    if (!result) return;

    const startups = result.startups || (result.startup ? [result.startup] : []);
    const reports = result.dueDiligenceReports || (result.dueDiligenceReport ? [result.dueDiligenceReport] : []) || (result.pitchDeck ? [result.pitchDeck] : []);
    const currentStartup = startups[selectedStartupIndex] || startups[0];
    const currentReportData = reports[selectedStartupIndex] || reports[0];
    const currentReport: Slide[] = Array.isArray(currentReportData) ? currentReportData : currentReportData ? [currentReportData] : [];
    
    if (!currentStartup) return;

    const content = currentReport
      .map(
        (slide, i) =>
          `## ${slide.title}\n\n${slide.content}\n\n**Key Points:**\n${slide.keyPoints.map((p) => `- ${p}`).join("\n")}\n\n`
      )
      .join("---\n\n");

    const blob = new Blob([`# Due Diligence Report: ${currentStartup.name}\n\n## Investment Opportunity Analysis\n\n${content}`], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentStartup.name.replace(/\s+/g, "_")}_due_diligence.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Due diligence report for ${currentStartup.name} downloaded`,
    });
  };

  const handleBackToAnalyzer = () => {
    setResult(null);
    setView("analyzer");
  };

  const handleBackToLanding = () => {
    setResult(null);
    setView("landing");
  };

  // Landing Page
  if (view === "landing") {
    return (
      <LandingPage 
        onStartTrial={handleStartTrial}
        onLogin={handleLogin}
        trialRemaining={trialRemaining}
      />
    );
  }

  // Analyzer & Results View
  return (
    <div className="min-h-screen bg-background terminal-grid">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleBackToLanding} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">DealFlow Compass</h1>
                  <p className="text-xs text-muted-foreground">Startup Sourcing & Due Diligence Platform</p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3">
              {hasTrialRemaining ? (
                <Badge variant="outline" className="gap-1.5 px-3 py-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  {trialRemaining} startup analyses left
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5 px-3 py-1 border-destructive/50 text-destructive">
                  Trial ended
                </Badge>
              )}
              <Button size="sm" className="gap-2" onClick={() => setShowPaywall(true)}>
                <Crown className="w-4 h-4" />
                Upgrade
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-8">
        {view === "analyzer" && !isLoading && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-8 pt-4">
              <button 
                onClick={handleBackToLanding}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </button>
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Source Startups Matching Your Thesis</h2>
                <p className="text-muted-foreground">
                  Analysez un fond VC existant ou définissez votre propre thèse d'investissement pour trouver des startups correspondantes.
                </p>
              </div>

              <div className="space-y-6">
                {/* Toggle entre fond VC et thèse personnalisée */}
                <div className="flex items-center justify-center gap-4 p-4 bg-card rounded-lg border border-border">
                  <Button
                    variant={!useCustomThesis ? "default" : "outline"}
                    onClick={() => setUseCustomThesis(false)}
                    className="flex-1"
                  >
                    Analyser un fond VC
                  </Button>
                  <Button
                    variant={useCustomThesis ? "default" : "outline"}
                    onClick={() => setUseCustomThesis(true)}
                    className="flex-1"
                  >
                    Ma thèse personnalisée
                  </Button>
                </div>

                {!useCustomThesis ? (
                  <SearchInput 
                    onSearch={(name) => {
                      setFundName(name);
                      handleSearch(name);
                    }}
                    value={fundName}
                    onChange={setFundName}
                    isLoading={isLoading} 
                  />
                ) : (
                  <CustomThesisInput
                    thesis={customThesis}
                    onChange={setCustomThesis}
                    onClear={() => setCustomThesis({})}
                  />
                )}
                
                <AnalysisParameters 
                  params={params} 
                  onChange={setParams}
                  isPro={false}
                />

                {/* Bouton de recherche */}
                <Button
                  onClick={() => handleSearch(fundName)}
                  disabled={isLoading || (!useCustomThesis && !fundName.trim())}
                  size="lg"
                  className="w-full"
                >
                  {isLoading ? "Analyse en cours..." : `Générer ${params.numberOfStartups || 1} startup(s)`}
                </Button>
              </div>
            </div>

            {history.length > 0 && (
              <div className="max-w-md mx-auto mt-8">
                <AnalysisHistory history={history} onSelect={handleHistorySelect} />
              </div>
            )}
          </div>
        )}

        {isLoading && <LoadingState />}

        {view === "results" && result && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar */}
            <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
              <button
                onClick={handleBackToAnalyzer}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                New Analysis
              </button>
              
              {result.fundInfo && (
                <FundInfoCard fundInfo={result.fundInfo} metadata={result.analysisMetadata} />
              )}
              <InvestmentCriteria fundName={fundName || "Custom Thesis"} thesis={result.investmentThesis} />
              
              {/* Affichage des startups multiples */}
              {(() => {
                const startups = result.startups || (result.startup ? [result.startup] : []);
                const reports = result.dueDiligenceReports || (result.dueDiligenceReport ? [result.dueDiligenceReport] : []) || (result.pitchDeck ? [result.pitchDeck] : []);
                
                if (startups.length > 1) {
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Startups trouvées ({startups.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {startups.map((startup, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedStartupIndex(idx)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              selectedStartupIndex === idx
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/30'
                            }`}
                          >
                            <div className="font-medium text-sm">{startup.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">{startup.tagline}</div>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">{startup.sector}</Badge>
                              <Badge variant="secondary" className="text-xs">{startup.stage}</Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                
                return startups.length > 0 ? <StartupCard startup={startups[0]} /> : null;
              })()}
              
              {history.length > 0 && (
                <AnalysisHistory history={history} onSelect={handleHistorySelect} />
              )}
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-8 xl:col-span-9">
              {(() => {
                const startups = result.startups || (result.startup ? [result.startup] : []);
                const reports = result.dueDiligenceReports || (result.dueDiligenceReport ? [result.dueDiligenceReport] : []) || (result.pitchDeck ? [result.pitchDeck] : []);
                const currentStartup = startups[selectedStartupIndex];
                const currentReportData = reports[selectedStartupIndex] || reports[0];
                const currentReport: Slide[] = Array.isArray(currentReportData) ? currentReportData : currentReportData ? [currentReportData] : [];
                
                if (!currentStartup) return null;
                
                return (
                  <SlideCarousel
                    slides={currentReport}
                    startupName={currentStartup.name}
                    onExport={handleExport}
                  />
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-auto">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <p className="text-xs text-muted-foreground text-center">
            DealFlow Compass • AI-Powered Startup Sourcing & Due Diligence for VC Funds
          </p>
        </div>
      </footer>

      {/* Paywall Modal */}
      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)}
        trialRemaining={trialRemaining}
      />
    </div>
  );
}
