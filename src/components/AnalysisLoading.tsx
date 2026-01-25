import { Loader2, Search, BarChart3, FileCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const STEPS = [
  { icon: Search, label: "Recherche thèse et marché" },
  { icon: BarChart3, label: "Sourcing startups (Brave)" },
  { icon: FileCheck, label: "Due diligence" },
  { icon: Sparkles, label: "Rapport final" },
];

export function AnalysisLoading() {
  return (
    <div className="flex flex-col min-h-[60vh] py-12 animate-in fade-in duration-500" data-page="analyse">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
        <span>/</span>
        <Link to="/analyser" className="hover:text-foreground transition-colors">Configuration</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Analyse en cours</span>
      </nav>
      <div className="flex flex-col items-center justify-center flex-1">
        <Link to="/analyser" className="text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          ← Retour à la configuration
        </Link>
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-2xl border-2 border-primary/20 flex items-center justify-center bg-primary/5">
            <Loader2 className="w-9 h-9 text-primary animate-spin" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page d&apos;analyse</h1>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Étape 2 — Analyse en cours
        </span>
        <p className="text-muted-foreground mb-6">Analyse de l&apos;opportunité</p>
        <div className="grid gap-3 w-full max-w-sm">
          {STEPS.map(({ icon: Icon, label }, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-white shadow-sm text-sm text-muted-foreground"
            >
              <Icon className="w-4 h-4 text-primary/70 shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
