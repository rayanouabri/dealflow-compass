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
            Investment Memo: {startupName}
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
      <Card className="bg-card border-border overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardContent className="p-8 min-h-[480px]">
          <div className="flex items-start gap-4 mb-6">
            <span className="text-4xl">{SLIDE_ICONS[currentSlide] || "📄"}</span>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Slide {currentSlide + 1}
              </p>
              <h3 className="text-2xl font-bold text-foreground">{slide.title}</h3>
            </div>
          </div>

          <div className="space-y-6">
            {/* Main Content */}
            <div className="text-secondary-foreground leading-relaxed whitespace-pre-line">
              {slide.content}
            </div>

            {/* Key Points */}
            {slide.keyPoints && slide.keyPoints.length > 0 && (
              <div className="bg-secondary/30 rounded-lg p-5 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Key Points</p>
                <ul className="space-y-2.5">
                  {slide.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metrics */}
            {slide.metrics && Object.keys(slide.metrics).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(slide.metrics).map(([key, value]) => (
                  <div key={key} className="bg-secondary/50 rounded-lg p-4 text-center border border-border">
                    <p className="text-2xl font-bold text-primary">{value}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{key}</p>
                  </div>
                ))}
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
