import { Loader2, Search, BarChart3, FileCheck, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

const STEPS = [
  { icon: Search, label: "Recherche thèse et marché", color: "text-blue-400" },
  { icon: BarChart3, label: "Sourcing startups", color: "text-purple-400" },
  { icon: Sparkles, label: "Sélection meilleure startup", color: "text-yellow-400" },
  { icon: FileCheck, label: "Transfert → Due Diligence", color: "text-green-400" },
];

export function AnalysisLoading() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStepStatus = (index: number) => {
    if (index < currentStep) return "completed";
    if (index === currentStep) return "in-progress";
    return "pending";
  };

  return (
    <div className="flex flex-col min-h-[60vh] py-12 animate-in fade-in duration-500" data-page="analyse">
      <nav className="flex items-center gap-2 text-sm text-foreground/70 mb-8">
        <Link to="/" className="hover:text-foreground transition-colors">Accueil</Link>
        <span className="text-foreground/50">/</span>
        <Link to="/analyser" className="hover:text-foreground transition-colors">Configuration</Link>
        <span className="text-foreground/50">/</span>
        <span className="text-foreground font-medium">Analyse en cours</span>
      </nav>
      <div className="flex flex-col items-center justify-center flex-1 gap-6">
        <Link to="/analyser" className="text-sm text-foreground/70 hover:text-foreground mb-2 transition-all duration-300">
          ← Retour à la configuration
        </Link>
        
        {/* Spinner moderne avec texte */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-2xl border-2 border-primary/40 flex items-center justify-center bg-gradient-to-br from-primary/20 via-primary/10 to-transparent backdrop-blur-sm shadow-lg shadow-primary/20">
            <Loader2 className="w-12 h-12 text-primary animate-spin" strokeWidth={2.5} />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 animate-pulse"></div>
        </div>
        <p className="text-lg font-semibold text-foreground mb-2">Analyse en cours...</p>
        
        {/* Titre et description améliorés */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
            Page d&apos;analyse
          </h1>
          <p className="text-foreground/80 text-base max-w-md">
            Analyse approfondie de l&apos;opportunité d&apos;investissement en cours
          </p>
        </div>
        
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 text-primary text-sm font-medium mb-2 backdrop-blur-sm">
          <Sparkles className="w-4 h-4" />
          Étape 2 — Analyse en cours
        </span>
        
        {/* Cartes des sections améliorées */}
        <div className="grid gap-4 w-full max-w-md">
          {STEPS.map(({ icon: Icon, label, color }, i) => {
            const status = getStepStatus(i);
            const isCompleted = status === "completed";
            const isInProgress = status === "in-progress";
            
            return (
              <div
                key={i}
                className={`
                  flex items-center gap-4 px-5 py-4 rounded-xl 
                  border transition-all duration-300
                  ${isCompleted 
                    ? "border-green-500/50 bg-gray-900/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-500/10" 
                    : isInProgress
                    ? "border-primary/50 bg-gray-900/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20 animate-pulse"
                    : "border-gray-700 bg-gray-900/50 hover:scale-[1.02] hover:shadow-lg hover:shadow-gray-700/10"
                  }
                  backdrop-blur-sm
                `}
              >
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                  transition-all duration-300
                  ${isCompleted 
                    ? "bg-green-500/20 border border-green-500/40" 
                    : isInProgress
                    ? "bg-primary/20 border border-primary/40"
                    : "bg-gray-800/50 border border-gray-700"
                  }
                `}>
                  {isCompleted ? (
                    <CheckCircle2 className={`w-5 h-5 text-green-400`} />
                  ) : isInProgress ? (
                    <Loader2 className={`w-5 h-5 text-primary animate-spin`} />
                  ) : (
                    <Clock className={`w-5 h-5 text-gray-500`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`
                    text-sm font-medium block
                    ${isCompleted 
                      ? "text-green-400" 
                      : isInProgress
                      ? "text-primary"
                      : "text-foreground/60"
                    }
                  `}>
                    {label}
                  </span>
                  <span className={`
                    text-xs mt-0.5 block
                    ${isCompleted 
                      ? "text-green-400/70" 
                      : isInProgress
                      ? "text-primary/70"
                      : "text-foreground/40"
                    }
                  `}>
                    {isCompleted ? "Terminé" : isInProgress ? "En cours..." : "À faire"}
                  </span>
                </div>
                <Icon className={`w-5 h-5 shrink-0 ${isCompleted ? "text-green-400" : isInProgress ? color : "text-gray-600"}`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
