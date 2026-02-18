import { Building2, MapPin, DollarSign, Layers, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface InvestmentThesis {
  sectors: string[];
  stage: string;
  geography: string;
  ticketSize: string;
  description: string;
  differentiators?: string;
  valueAdd?: string;
}

interface InvestmentCriteriaProps {
  fundName: string;
  thesis: InvestmentThesis;
}

export function InvestmentCriteria({ fundName, thesis }: InvestmentCriteriaProps) {
  return (
    <Card className="bg-card border-border animate-slide-in-right">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg text-foreground">{fundName}</CardTitle>
            <p className="text-sm text-muted-foreground">Investment Criteria</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Target className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">Focus Sectors</p>
              <div className="flex flex-wrap gap-1.5">
                {(thesis.sectors ?? []).map((sector, i) => (
                  <Badge key={i} variant="secondary" className="bg-secondary/80 text-secondary-foreground text-xs">
                    {sector}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Layers className="w-4 h-4 text-accent mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Stage</p>
              <p className="text-sm text-foreground font-medium">{thesis.stage}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-data-amber mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Geography</p>
              <p className="text-sm text-foreground font-medium">{thesis.geography}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="w-4 h-4 text-chart-green mt-1 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ticket Size</p>
              <p className="text-sm text-foreground font-medium">{thesis.ticketSize}</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium">Thesis Summary</p>
          <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-line">{thesis.description}</p>
        </div>

        {thesis.differentiators && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium">Differentiators</p>
            <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-line">{thesis.differentiators}</p>
          </div>
        )}

        {thesis.valueAdd && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium">Value Add</p>
            <p className="text-sm text-secondary-foreground leading-relaxed whitespace-pre-line">{thesis.valueAdd}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
