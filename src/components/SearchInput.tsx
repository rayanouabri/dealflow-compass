import { useState } from "react";
import { Search, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  onSearch: (fundName: string) => void;
  isLoading: boolean;
}

const EXAMPLE_FUNDS = [
  "Andreessen Horowitz",
  "Sequoia Capital",
  "Accel",
  "Benchmark",
  "Index Ventures",
  "Bessemer Venture Partners",
];

export function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [fundName, setFundName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fundName.trim() && !isLoading) {
      onSearch(fundName.trim());
    }
  };

  const handleExampleClick = (fund: string) => {
    setFundName(fund);
    onSearch(fund);
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-slide-in-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered VC Analysis</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
          VC Dealflow<span className="text-gradient-success"> Analyst</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Enter a VC fund name to analyze their investment thesis and generate a matching startup pitch deck.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative mb-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex gap-3 p-2 bg-card border border-border rounded-xl transition-all duration-300 group-hover:border-primary/30">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                value={fundName}
                onChange={(e) => setFundName(e.target.value)}
                placeholder="Enter VC fund name (e.g., Andreessen Horowitz)"
                className="pl-12 h-12 bg-transparent border-0 text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              variant="success"
              disabled={!fundName.trim() || isLoading}
              className="px-8"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Analyze</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">Try:</span>
        {EXAMPLE_FUNDS.map((fund) => (
          <button
            key={fund}
            onClick={() => handleExampleClick(fund)}
            disabled={isLoading}
            className="px-3 py-1.5 text-sm rounded-lg bg-secondary/50 text-secondary-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fund}
          </button>
        ))}
      </div>
    </div>
  );
}
