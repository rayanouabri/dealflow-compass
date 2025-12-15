import { Globe, Users, Calendar, Briefcase, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-foreground">Fund Intelligence</CardTitle>
          {metadata?.confidence && (
            <div className="flex items-center gap-1.5">
              {metadata.confidence === "high" ? (
                <CheckCircle2 className={`w-3.5 h-3.5 ${confidenceColors[metadata.confidence]}`} />
              ) : (
                <AlertCircle className={`w-3.5 h-3.5 ${confidenceColors[metadata.confidence]}`} />
              )}
              <span className={`text-xs ${confidenceColors[metadata.confidence]} capitalize`}>
                {metadata.confidence} confidence
              </span>
            </div>
          )}
        </div>
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
                  {partner}
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
                  {company}
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
              {fundInfo.recentNews.slice(0, 3).map((news, i) => (
                <li key={i} className="text-xs text-secondary-foreground leading-relaxed">
                  • {news}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sources */}
        {fundInfo.sources && fundInfo.sources.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sources</p>
            <p className="text-xs text-muted-foreground/70 italic">
              {fundInfo.sources.slice(0, 3).join(", ")}
            </p>
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
