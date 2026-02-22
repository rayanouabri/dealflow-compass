import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { AppLayout } from "@/components/AppLayout";
import { AuthDialog } from "@/components/AuthDialog";
import { PaywallModal } from "@/components/PaywallModal";
import { useTrial } from "@/hooks/useTrial";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Search, Building2, Globe, FileSearch, Sparkles, Target, TrendingUp, Users, Shield, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";

const EXAMPLE_COMPANIES = [
  "Mistral AI",
  "Doctolib", 
  "Back Market",
  "Qonto",
  "Pennylane",
  "Alan",
  "Swile",
  "Ankorstore"
];

export default function DueDiligence() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, loading: authLoading, signOut } = useAuth();
  const { trialRemaining, hasTrialRemaining } = useTrial();

  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [showPaywall, setShowPaywall] = useState(false);

  // Pré-remplir depuis le sourcing (historique ou handoff)
  useEffect(() => {
    const state = location.state as { companyName?: string; companyWebsite?: string; additionalContext?: string } | null;
    if (state?.companyName) {
      setCompanyName(state.companyName);
      if (state.companyWebsite) setCompanyWebsite(state.companyWebsite);
      if (state.additionalContext) setAdditionalContext(state.additionalContext);
    }
  }, [location.state]);

  const handleSubmit = () => {
    if (!hasTrialRemaining) {
      if (!user) {
        setAuthView("signup");
        setShowAuthDialog(true);
        toast({ title: "Inscription requise", description: "Créez un compte pour continuer.", variant: "destructive" });
      } else {
        setShowPaywall(true);
      }
      return;
    }

    if (!companyName.trim()) {
      toast({ title: "Nom requis", description: "Saisissez le nom de l'entreprise à analyser.", variant: "destructive" });
      return;
    }

    const payload = {
      companyName: companyName.trim(),
      companyWebsite: companyWebsite.trim() || undefined,
      additionalContext: additionalContext.trim() || undefined,
    };

    try {
      sessionStorage.setItem("due-diligence-request", JSON.stringify(payload));
    } catch (_) {}
    
    navigate("/due-diligence/result", { state: payload, replace: false });
  };

  const handleLogin = () => {
    setAuthView("login");
    setShowAuthDialog(true);
  };

  if (authLoading) return null;

  return (
    <AppLayout
      user={user}
      trialRemaining={trialRemaining}
      hasTrialRemaining={hasTrialRemaining}
      onLogin={handleLogin}
      onSignOut={signOut}
    >
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-medium mb-4 backdrop-blur-sm">
            <FileSearch className="w-3.5 h-3.5" />
            Due Diligence Complète
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-2 bg-gradient-to-r from-foreground to-amber-400 bg-clip-text text-transparent">
            Analysez une entreprise
          </h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            Entrez le nom d'une entreprise et obtenez un rapport de due diligence complet avec des sources vérifiées.
          </p>
        </div>

        {/* What this tool does */}
        <div className="mb-8 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Ce que l'outil analyse
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="w-4 h-4 text-amber-500/70" />
              <span>Présentation entreprise</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="w-4 h-4 text-amber-500/70" />
              <span>Produit & Marché</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-amber-500/70" />
              <span>Métriques & Traction</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4 text-amber-500/70" />
              <span>Financements & Valorisation</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4 text-amber-500/70" />
              <span>Équipe & Fondateurs</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4 text-amber-500/70" />
              <span>Risques & Opportunités</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Company Name Input */}
          <div className="rounded-xl border border-amber-500/40 bg-card/80 backdrop-blur-sm shadow-lg p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-sm font-medium text-gray-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                Nom de l'entreprise *
              </Label>
              <Input
                id="company-name"
                placeholder="ex. Mistral AI, Doctolib, Back Market..."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-12 bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 rounded-lg focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>
            
            {/* Quick examples */}
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_COMPANIES.map((company) => (
                <button
                  key={company}
                  type="button"
                  onClick={() => setCompanyName(company)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 hover:border-amber-500/50 transition-all"
                >
                  {company}
                </button>
              ))}
            </div>
          </div>

          {/* Optional: Website */}
          <div className="rounded-xl border border-gray-700/50 bg-card/60 backdrop-blur-sm shadow-lg p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-website" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" />
                Site web (optionnel)
              </Label>
              <Input
                id="company-website"
                placeholder="ex. https://mistral.ai"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                className="h-11 bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 rounded-lg focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
              <p className="text-xs text-gray-500">
                Aide à identifier l'entreprise si le nom est commun
              </p>
            </div>
          </div>

          {/* Optional: Additional Context */}
          <div className="rounded-xl border border-gray-700/50 bg-card/60 backdrop-blur-sm shadow-lg p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="additional-context" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                Contexte additionnel (optionnel)
              </Label>
              <Textarea
                id="additional-context"
                placeholder="Ex: Startup française dans l'IA, a levé récemment, CEO = Arthur Mensch..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                className="min-h-[80px] bg-gray-800/50 border border-gray-700 text-white placeholder:text-gray-500 rounded-lg focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none"
              />
              <p className="text-xs text-gray-500">
                Informations supplémentaires pour affiner la recherche
              </p>
            </div>
          </div>

          {/* Submit Button — actif dès qu'un nom est saisi ; crédits / auth gérés dans handleSubmit */}
          <Button
            type="button"
            size="lg"
            className="w-full h-14 text-base font-medium bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-[0_0_30px_rgba(245,158,11,0.3)]"
            onClick={handleSubmit}
            disabled={!companyName.trim()}
          >
            <FileSearch className="w-5 h-5 mr-2" />
            Lancer la Due Diligence
          </Button>

          {/* Info box */}
          <div className="text-center text-xs text-muted-foreground p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
            <p>
              ⏱️ L'analyse prend environ 30-60 secondes pour collecter et vérifier les informations
            </p>
          </div>
        </div>
      </div>

      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        defaultView={authView}
        onAuthSuccess={() => setTimeout(() => setShowAuthDialog(false), 300)}
      />
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} trialRemaining={trialRemaining} />
    </AppLayout>
  );
}
