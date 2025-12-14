import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SearchInput } from "@/components/SearchInput";
import { InvestmentCriteria } from "@/components/InvestmentCriteria";
import { StartupCard } from "@/components/StartupCard";
import { SlideCarousel } from "@/components/SlideCarousel";
import { AnalysisHistory } from "@/components/AnalysisHistory";
import { LoadingState } from "@/components/LoadingState";
import { BarChart3 } from "lucide-react";

interface InvestmentThesis {
  sectors: string[];
  stage: string;
  geography: string;
  ticketSize: string;
  description: string;
}

interface Startup {
  name: string;
  tagline: string;
  sector: string;
  stage: string;
  location: string;
  founded: string | number;
  teamSize: string | number;
}

interface Slide {
  title: string;
  content: string;
  keyPoints: string[];
  metrics?: Record<string, string | number>;
}

interface AnalysisResult {
  investmentThesis: InvestmentThesis;
  startup: Startup;
  pitchDeck: Slide[];
}

interface HistoryItem {
  id: string;
  fund_name: string;
  startup_name: string;
  investment_thesis: InvestmentThesis;
  pitch_deck: Slide[];
  created_at: string;
}

export default function Index() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [fundName, setFundName] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

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

  const handleSearch = async (searchFundName: string) => {
    setIsLoading(true);
    setFundName(searchFundName);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-fund", {
        body: { fundName: searchFundName },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data as AnalysisResult);

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

  return (
    <div className="min-h-screen bg-background terminal-grid">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">VC Dealflow Analyst</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Investment Analysis</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="status-dot" />
              <span className="text-xs text-muted-foreground">System Online</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-8">
        {!result && !isLoading && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-12 pt-8">
              <SearchInput onSearch={handleSearch} isLoading={isLoading} />
            </div>

            {history.length > 0 && (
              <div className="max-w-md mx-auto">
                <AnalysisHistory history={history} onSelect={handleHistorySelect} />
              </div>
            )}
          </div>
        )}

        {isLoading && <LoadingState />}

        {result && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar */}
            <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
              <button
                onClick={() => setResult(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 flex items-center gap-1"
              >
                ← New Analysis
              </button>
              
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
            VC Dealflow Analyst • AI-Generated Analysis for Investment Decision Support
          </p>
        </div>
      </footer>
    </div>
  );
}
