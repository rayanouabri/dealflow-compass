import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Source {
  title?: string;
  name?: string;
  url: string;
  type?: string;
}

interface Slide {
  title?: string;
  content?: string;
  keyPoints?: string[] | unknown;
  metrics?: Record<string, string | number>;
  sources?: Source[];
}

interface NormalizedSlide {
  title: string;
  content: string;
  keyPoints: string[];
  metrics?: Record<string, string | number>;
  sources?: { title: string; url: string; type: string }[];
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

function normalizeSlides(slides: Slide[]): NormalizedSlide[] {
  if (!Array.isArray(slides)) return [];
  return slides.map((s) => {
    const keyPoints = Array.isArray(s.keyPoints)
      ? s.keyPoints.filter((p): p is string => typeof p === "string")
      : [];
    const sources = Array.isArray(s.sources)
      ? s.sources
          .filter((src) => src && typeof src === "object" && src.url)
          .map((src) => ({
            title: String(src.title ?? src.name ?? "Source"),
            url: String(src.url),
            type: String(src.type ?? "Source"),
          }))
      : undefined;
    const metrics =
      s.metrics && typeof s.metrics === "object" && !Array.isArray(s.metrics) ? s.metrics : undefined;
    return {
      title: String(s.title ?? ""),
      content: String(s.content ?? ""),
      keyPoints,
      metrics,
      sources: sources && sources.length > 0 ? sources : undefined,
    };
  });
}

export function SlideCarousel({ slides: rawSlides, startupName, onExport }: SlideCarouselProps) {
  const slides = useMemo(() => normalizeSlides(rawSlides ?? []), [rawSlides]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (currentSlide >= slides.length && slides.length > 0) {
      setCurrentSlide(Math.max(0, slides.length - 1));
    }
  }, [slides.length, currentSlide]);

  // Guard against empty or invalid slides — afficher message + bouton Export pour exporter le fallback côté parent
  if (!slides || slides.length === 0) {
    return (
      <Card className="bg-card border-border p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">Aucune slide disponible. Utilisez le bouton ci-dessous pour exporter les données de la startup.</p>
          <Button variant="default" size="sm" className="gap-2" onClick={onExport}>
            <Download className="w-4 h-4" />
            Exporter le rapport (texte)
          </Button>
        </div>
      </Card>
    );
  }

