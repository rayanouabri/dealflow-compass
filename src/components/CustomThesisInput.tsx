import { Textarea } from "@/components/ui/textarea";
import { Building2, MapPin, DollarSign, Target, FileText, Check } from "lucide-react";

export interface CustomThesis {
  sectors?: string[];
  stages?: string[];
  geography?: string;
  ticketSize?: string;
  description?: string;
}

interface CustomThesisInputProps {
  thesis: CustomThesis;
  onChange: (thesis: CustomThesis) => void;
}

const SECTORS = [
  "SaaS / Logiciel B2B",
  "Fintech",
  "Healthtech / Biotech",
  "Deeptech",
  "IA / Machine Learning",
  "Cybersécurité",
  "Climate / Cleantech",
  "Hardware / Robotique",
  "Marketplace",
  "E-commerce / Consumer",
  "Mobilité",
  "Foodtech / Agritech",
  "Edtech",
  "PropTech",
  "Web3 / Blockchain",
  "Gaming",
  "Spacetech",
  "Industrie / Manufacturing",
];

const STAGES = ["Pre-seed", "Seed", "Série A", "Série B", "Série C+", "Growth"];

const GEOGRAPHIES = ["France", "Europe", "Amérique du Nord", "Asie", "Global"];

const TICKET_SIZES = ["< 500 K€", "500 K€ - 1 M€", "1 - 5 M€", "5 - 15 M€", "15 M€+"];

// Pastille à cocher (toggle). Le coeur de la sélection multi-critères.
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-all ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
      }`}
    >
      {active && <Check className="h-3.5 w-3.5 text-primary" />}
      {label}
    </button>
  );
}

function FieldLabel({ icon, children, hint }: { icon: React.ReactNode; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function CustomThesisInput({ thesis, onChange }: CustomThesisInputProps) {
  const toggle = (key: "sectors" | "stages", value: string) => {
    const cur = thesis[key] ?? [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    onChange({ ...thesis, [key]: next });
  };

  return (
    <div className="space-y-7">
      {/* Secteurs */}
      <div>
        <FieldLabel icon={<Building2 className="h-4 w-4" />} hint="un ou plusieurs">
          Secteurs ciblés
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          {SECTORS.map((s) => (
            <Chip key={s} label={s} active={!!thesis.sectors?.includes(s)} onClick={() => toggle("sectors", s)} />
          ))}
        </div>
      </div>

      {/* Stades */}
      <div>
        <FieldLabel icon={<Target className="h-4 w-4" />} hint="un ou plusieurs">
          Stades d'investissement
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <Chip key={s} label={s} active={!!thesis.stages?.includes(s)} onClick={() => toggle("stages", s)} />
          ))}
        </div>
      </div>

      {/* Géographie */}
      <div>
        <FieldLabel icon={<MapPin className="h-4 w-4" />}>Géographie principale</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {GEOGRAPHIES.map((g) => (
            <Chip
              key={g}
              label={g}
              active={thesis.geography === g}
              onClick={() => onChange({ ...thesis, geography: thesis.geography === g ? undefined : g })}
            />
          ))}
        </div>
      </div>

      {/* Ticket */}
      <div>
        <FieldLabel icon={<DollarSign className="h-4 w-4" />} hint="optionnel">
          Taille de ticket
        </FieldLabel>
        <div className="flex flex-wrap gap-2">
          {TICKET_SIZES.map((t) => (
            <Chip
              key={t}
              label={t}
              active={thesis.ticketSize === t}
              onClick={() => onChange({ ...thesis, ticketSize: thesis.ticketSize === t ? undefined : t })}
            />
          ))}
        </div>
      </div>

      {/* Détails libres */}
      <div>
        <FieldLabel icon={<FileText className="h-4 w-4" />} hint="optionnel">
          Détails de votre thèse
        </FieldLabel>
        <Textarea
          placeholder="Précisez votre thèse, vos critères, ou donnez des exemples de startups / votre portfolio (ex: « on cherche des startups deeptech avec IP brevetée, façon Alice & Bob ou Pasqal ; éviter les ESN et le conseil »). Plus c'est précis, meilleur est le sourcing."
          value={thesis.description || ""}
          onChange={(e) => onChange({ ...thesis, description: e.target.value })}
          rows={4}
          className="resize-none bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/30"
        />
      </div>
    </div>
  );
}
