import { Rocket, MapPin, Users, Calendar, Tag, Lightbulb, Target, Shield, Globe, ExternalLink, Linkedin, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Source {
  name?: string;
  url?: string;
  type?: string;
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
  website?: string;
  linkedin?: string;
  linkedinUrl?: string;
  revenue?: string | number;
  fundingHistory?: string | any;
  verificationStatus?: "verified" | "partially_verified" | "estimated";
  sources?: (string | Source)[];
}

interface StartupCardProps {
  startup: Startup;
}

export function StartupCard({ startup }: StartupCardProps) {
  return (
    <Card className="bg-card border-border overflow-hidden animate-slide-in-right">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
            <Rocket className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-foreground truncate">{startup.name}</h3>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                Match
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{startup.tagline}</p>
            
            {/* Links */}
            <div className="flex gap-2 mb-3">
              {startup.website && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  asChild
                >
                  <a
                    href={startup.website.startsWith("http") ? startup.website : `https://${startup.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <Globe className="w-3 h-3" />
                    Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              )}
              {(startup.linkedin || startup.linkedinUrl) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  asChild
                >
                  <a
                    href={(startup.linkedinUrl || startup.linkedin || "").startsWith("http") ? (startup.linkedinUrl || startup.linkedin || "") : `https://${startup.linkedinUrl || startup.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <Linkedin className="w-3 h-3" />
                    LinkedIn
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-secondary-foreground">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                {startup.sector}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                {startup.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-data-amber" />
                {startup.founded}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-chart-green" />
                {(() => {
                  // Formater teamSize correctement (ne jamais afficher en millions)
                  const teamSize = startup.teamSize;
                  if (typeof teamSize === "number") {
                    if (teamSize > 0 && teamSize <= 50000) {
                      return `${Math.round(teamSize)} employees`;
                    }
                    return "N/A";
                  }
                  const str = String(teamSize).trim();
                  // Extraire uniquement le nombre, pas d'unité M/K
                  const numMatch = str.match(/(\d+)/);
                  if (numMatch) {
                    const num = parseInt(numMatch[1], 10);
                    if (num > 0 && num <= 50000) {
                      return `${num} employees`;
                    }
                  }
                  return str.includes("N/A") || str.includes("n/a") ? "N/A" : `${str} employees`;
                })()}
              </span>
              {startup.revenue && (
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-chart-green" />
                  {startup.revenue}
                </span>
              )}
            </div>

            {/* Verification Status */}
            {startup.verificationStatus && (
              <div className="mt-2">
                <Badge 
                  variant={startup.verificationStatus === "verified" ? "default" : "outline"}
                  className={`text-xs ${
                    startup.verificationStatus === "verified" 
                      ? "bg-chart-green/20 text-chart-green border-chart-green/30"
                      : startup.verificationStatus === "partially_verified"
                      ? "bg-data-amber/20 text-data-amber border-data-amber/30"
                      : "bg-chart-red/20 text-chart-red border-chart-red/30"
                  }`}
                >
                  {startup.verificationStatus === "verified" && "✓ Vérifié"}
                  {startup.verificationStatus === "partially_verified" && "⚠ Partiellement vérifié"}
                  {startup.verificationStatus === "estimated" && "ℹ Estimé"}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Problem & Solution */}
        {(startup.problem || startup.solution) && (
          <div className="space-y-4 pt-4 border-t border-border">
            {startup.problem && (
              <div className="flex gap-3">
                <Target className="w-5 h-5 text-chart-red mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Problem</p>
                  <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-line">{startup.problem}</p>
                </div>
              </div>
            )}
            {startup.solution && (
              <div className="flex gap-3">
                <Lightbulb className="w-5 h-5 text-chart-green mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Solution</p>
                  <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-line">{startup.solution}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Business Model & Moat */}
        {(startup.businessModel || startup.moat || startup.fundingHistory) && (
          <div className="space-y-4 pt-4 border-t border-border">
            {startup.businessModel && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Business Model</p>
                <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-line">{startup.businessModel}</p>
              </div>
            )}
            {startup.moat && (
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Competitive Moat</p>
                  <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-line">{startup.moat}</p>
                </div>
              </div>
            )}
            {startup.fundingHistory && (
              <div className="flex gap-3">
                <TrendingUp className="w-5 h-5 text-chart-green mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Funding History</p>
                  <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-line">
                    {typeof startup.fundingHistory === "string" 
                      ? startup.fundingHistory 
                      : JSON.stringify(startup.fundingHistory)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sources */}
        {startup.sources && startup.sources.length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Sources</p>
            <div className="space-y-1">
              {startup.sources.slice(0, 3).map((source, i) => {
                // Handle both string and object formats
                const sourceUrl = typeof source === 'string' 
                  ? source 
                  : (source as Source).url || '';
                const sourceName = typeof source === 'string'
                  ? source
                  : (source as Source).name || (source as Source).url || 'Source';
                
                if (!sourceUrl) return null;
                
                const url = sourceUrl.startsWith("http") ? sourceUrl : `https://${sourceUrl}`;
                const displayName = sourceName.length > 50 ? `${sourceName.substring(0, 50)}...` : sourceName;
                
                return (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 block"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {displayName}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}