  const safeIndex = Math.min(currentSlide, slides.length - 1);
  const slide = slides[safeIndex];

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

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
            Slide {safeIndex + 1} of {slides.length}
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
            type="button"
            onClick={() => setCurrentSlide(index)}
            className={cn(
              "w-2.5 h-2.5 rounded-full transition-all duration-300",
              index === safeIndex
                ? "bg-primary w-8"
                : "bg-muted hover:bg-muted-foreground/50"
            )}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Main Slide */}
      <Card className="bg-card border-border overflow-hidden shadow-lg">
        <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
        <CardContent className="p-8 md:p-10 min-h-[650px]">
          <div className="flex items-start gap-6 mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 border border-primary/20">
              <span className="text-3xl">{SLIDE_ICONS[safeIndex] || "📄"}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Slide {safeIndex + 1} / {slides.length}
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
                {(slide.content || "").split('\n\n').map((paragraph, i) => (
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

            {/* Metrics - Enhanced Layout (avant les sources) */}
            {slide.metrics && typeof slide.metrics === "object" && !Array.isArray(slide.metrics) && Object.keys(slide.metrics).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-accent rounded-full" />
                  <p className="text-sm font-semibold text-foreground uppercase tracking-wider">Métriques Clés</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.entries(slide.metrics)
                    .filter(([key, value]) => {
                      // Filtrer les métriques vides ou "Non disponible" sans estimation
                      if (!value) return false;
                      const strValue = String(value).toLowerCase();
                      if (strValue === "non disponible" || strValue === "n/a" || strValue === "na") return false;
                      return true;
                    })
                    .map(([key, value]) => {
                    // Formatage intelligent des valeurs avec validation par type de métrique
                    let formattedValue: string;
                    let isEstimation = false;
                    let sourceInfo = "";
                    
                    const keyUpper = key.toUpperCase();
                    
                    // Détecter le type de métrique pour appliquer les bonnes règles
                    const isTeamSize = keyUpper.includes('TEAM') && (keyUpper.includes('SIZE') || keyUpper.includes('EMPLOYEES') || keyUpper.includes('HEADCOUNT'));
                    const isMarketShare = keyUpper.includes('MARKET') && keyUpper.includes('SHARE');
                    const isCompetitorCount = (keyUpper.includes('COMPETITOR') && keyUpper.includes('COUNT')) || 
                        (keyUpper.includes('COMPETITOR') && keyUpper.includes('NUMBER')) ||
                        keyUpper === 'COMPETITORCOUNT';
                    const isPercentage = keyUpper.includes('GROWTH') || keyUpper.includes('CHURN') || keyUpper.includes('MARGIN') || 
                                        keyUpper.includes('NRR') || keyUpper.includes('CAGR') || keyUpper.includes('RATE') ||
                                        keyUpper.includes('RETENTION') || keyUpper.includes('CONVERSION') ||
                                        (keyUpper.includes('MRR') && keyUpper.includes('GROWTH')) ||
                                        (keyUpper.includes('ARR') && keyUpper.includes('GROWTH')) ||
                                        keyUpper.includes('MOM') || keyUpper.includes('YOY') ||
                                        isMarketShare; // Market Share est aussi un pourcentage
                    const isRevenue = (keyUpper.includes('MRR') && !keyUpper.includes('GROWTH')) || 
                                     (keyUpper.includes('ARR') && !keyUpper.includes('GROWTH')) || 
                                     keyUpper.includes('REVENUE') || keyUpper.includes('REVENU');
                    const isMarketSize = keyUpper.includes('TAM') || keyUpper.includes('SAM') || keyUpper.includes('SOM');
                    
                    if (typeof value === "number") {
                      // Team size - nombre d'employés (pas de $, pas de M/K)
                      if (isTeamSize) {
                        if (value > 0 && value <= 50000) {
                          formattedValue = `${Math.round(value)}`;
                        } else {
                          formattedValue = "N/A";
                        }
                      }
                      // Competitor Count - entier pur (pas de $)
                      else if (isCompetitorCount) {
                        if (value > 0 && value <= 1000) {
                          formattedValue = `${Math.round(value)}`;
                        } else {
                          formattedValue = "N/A";
                        }
                      }
                      // Pourcentages (inclut Market Share)
                      else if (isPercentage) {
                        if (value >= -100 && value <= 10000) {
                          formattedValue = `${value.toFixed(1)}%`;
                        } else {
                          formattedValue = "N/A";
                        }
                      }
                      // Revenus (MRR, ARR)
                      else if (isRevenue) {
                        if (value >= 1000000000) {
                          formattedValue = `$${(value / 1000000000).toFixed(1)}B`;
                        } else if (value >= 1000000) {
                          formattedValue = `$${(value / 1000000).toFixed(1)}M`;
                        } else if (value >= 1000) {
                          formattedValue = `$${(value / 1000).toFixed(1)}K`;
                        } else {
                          formattedValue = `$${value.toLocaleString()}`;
                        }
                      }
                      // Taille de marché
                      else if (isMarketSize) {
                        if (value >= 1000000000) {
                          formattedValue = `$${(value / 1000000000).toFixed(1)}B`;
                        } else if (value >= 1000000) {
                          formattedValue = `$${(value / 1000000).toFixed(1)}M`;
                        } else {
                          formattedValue = `$${value.toLocaleString()}`;
                        }
                      }
                      // Autres montants financiers
                      else {
                        if (value >= 1000000000) {
                          formattedValue = `$${(value / 1000000000).toFixed(1)}B`;
                        } else if (value >= 1000000) {
                          formattedValue = `$${(value / 1000000).toFixed(1)}M`;
                        } else if (value >= 1000) {
                          formattedValue = `$${(value / 1000).toFixed(1)}K`;
                        } else {
                          formattedValue = value.toLocaleString();
                        }
                      }
                    } else if (typeof value === "string") {
                      const valueStr = value.trim();
                      
                      // Détecter si c'est une estimation
                      if (valueStr.toLowerCase().includes("estimation") || valueStr.toLowerCase().includes("(estimation")) {
                        isEstimation = true;
                      }
                      
                      // Extraire la source si présente
                      const sourceMatch = valueStr.match(/\(source[^)]*\)/i) || valueStr.match(/source:\s*([^)]+)/i);
                      if (sourceMatch) {
                        sourceInfo = sourceMatch[0];
                      }
                      
                      // Team size - ne JAMAIS convertir en millions, rejeter si contient M/K/B
                      if (isTeamSize) {
                        // Rejeter si contient des unités monétaires
                        if (/[MKm](\s|$)/.test(valueStr) || valueStr.includes('million') || valueStr.includes('M€') || valueStr.includes('M$')) {
                          formattedValue = "N/A";
                        } else {
                          const numMatch = valueStr.match(/(\d+)/);
                          if (numMatch) {
                            const num = parseInt(numMatch[1], 10);
                            if (num > 0 && num <= 50000) {
                              formattedValue = `${num}`;
                            } else {
                              formattedValue = "N/A";
                            }
                          } else {
                            formattedValue = "N/A";
                          }
                        }
                      }
                      // Competitor Count - entier pur, rejeter si contient $ ou unités monétaires
                      else if (isCompetitorCount) {
                        // Rejeter si contient $, €, ou unités monétaires
                        if (valueStr.includes('$') || valueStr.includes('€') || valueStr.includes('million') || valueStr.includes('M€') || valueStr.includes('M$')) {
                          formattedValue = "N/A";
                        } else {
                          const numMatch = valueStr.match(/(\d+)/);
                          if (numMatch) {
                            const num = parseInt(numMatch[1], 10);
                            if (num > 0 && num <= 1000) {
                              formattedValue = `${num}`;
                            } else {
                              formattedValue = "N/A";
                            }
                          } else {
                            formattedValue = "N/A";
                          }
                        }
                      }
                      // Market Share - pourcentage (0-100%), rejeter si contient $ ou montants
                      else if (isMarketShare) {
                        // Rejeter si contient $ ou unités monétaires
                        if (valueStr.includes('$') || valueStr.includes('€') || valueStr.includes('million') || valueStr.includes('M€') || valueStr.includes('M$')) {
                          formattedValue = "N/A";
                        } else {
                          const numMatch = valueStr.match(/(-?\d+\.?\d*)/);
                          if (numMatch) {
                            const num = parseFloat(numMatch[1]);
                            if (num >= 0 && num <= 100) {
                              formattedValue = `${num.toFixed(1)}%`;
                            } else {
                              formattedValue = "N/A";
                            }
                          } else {
                            formattedValue = "N/A";
                          }
                        }
                      }
                      // Pourcentages - toujours ajouter %, même si déjà présent
                      else if (isPercentage) {
                        // Extraire le nombre (peut avoir % déjà)
                        const numMatch = valueStr.match(/(-?\d+\.?\d*)/);
                        if (numMatch) {
                          const num = parseFloat(numMatch[1]);
                          if (num >= -100 && num <= 10000) {
                            formattedValue = `${num.toFixed(1)}%`;
                          } else {
                            formattedValue = "N/A";
                          }
                        } else {
                          formattedValue = "N/A";
                        }
                      }
                      // Revenus et montants
                      else {
                        const numberMatch = valueStr.match(/\$?([\d,]+\.?\d*)\s*([BKMbkm]?)/);
                        if (numberMatch) {
                          let num = parseFloat(numberMatch[1].replace(/,/g, ''));
                          const unit = numberMatch[2].toUpperCase();
                          
                          if (unit === 'B') num = num * 1e9;
                          else if (unit === 'M') num = num * 1e6;
                          else if (unit === 'K') num = num * 1e3;
                          else if (!unit && isMarketSize && num > 0 && num < 1000) {
                            // TAM/SAM/SOM sans unité = billions par défaut
                            num = num * 1e9;
                          } else if (!unit && isRevenue && num > 0 && num < 1000) {
                            // MRR/ARR sans unité = millions par défaut
                            num = num * 1e6;
                          }
                          
                          if (!isNaN(num) && num > 0) {
                            if (num >= 1e9) {
                              formattedValue = `$${(num / 1e9).toFixed(1)}B`;
                            } else if (num >= 1e6) {
                              formattedValue = `$${(num / 1e6).toFixed(1)}M`;
                            } else if (num >= 1e3) {
                              formattedValue = `$${(num / 1e3).toFixed(1)}K`;
                            } else {
                              formattedValue = `$${num.toLocaleString()}`;
                            }
                          } else {
                            formattedValue = valueStr.replace(/\(source[^)]*\)/gi, '').replace(/source:\s*[^,)]+/gi, '').trim();
                          }
                        } else {
                          formattedValue = valueStr.replace(/\(source[^)]*\)/gi, '').replace(/source:\s*[^,)]+/gi, '').trim();
                        }
                      }
                    } else {
                      formattedValue = String(value);
                    }
                    
                    // Formatage des clés avec unités intelligentes
                    let formattedKey = key
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, str => str.toUpperCase())
                      .replace(/(arr|mrr|nrr|cac|ltv|tam|sam|som|cagr)/gi, (match) => match.toUpperCase())
                      .trim();
                    
                    // Ajouter unité par défaut si manquante pour certaines métriques (keyUpper déjà défini plus haut)
                    if ((keyUpper.includes('TAM') || keyUpper.includes('SAM') || keyUpper.includes('SOM')) && formattedValue && !formattedValue.includes('B') && !formattedValue.includes('M')) {
                      // Si TAM/SAM/SOM sans unité visible, c'est probablement en billions
                      if (!formattedValue.match(/[BMK]/)) {
                        // Pas d'unité détectée, ajouter B par défaut pour TAM/SAM/SOM
                        const numMatch = formattedValue.match(/\$?([\d.]+)/);
                        if (numMatch) {
                          const num = parseFloat(numMatch[1]);
                          if (num > 0 && num < 1000) {
                            formattedValue = `$${num}B`;
                          }
                        }
                      }
                    }
                    
                    return (
                      <div 
                        key={key} 
                        className="bg-gradient-to-br from-card via-card to-secondary/20 rounded-xl p-5 border border-border hover:border-primary/30 hover:shadow-md transition-all shadow-sm"
                      >
                        <p className="text-2xl md:text-3xl font-bold text-primary mb-2 leading-tight">
                          {formattedValue}
                          {isEstimation && (
                            <span className="text-sm font-normal text-muted-foreground ml-2">(estimation)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider leading-tight font-medium">
                          {formattedKey}
                        </p>
                        {sourceInfo && !isEstimation && (
                          <p className="text-[10px] text-muted-foreground mt-1 truncate" title={sourceInfo}>
                            {sourceInfo.length > 30 ? sourceInfo.substring(0, 30) + '...' : sourceInfo}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sources de cette slide uniquement (contexte : équipe, marché, financements, etc.) */}
            {slide.sources && slide.sources.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground uppercase tracking-wider">Sources (cette page)</p>
                  <span className="text-xs text-muted-foreground">({slide.sources.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {slide.sources.map((source, idx) => {
                    const shortUrl = (() => {
                      try {
                        const u = new URL(source.url);
                        const host = u.hostname.replace("www.", "");
                        const path = u.pathname === "/" ? "" : u.pathname;
                        const full = host + path;
                        return full.length > 45 ? full.slice(0, 42) + "…" : full;
                      } catch {
                        return source.url.length > 45 ? source.url.slice(0, 42) + "…" : source.url;
                      }
                    })();
                    return (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={source.url}
                        className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 border border-border/50 hover:border-primary/30 transition-all group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {source.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate" title={source.url}>
                            {shortUrl}
                          </p>
                          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {source.type}
                          </span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                      </a>
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
