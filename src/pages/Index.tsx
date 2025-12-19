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
import { PaywallModal } from "@/components/PaywallModal";
import { useTrial } from "@/hooks/useTrial";
import { BarChart3, ArrowLeft, Crown, Sparkles } from "lucide-react";
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
  startup: Startup;
  pitchDeck: Slide[];
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

  const handleSearch = async (searchFundName: string) => {
    // Check trial credits
    if (!hasTrialRemaining) {
      setShowPaywall(true);
      return;
    }

    setIsLoading(true);
    setFundName(searchFundName);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-fund", {
        body: { 
          fundName: searchFundName,
          params: params,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Use trial credit
      useTrialCredit();

      setResult(data as AnalysisResult);
      setView("results");

      // Save to history
      const { error: insertError } = await supabase.from("analysis_history").insert({
        fund_name: searchFundName,
        startup_name: data.startup.name,
        investment_thesis: data.investmentThesis,
        pitch_deck: data.pitchDeck,
      });

      if (!insertError) {
        fetchHistory();
      }

      toast({
        title: "Analysis Complete",
        description: `Found matching opportunity: ${data.startup.name}`,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze fund",
        variant: "destructive",
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
      pitchDeck: item.pitch_deck,
    });
    setView("results");
  };

  const handleExport = () => {
    if (!result) return;

    const content = result.pitchDeck
      .map(
        (slide, i) =>
          `## Slide ${i + 1}: ${slide.title}\n\n${slide.content}\n\n**Key Points:**\n${slide.keyPoints.map((p) => `- ${p}`).join("\n")}\n\n`
      )
      .join("---\n\n");

    const blob = new Blob([`# Investment Memo: ${result.startup.name}\n\n${content}`], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.startup.name.replace(/\s+/g, "_")}_memo.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Investment memo downloaded as Markdown",
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
                  <h1 className="text-lg font-semibold text-foreground">DealFlow AI</h1>
                  <p className="text-xs text-muted-foreground">VC Intelligence Platform</p>
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3">
              {hasTrialRemaining ? (
                <Badge variant="outline" className="gap-1.5 px-3 py-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  {trialRemaining} free analyses left
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
                <h2 className="text-2xl font-bold mb-2">Analyze a VC Fund</h2>
                <p className="text-muted-foreground">
                  Enter a fund name to get AI-powered investment thesis analysis and a custom pitch deck
                </p>
              </div>

              <div className="space-y-6">
                <SearchInput onSearch={handleSearch} isLoading={isLoading} />
                
                <AnalysisParameters 
                  params={params} 
                  onChange={setParams}
                  isPro={false}
                />
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
              <InvestmentCriteria fundName={fundName} thesis={result.investmentThesis} />
              <StartupCard startup={result.startup} />
              
              {history.length > 0 && (
                <AnalysisHistory history={history} onSelect={handleHistorySelect} />
              )}
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-8 xl:col-span-9">
              <SlideCarousel
                slides={result.pitchDeck}
                startupName={result.startup.name}
                onExport={handleExport}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-auto">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <p className="text-xs text-muted-foreground text-center">
            DealFlow AI • AI-Generated Analysis for Investment Decision Support
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
