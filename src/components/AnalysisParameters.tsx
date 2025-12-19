import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronDown, 
  ChevronUp, 
  Settings2,
  Globe,
  Target,
  DollarSign,
  Building2,
  Briefcase,
  Layers,
  Users,
  TrendingUp,
  Zap
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export interface AnalysisParams {
  // Startup Profile
  startupStage: string;
  startupSector: string;
  businessModel: string;
  targetMarket: string;
  teamSize: string;
  
  // Funding Requirements
  fundingAmount: string;
  fundingStage: string;
  timeline: string;
  
  // Geographic Preferences
  headquartersRegion: string;
  targetGeography: string;
  
  // Analysis Options
  includeCompetitors: boolean;
  includeMarketSize: boolean;
  detailedFinancials: boolean;
  includeMoat: boolean;
  
  // Output Preferences
  deckStyle: string;
  detailLevel: number;
  slideCount: number;
}

interface AnalysisParametersProps {
  params: AnalysisParams;
  onChange: (params: AnalysisParams) => void;
  isPro?: boolean;
}

export const defaultParams: AnalysisParams = {
  startupStage: "seed",
  startupSector: "saas",
  businessModel: "b2b",
  targetMarket: "enterprise",
  teamSize: "1-10",
  fundingAmount: "1-5m",
  fundingStage: "seed",
  timeline: "6-months",
  headquartersRegion: "north-america",
  targetGeography: "global",
  includeCompetitors: true,
  includeMarketSize: true,
  detailedFinancials: false,
  includeMoat: true,
  deckStyle: "modern",
  detailLevel: 70,
  slideCount: 10,
};

