import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Slide {
  title: string;
  content: string;
  keyPoints: string[];
  metrics?: Record<string, string | number>;
}

interface SlideCarouselProps {
  slides: Slide[];
  startupName: string;
  onExport: () => void;
}

const SLIDE_ICONS = [
  "💼", // Title & The Ask
  "🔥", // The Problem
  "💡", // The Solution
  "📊", // Market Size
  "📈", // Traction
  "🤝", // Why This Fund
  "👥", // The Team
  "✅", // Recommendation
];

export function SlideCarousel({ slides, startupName, onExport }: SlideCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const slide = slides[currentSlide];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Due Diligence Report: {startupName}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Slide {currentSlide + 1} of {slides.length}
          </p>
        </div>
        <Button variant="terminal" size="sm" onClick={onExport}>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Slide Navigation Dots */}
      <div className="flex items-center justify-center gap-2 py-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              index === currentSlide
                ? "bg-primary w-8"
                : "bg-muted hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* Main Slide */}
      <Card className="bg-card border-border overflow-hidden shadow-lg">
        <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardContent className="p-8 md:p-10 min-h-[650px]">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 border border-primary/20">
              <span className="text-3xl">{SLIDE_ICONS[currentSlide] || "📄"}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Slide {currentSlide + 1} / {slides.length}
                </p>
                <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Due Diligence Report
                </p>
              </div>
              <h3 className="text-3xl font-bold text-foreground leading-tight">{slide.title}</h3>
            </div>
          </div>

          <div className="space-y-6">
            {/* Main Content - Enriched */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="text-secondary-foreground leading-relaxed whitespace-pre-line text-base space-y-4">
                {slide.content.split('\n\n').map((paragraph, i) => (
                  paragraph.trim() && (
                    <p key={i} className="mb-4 last:mb-0">
                      {paragraph.trim()}
                    </p>
                  )
                ))}
              </div>
            </div>

            {/* Key Points - Enhanced */}
            {slide.keyPoints && slide.keyPoints.length > 0 && (
              <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 rounded-lg p-6 border border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <p className="text-sm font-semibold text-foreground uppercase tracking-wider">Points Clés</p>
                </div>
                <ul className="space-y-3">
                  {slide.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                      <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metrics - Enhanced Layout */}
            {slide.metrics && Object.keys(slide.metrics).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-accent rounded-full" />
                  <p className="text-sm font-semibold text-foreground uppercase tracking-wider">Métriques Clés</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.entries(slide.metrics).map(([key, value]) => {
                    // Formatage intelligent des valeurs
                    let formattedValue: string;
                    if (typeof value === "number") {
                      if (value >= 1000000) {
                        formattedValue = `$${(value / 1000000).toFixed(1)}M`;
                      } else if (value >= 1000) {
                        formattedValue = `$${(value / 1000).toFixed(1)}K`;
                      } else {
                        formattedValue = value.toLocaleString();
                      }
                    } else if (typeof value === "string") {
                      // Extraire les nombres des strings comme "$10,000,000" ou "10,000,000"
                      const cleanStr = value.replace(/[$,]/g, '').trim();
                      const num = parseFloat(cleanStr);
                      
                      if (!isNaN(num) && num > 0) {
                        // C'est un nombre, on le formate
                        if (num >= 1000000) {
                          formattedValue = `$${(num / 1000000).toFixed(1)}M`;
                        } else if (num >= 1000) {
                          formattedValue = `$${(num / 1000).toFixed(1)}K`;
                        } else {
                          formattedValue = `$${num.toLocaleString()}`;
                        }
                      } else {
                        // Ce n'est pas un nombre, on garde la valeur originale
                        formattedValue = value;
                      }
                    } else {
                      formattedValue = String(value);
                    }
                    
                    // Formatage des clés
                    const formattedKey = key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, str => str.toUpperCase())
                      .replace(/(arr|mrr|nrr|cac|ltv|tam|sam|som)/gi, (match) => match.toUpperCase())
                      .trim();
                    
                    return (
                      <div 
                        key={key} 
                        className="bg-gradient-to-br from-card via-card to-secondary/20 rounded-xl p-5 border border-border hover:border-primary/30 hover:shadow-md transition-all shadow-sm"
                      >
                        <p className="text-2xl md:text-3xl font-bold text-primary mb-2 leading-tight">
                          {formattedValue}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider leading-tight font-medium">
                          {formattedKey}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="terminal" onClick={goToPrevious}>
          <ChevronLeft className="w-5 h-5" />
          Previous
        </Button>
        <Button variant="terminal" onClick={goToNext}>
          Next
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
