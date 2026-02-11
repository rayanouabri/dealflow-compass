import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  Target, 
  FileText,
  X,
  Plus,
  Search
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CustomThesis {
  sectors?: string[];
  stage?: string;
  geography?: string;
  ticketSize?: string;
  description?: string;
  specificCriteria?: string;
  sourcingInstructions?: string;
}

interface CustomThesisInputProps {
  thesis: CustomThesis;
  onChange: (thesis: CustomThesis) => void;
  onClear: () => void;
}

const SECTORS = [
  "SaaS / Software",
  "Fintech",
  "Healthtech",
  "Edtech",
  "E-commerce",
  "AI / ML",
  "Cleantech",
  "Biotech",
  "Hardware",
  "Consumer",
  "Marketplace",
  "Enterprise",
  "Cybersecurity",
  "Blockchain / Web3",
  "PropTech",
  "FoodTech",
  "Mobility",
  "Gaming",
];

const STAGES = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
  "Growth",
];

const GEOGRAPHIES = [
  "North America",
  "Europe",
  "Asia",
  "Latin America",
  "MENA",
  "Africa",
  "Global",
];

const TICKET_SIZES = [
  "$0 - $500K",
  "$500K - $1M",
  "$1M - $5M",
  "$5M - $15M",
  "$15M - $50M",
  "$50M+",
];

export function CustomThesisInput({ thesis, onChange, onClear }: CustomThesisInputProps) {
  const [newSector, setNewSector] = useState("");

  const addSector = () => {
    if (newSector && !thesis.sectors?.includes(newSector)) {
      onChange({
        ...thesis,
        sectors: [...(thesis.sectors || []), newSector],
      });
      setNewSector("");
    }
  };

  const removeSector = (sector: string) => {
    onChange({
      ...thesis,
      sectors: thesis.sectors?.filter(s => s !== sector) || [],
    });
  };

  const hasThesis = thesis.sectors?.length || thesis.stage || thesis.geography || 
                    thesis.ticketSize || thesis.description || thesis.specificCriteria || thesis.sourcingInstructions;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Thèse d'Investissement Personnalisée
          </CardTitle>
          {hasThesis && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X className="w-4 h-4" />
              Effacer
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Définissez votre propre thèse d'investissement au lieu d'analyser un fonds existant
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Secteurs */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Secteurs d'intérêt
          </Label>
          <div className="flex gap-2">
            <Select value={newSector} onValueChange={setNewSector}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sélectionner un secteur" />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={addSector} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {thesis.sectors && thesis.sectors.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {thesis.sectors.map((sector) => (
                <Badge key={sector} variant="secondary" className="gap-1">
                  {sector}
                  <button
                    onClick={() => removeSector(sector)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Stade */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Stade d'investissement préféré
          </Label>
          <Select 
            value={thesis.stage || ""} 
            onValueChange={(v) => onChange({ ...thesis, stage: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un stade" />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((stage) => (
                <SelectItem key={stage} value={stage.toLowerCase().replace(' ', '-')}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Géographie */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Géographie cible
          </Label>
          <Select 
            value={thesis.geography || ""} 
            onValueChange={(v) => onChange({ ...thesis, geography: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une région" />
            </SelectTrigger>
            <SelectContent>
              {GEOGRAPHIES.map((geo) => (
                <SelectItem key={geo} value={geo.toLowerCase().replace(' ', '-')}>
                  {geo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Taille de ticket */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Taille de ticket
          </Label>
          <Select 
            value={thesis.ticketSize || ""} 
            onValueChange={(v) => onChange({ ...thesis, ticketSize: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une taille de ticket" />
            </SelectTrigger>
            <SelectContent>
              {TICKET_SIZES.map((ticket) => (
                <SelectItem key={ticket} value={ticket}>
                  {ticket}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Description de la thèse
          </Label>
          <Textarea
            placeholder="Décrivez votre thèse d'investissement, vos valeurs, votre approche..."
            value={thesis.description || ""}
            onChange={(e) => onChange({ ...thesis, description: e.target.value })}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Critères spécifiques */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Critères spécifiques
          </Label>
          <Textarea
            placeholder="Ex: Startups avec ARR > $1M, équipe technique forte, marché en croissance > 20%..."
            value={thesis.specificCriteria || ""}
            onChange={(e) => onChange({ ...thesis, specificCriteria: e.target.value })}
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Spécifiez des critères précis que les startups doivent respecter
          </p>
        </div>

        {/* Instructions de sourcing */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Instructions de sourcing
          </Label>
          <Textarea
            placeholder="Ex: Chercher des startups avec brevets déposés, signaux de recrutement actif, partenariats récents avec grands comptes, présence sur Product Hunt..."
            value={thesis.sourcingInstructions || ""}
            onChange={(e) => onChange({ ...thesis, sourcingInstructions: e.target.value })}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Indiquez des instructions spécifiques pour le sourcing : types de signaux à détecter, sources à privilégier, critères de qualité des données
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