export function AnalysisParameters({ params, onChange, isPro = false }: AnalysisParametersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateParam = <K extends keyof AnalysisParams>(key: K, value: AnalysisParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  const stages = [
    { value: "idea", label: "Idea Stage" },
    { value: "pre-seed", label: "Pre-Seed" },
    { value: "seed", label: "Seed" },
    { value: "series-a", label: "Series A" },
    { value: "series-b", label: "Series B+" },
  ];

  const sectors = [
    { value: "saas", label: "SaaS / Software" },
    { value: "fintech", label: "Fintech" },
    { value: "healthtech", label: "Healthtech" },
    { value: "edtech", label: "Edtech" },
    { value: "ecommerce", label: "E-commerce" },
    { value: "ai-ml", label: "AI / ML" },
    { value: "cleantech", label: "Cleantech" },
    { value: "biotech", label: "Biotech" },
    { value: "hardware", label: "Hardware" },
    { value: "consumer", label: "Consumer" },
    { value: "marketplace", label: "Marketplace" },
    { value: "enterprise", label: "Enterprise" },
  ];

  const businessModels = [
    { value: "b2b", label: "B2B" },
    { value: "b2c", label: "B2C" },
    { value: "b2b2c", label: "B2B2C" },
    { value: "marketplace", label: "Marketplace" },
    { value: "subscription", label: "Subscription" },
    { value: "transactional", label: "Transactional" },
  ];

  const targetMarkets = [
    { value: "smb", label: "SMB" },
    { value: "mid-market", label: "Mid-Market" },
    { value: "enterprise", label: "Enterprise" },
    { value: "consumer", label: "Consumer" },
    { value: "prosumer", label: "Prosumer" },
  ];

  const teamSizes = [
    { value: "1-5", label: "1-5 people" },
    { value: "6-10", label: "6-10 people" },
    { value: "11-25", label: "11-25 people" },
    { value: "26-50", label: "26-50 people" },
    { value: "50+", label: "50+ people" },
  ];

  const fundingAmounts = [
    { value: "0-500k", label: "$0 - $500K" },
    { value: "500k-1m", label: "$500K - $1M" },
    { value: "1-5m", label: "$1M - $5M" },
    { value: "5-15m", label: "$5M - $15M" },
    { value: "15-50m", label: "$15M - $50M" },
    { value: "50m+", label: "$50M+" },
  ];

  const timelines = [
    { value: "asap", label: "ASAP" },
    { value: "3-months", label: "3 months" },
    { value: "6-months", label: "6 months" },
    { value: "12-months", label: "12 months" },
    { value: "exploring", label: "Just exploring" },
  ];

  const regions = [
    { value: "north-america", label: "North America" },
    { value: "europe", label: "Europe" },
    { value: "asia", label: "Asia" },
    { value: "latam", label: "Latin America" },
    { value: "mena", label: "MENA" },
    { value: "global", label: "Global" },
  ];

  const deckStyles = [
    { value: "modern", label: "Modern & Clean" },
    { value: "data-driven", label: "Data-Driven" },
    { value: "storytelling", label: "Storytelling" },
    { value: "technical", label: "Technical Deep-Dive" },
    { value: "visual", label: "Visual-Heavy" },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between h-11 px-4"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Analysis Parameters
            {!isOpen && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {params.startupSector} • {params.fundingStage}
              </Badge>
            )}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-6 animate-slide-in-up">
        {/* Startup Profile */}
        <div className="p-4 rounded-lg bg-card border border-border space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Startup Profile
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Stage</Label>
              <Select value={params.startupStage} onValueChange={(v) => updateParam("startupStage", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Sector</Label>
              <Select value={params.startupSector} onValueChange={(v) => updateParam("startupSector", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Business Model</Label>
              <Select value={params.businessModel} onValueChange={(v) => updateParam("businessModel", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {businessModels.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Target Market</Label>
              <Select value={params.targetMarket} onValueChange={(v) => updateParam("targetMarket", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetMarkets.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-xs">Team Size</Label>
              <Select value={params.teamSize} onValueChange={(v) => updateParam("teamSize", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teamSizes.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Funding Requirements */}
        <div className="p-4 rounded-lg bg-card border border-border space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Funding Requirements
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Target Raise</Label>
              <Select value={params.fundingAmount} onValueChange={(v) => updateParam("fundingAmount", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fundingAmounts.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Round Type</Label>
              <Select value={params.fundingStage} onValueChange={(v) => updateParam("fundingStage", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="text-xs">Timeline</Label>
              <Select value={params.timeline} onValueChange={(v) => updateParam("timeline", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timelines.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Geographic Preferences */}
        <div className="p-4 rounded-lg bg-card border border-border space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Geographic Preferences
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Your Location</Label>
              <Select value={params.headquartersRegion} onValueChange={(v) => updateParam("headquartersRegion", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Target Geography</Label>
              <Select value={params.targetGeography} onValueChange={(v) => updateParam("targetGeography", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Analysis Options */}
        <div className="p-4 rounded-lg bg-card border border-border space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Analysis Options
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Competitor Analysis</Label>
              <Switch 
                checked={params.includeCompetitors} 
                onCheckedChange={(v) => updateParam("includeCompetitors", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Market Sizing</Label>
              <Switch 
                checked={params.includeMarketSize} 
                onCheckedChange={(v) => updateParam("includeMarketSize", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                Detailed Financials
                {!isPro && <Badge variant="outline" className="text-[10px] px-1">PRO</Badge>}
              </Label>
              <Switch 
                checked={params.detailedFinancials} 
                onCheckedChange={(v) => isPro && updateParam("detailedFinancials", v)}
                disabled={!isPro}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Competitive Moat</Label>
              <Switch 
                checked={params.includeMoat} 
                onCheckedChange={(v) => updateParam("includeMoat", v)}
              />
            </div>
          </div>
        </div>

        {/* Output Preferences */}
        <div className="p-4 rounded-lg bg-card border border-border space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Output Preferences
          </h4>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Deck Style</Label>
              <Select value={params.deckStyle} onValueChange={(v) => updateParam("deckStyle", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {deckStyles.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Detail Level</Label>
                <span className="text-xs text-muted-foreground">{params.detailLevel}%</span>
              </div>
              <Slider
                value={[params.detailLevel]}
                onValueChange={([v]) => updateParam("detailLevel", v)}
                min={30}
                max={100}
                step={10}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Number of Slides</Label>
                <span className="text-xs text-muted-foreground">{params.slideCount} slides</span>
              </div>
              <Slider
                value={[params.slideCount]}
                onValueChange={([v]) => updateParam("slideCount", v)}
                min={6}
                max={15}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
