import { Rocket, MapPin, Users, Calendar, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Startup {
  name: string;
  tagline: string;
  sector: string;
  stage: string;
  location: string;
  founded: string | number;
  teamSize: string | number;
}

interface StartupCardProps {
  startup: Startup;
}

export function StartupCard({ startup }: StartupCardProps) {
  return (
    <Card className="bg-card border-border overflow-hidden animate-slide-in-right">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardContent className="pt-5">
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
                {startup.teamSize} employees
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
