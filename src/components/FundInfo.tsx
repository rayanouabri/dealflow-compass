import { Globe, Users, Calendar, Briefcase, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Source {
  name?: string;
  url?: string;
  type?: string;
}

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
  sources?: (string | Source)[];
}

interface AnalysisMetadata {
  confidence: "high" | "medium" | "low";
  dataQuality?: string;
  limitations?: string;
  lastUpdated?: string;
}

interface FundInfoProps {
  fundInfo: FundInfo;
  metadata?: AnalysisMetadata;
}

const confidenceColors = {
  high: "text-chart-green",
  medium: "text-data-amber",
  low: "text-chart-red",
};

export function FundInfoCard({ fundInfo, metadata }: FundInfoProps) {
  return (
    <Card className="bg-card border-border animate-slide-in-right">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground">Fund Intelligence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Official Name & Website */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{fundInfo.officialName}</p>
          {fundInfo.website && (
            <a
              href={fundInfo.website.startsWith("http") ? fundInfo.website : `https://${fundInfo.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Globe className="w-3 h-3" />
              {fundInfo.website}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {fundInfo.headquarters && (
            <div className="text-xs">
              <span className="text-muted-foreground">HQ:</span>
              <span className="text-foreground ml-1">{fundInfo.headquarters}</span>
            </div>
          )}
          {fundInfo.foundedYear && (
            <div className="text-xs">
              <Calendar className="w-3 h-3 inline mr-1 text-muted-foreground" />
              <span className="text-foreground">Est. {fundInfo.foundedYear}</span>
            </div>
          )}
          {fundInfo.aum && (
            <div className="text-xs">
              <Briefcase className="w-3 h-3 inline mr-1 text-muted-foreground" />
              <span className="text-foreground">{fundInfo.aum}</span>
            </div>
          )}
          {fundInfo.teamSize && (
            <div className="text-xs">
              <Users className="w-3 h-3 inline mr-1 text-muted-foreground" />
              <span className="text-foreground">{fundInfo.teamSize} team</span>
            </div>
          )}
        </div>

        {/* Key Partners */}
        {fundInfo.keyPartners && fundInfo.keyPartners.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Key Partners</p>
            <div className="flex flex-wrap gap-1">
              {fundInfo.keyPartners.slice(0, 5).map((partner, i) => (
                <Badge key={i} variant="outline" className="text-xs py-0">
                  {typeof partner === "object" && partner !== null ? (partner as { name?: string }).name || JSON.stringify(partner) : partner}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Notable Portfolio */}
        {fundInfo.notablePortfolio && fundInfo.notablePortfolio.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Notable Portfolio</p>
            <div className="flex flex-wrap gap-1">
              {fundInfo.notablePortfolio.slice(0, 6).map((company, i) => (
                <Badge key={i} variant="secondary" className="text-xs py-0 bg-secondary/60">
                  {typeof company === "object" && company !== null ? (company as { name?: string }).name || JSON.stringify(company) : company}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recent News */}
        {fundInfo.recentNews && fundInfo.recentNews.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Recent Activity</p>
            <ul className="space-y-1">
              {fundInfo.recentNews.slice(0, 3).map((news, i) => {
                const newsText = typeof news === "object" && news !== null 
                  ? (news as { title?: string; description?: string }).title || (news as { description?: string }).description || JSON.stringify(news)
                  : news;
                return (
                  <li key={i} className="text-xs text-secondary-foreground leading-relaxed">
                    • {newsText}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Sources */}
        {fundInfo.sources && fundInfo.sources.length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">Sources & Références</p>
            <div className="space-y-1.5">
              {fundInfo.sources.slice(0, 5).map((source, i) => {
                // Handle both string and object formats
                const sourceUrl = typeof source === "string"
                  ? (source.startsWith("http") ? source : `https://${source}`)
                  : (source as Source).url 
                    ? ((source as Source).url!.startsWith("http") ? (source as Source).url! : `https://${(source as Source).url!}`)
                    : null;
                
                const sourceName = typeof source === "string"
                  ? source
                  : (source as Source).name || (source as Source).url || "Source";
                
                if (sourceUrl) {
                  return (
                    <a
                      key={i}
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1.5 block"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {sourceName.length > 60 ? `${sourceName.substring(0, 60)}...` : sourceName}
                    </a>
                  );
                }
                return (
                  <p key={i} className="text-xs text-muted-foreground/70">
                    • {typeof source === "string" ? source : JSON.stringify(source)}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata Limitations */}
        {metadata?.limitations && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {metadata.limitations}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
