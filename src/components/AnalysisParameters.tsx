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
  numberOfStartups: number;
}

interface AnalysisParametersProps {
  params: AnalysisParams;
  onChange: (params: AnalysisParams) => void;
  isPro?: boolean;
  useCustomThesis?: boolean;
}

export const defaultParams: AnalysisParams = {
  startupStage: "auto",
  startupSector: "auto",
  businessModel: "auto",
  targetMarket: "auto",
  teamSize: "auto",
  fundingAmount: "auto",
  fundingStage: "auto",
  timeline: "auto",
  headquartersRegion: "auto",
  targetGeography: "auto",
  includeCompetitors: true,
  includeMarketSize: true,
  detailedFinancials: false,
  includeMoat: true,
  deckStyle: "modern",
  detailLevel: 70,
  slideCount: 8,
  numberOfStartups: 1,
};

export function AnalysisParameters({ params, onChange, isPro = false, useCustomThesis = false }: AnalysisParametersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateParam = <K extends keyof AnalysisParams>(key: K, value: AnalysisParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  const stages = [
    { value: "auto", label: "🔍 Auto (selon la thèse du fonds)" },
    { value: "idea", label: "Idea Stage" },
    { value: "pre-seed", label: "Pre-Seed" },
    { value: "seed", label: "Seed" },
    { value: "series-a", label: "Series A" },
    { value: "series-b", label: "Series B+" },
  ];

  const sectors = [
    { value: "auto", label: "🔍 Auto (selon la thèse du fonds)" },
    { value: "saas", label: "SaaS / Software" },
    { value: "fintech", label: "Fintech" },
    { value: "healthtech", label: "Healthtech" },
    { value: "edtech", label: "Edtech" },
    { value: "ecommerce", label: "E-commerce" },
    { value: "ai-ml", label: "AI / ML" },
    { value: "cleantech", label: "Cleantech / Énergie" },
    { value: "biotech", label: "Biotech / Pharma" },
    { value: "hardware", label: "Hardware / IoT" },
    { value: "consumer", label: "Consumer" },
    { value: "marketplace", label: "Marketplace" },
    { value: "enterprise", label: "Enterprise Software" },
    { value: "defense", label: "Défense / Sécurité" },
    { value: "aerospace", label: "Aérospatial / Drones" },
    { value: "logistics", label: "Logistique / Supply Chain" },
    { value: "proptech", label: "Immobilier / PropTech" },
    { value: "agritech", label: "AgriTech / FoodTech" },
    { value: "mobility", label: "Mobilité / Transport" },
    { value: "construction", label: "Construction / BTP" },
    { value: "manufacturing", label: "Industrie / Manufacturing" },
    { value: "legaltech", label: "LegalTech" },
    { value: "hrtech", label: "RH / HRTech" },
    { value: "insurtech", label: "InsurTech" },
    { value: "gaming", label: "Gaming / Esport" },
    { value: "media", label: "Média / Entertainment" },
    { value: "cybersecurity", label: "Cybersécurité" },
    { value: "spacetech", label: "SpaceTech" },
    { value: "govtech", label: "GovTech / Secteur Public" },
    { value: "any", label: "Tous secteurs" },
  ];

  const businessModels = [
    { value: "auto", label: "🔍 Auto (selon la thèse du fonds)" },
    { value: "b2b", label: "B2B" },
    { value: "b2c", label: "B2C" },
    { value: "b2b2c", label: "B2B2C" },
    { value: "b2g", label: "B2G (Gouvernement)" },
    { value: "marketplace", label: "Marketplace" },
    { value: "subscription", label: "Abonnement / SaaS" },
    { value: "transactional", label: "Transactionnel" },
    { value: "licensing", label: "Licensing / IP" },
    { value: "hardware-service", label: "Hardware + Service" },
    { value: "platform", label: "Plateforme" },
    { value: "api", label: "API / Infrastructure" },
    { value: "any", label: "Tous modèles" },
  ];

  const targetMarkets = [
    { value: "auto", label: "🔍 Auto (selon la thèse du fonds)" },
    { value: "smb", label: "SMB" },
    { value: "mid-market", label: "Mid-Market" },
    { value: "enterprise", label: "Enterprise" },
    { value: "consumer", label: "Consumer" },
    { value: "prosumer", label: "Prosumer" },
  ];

  const teamSizes = [
    { value: "auto", label: "🔍 Auto" },
    { value: "1-5", label: "1-5 people" },
    { value: "6-10", label: "6-10 people" },
    { value: "11-25", label: "11-25 people" },
    { value: "26-50", label: "26-50 people" },
    { value: "50+", label: "50+ people" },
  ];

  const fundingAmounts = [
    { value: "auto", label: "🔍 Auto (selon la thèse du fonds)" },
    { value: "0-500k", label: "$0 - $500K" },
    { value: "500k-1m", label: "$500K - $1M" },
    { value: "1-5m", label: "$1M - $5M" },
    { value: "5-15m", label: "$5M - $15M" },
    { value: "15-50m", label: "$15M - $50M" },
    { value: "50m+", label: "$50M+" },
  ];

  const timelines = [
    { value: "auto", label: "🔍 Auto" },
    { value: "asap", label: "ASAP" },
    { value: "3-months", label: "3 months" },
    { value: "6-months", label: "6 months" },
    { value: "12-months", label: "12 months" },
    { value: "exploring", label: "Just exploring" },
  ];

  const regions = [
    { value: "auto", label: "🔍 Auto (selon la thèse du fonds)" },
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
          className="w-full justify-between h-11 px-4 bg-primary hover:bg-primary/90 text-primary-foreground border-primary/40"
        >
          <span className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary-foreground" />
            <span className="text-primary-foreground font-medium">Analysis Parameters</span>
            {!isOpen && (
              <Badge variant="secondary" className="ml-2 text-xs bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                {params.startupSector === "auto" ? "auto" : params.startupSector} • {params.fundingStage === "auto" ? "auto" : params.fundingStage}
              </Badge>
            )}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-primary-foreground" /> : <ChevronDown className="w-4 h-4 text-primary-foreground" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-6 animate-slide-in-up bg-gray-900/50 rounded-xl p-6">
        {/* Startup Profile */}
        {!useCustomThesis && (
        <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-yellow-400" />
            <h4 className="text-lg font-semibold text-yellow-400">
              Startup Profile
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="block text-sm font-medium text-gray-100">Stage</Label>
              <Select value={params.startupStage} onValueChange={(v) => updateParam("startupStage", v)}>
                <SelectTrigger className="h-10 bg-gray-800/50 border border-gray-700 text-white rounded-lg px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20">
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {stages.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block text-sm font-medium text-gray-100">Sector</Label>
              <Select value={params.startupSector} onValueChange={(v) => updateParam("startupSector", v)}>
                <SelectTrigger className="h-10 bg-gray-800/50 border border-gray-700 text-white rounded-lg px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20">
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {sectors.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block text-sm font-medium text-gray-100">Business Model</Label>
              <Select value={params.businessModel} onValueChange={(v) => updateParam("businessModel", v)}>
                <SelectTrigger className="h-10 bg-gray-800/50 border border-gray-700 text-white rounded-lg px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20">
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {businessModels.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block text-sm font-medium text-gray-100">Target Market</Label>
              <Select value={params.targetMarket} onValueChange={(v) => updateParam("targetMarket", v)}>
                <SelectTrigger className="h-10 bg-gray-800/50 border border-gray-700 text-white rounded-lg px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20">
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {targetMarkets.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="block text-sm font-medium text-gray-100">Team Size</Label>
              <Select value={params.teamSize} onValueChange={(v) => updateParam("teamSize", v)}>
                <SelectTrigger className="h-10 bg-gray-800/50 border border-gray-700 text-white rounded-lg px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20">
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {teamSizes.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        )}

        {/* Funding Requirements */}
        {!useCustomThesis && (
        <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-yellow-400" />
            <h4 className="text-lg font-semibold text-yellow-400">
              Funding Requirements
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="block text-sm font-medium text-gray-100">Target Raise</Label>
              <Select value={params.fundingAmount} onValueChange={(v) => updateParam("fundingAmount", v)}>
                <SelectTrigger className="h-10 bg-gray-800/50 border border-gray-700 text-white rounded-lg px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20">
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {fundingAmounts.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block text-sm font-medium text-gray-100">Round Type</Label>
              <Select value={params.fundingStage} onValueChange={(v) => updateParam("fundingStage", v)}>
                <SelectTrigger className="h-10 bg-gray-800/50 border border-gray-700 text-white rounded-lg px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20">
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {stages.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="block text-sm font-medium text-gray-100">Timeline</Label>
              <Select value={params.timeline} onValueChange={(v) => updateParam("timeline", v)}>
                <SelectTrigger className="h-10 bg-gray-800/50 border border-gray-700 text-white rounded-lg px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20">
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {timelines.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        )}

        {/* Geographic Preferences */}
        {!useCustomThesis && (
        <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-yellow-400" />
            <h4 className="text-lg font-semibold text-yellow-400">
              Geographic Preferences
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="block text-sm font-medium text-gray-100">Your Location</Label>
              <Select value={params.headquartersRegion} onValueChange={(v) => updateParam("headquartersRegion", v)}>
                <SelectTrigger className="h-10 bg-gray-800/50 border border-gray-700 text-white rounded-lg px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20">
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {regions.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block text-sm font-medium text-gray-100">Target Geography</Label>
              <Select value={params.targetGeography} onValueChange={(v) => updateParam("targetGeography", v)}>
                <SelectTrigger className="h-10 bg-gray-800/50 border border-gray-700 text-white rounded-lg px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20">
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {regions.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        )}

        {/* Analysis Options */}
        <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-yellow-400" />
            <h4 className="text-lg font-semibold text-yellow-400">
              Analysis Options
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-100">Competitor Analysis</Label>
              <Switch 
                checked={params.includeCompetitors} 
                onCheckedChange={(v) => updateParam("includeCompetitors", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-100">Market Sizing</Label>
              <Switch 
                checked={params.includeMarketSize} 
                onCheckedChange={(v) => updateParam("includeMarketSize", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-100">
                Detailed Financials
              </Label>
              <Switch 
                checked={params.detailedFinancials} 
                onCheckedChange={(v) => updateParam("detailedFinancials", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-100">Competitive Moat</Label>
              <Switch 
                checked={params.includeMoat} 
                onCheckedChange={(v) => updateParam("includeMoat", v)}
              />
            </div>
          </div>
        </div>

        {/* Output Preferences */}
        <div className="bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            <h4 className="text-lg font-semibold text-yellow-400">
              Output Preferences
            </h4>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="block text-sm font-medium text-gray-100">Deck Style</Label>
              <Select value={params.deckStyle} onValueChange={(v) => updateParam("deckStyle", v)}>
                <SelectTrigger className="h-10 bg-gray-800/50 border border-gray-700 text-white rounded-lg px-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20">
                  <SelectValue className="text-white" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {deckStyles.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-white hover:bg-gray-700 focus:bg-gray-700">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-100">Detail Level</Label>
                <span className="text-xl font-bold text-yellow-400">{params.detailLevel}%</span>
              </div>
              <div className="relative">
                <Slider
                  value={[params.detailLevel]}
                  onValueChange={([v]) => updateParam("detailLevel", v)}
                  min={30}
                  max={100}
                  step={10}
                  className="w-full [&>div:first-child]:!bg-gray-700 [&>div:first-child>div]:!bg-yellow-400 [&>button]:!bg-yellow-400 [&>button]:!border-yellow-500 [&>button]:!border-2"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>30%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-100">Number of Startups</Label>
                <span className="text-xl font-bold text-yellow-400">{params.numberOfStartups}</span>
              </div>
              <Slider
                value={[params.numberOfStartups]}
                onValueChange={([v]) => updateParam("numberOfStartups", v)}
                min={1}
                max={5}
                step={1}
                className="w-full [&_[role=slider]]:bg-yellow-400 [&_[role=slider]]:border-2 [&_[role=slider]]:border-yellow-500 [&>div>div]:bg-gray-700"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1</span>
                <span>5</span>
              </div>
              <p className="text-xs text-gray-400">
                Génère plusieurs startups correspondant à votre thèse
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-100">Slides per Report</Label>
                <span className="text-xl font-bold text-yellow-400">{params.slideCount}</span>
              </div>
              <div className="relative">
                <Slider
                  value={[params.slideCount]}
                  onValueChange={([v]) => updateParam("slideCount", v)}
                  min={6}
                  max={15}
                  step={1}
                  className="w-full [&>div:first-child]:!bg-gray-700 [&>div:first-child>div]:!bg-yellow-400 [&>button]:!bg-yellow-400 [&>button]:!border-yellow-500 [&>button]:!border-2"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>6</span>
                <span>15</span>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
