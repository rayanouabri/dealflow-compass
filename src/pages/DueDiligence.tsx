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
import { ArrowLeft, FileSearch, Building2, Globe, Search, CheckCircle2 } from "lucide-react";
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

const WHAT_IS_ANALYSED = [
  "Presentation entreprise, fondation, siege, effectifs",
  "Produit, valeur ajoutee, technologie, brevets",
  "Metriques de traction et jalons cles",
  "Historique des levees et valorisation",
  "Equipe fondatrice et dirigeants",
  "Analyse concurrentielle et moat",
  "Risques marche, execution, reglementaire",
  "Recommandation d'investissement",
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
        toast({ title: "Inscription requise", description: "Creez un compte pour continuer.", variant: "destructive" });
      } else {
        setShowPaywall(true);
      }
      return;
    }

    if (!companyName.trim()) {
      toast({ title: "Nom requis", description: "Saisissez le nom de l'entreprise a analyser.", variant: "destructive" });
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Main form column */}
        <div className="lg:col-span-2 space-y-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Accueil
          </Link>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em] mb-3">
              Due Diligence
            </p>
            <h1 className="font-display text-[1.75rem] font-medium text-foreground tracking-tight leading-tight">
              Rapport complet sur une entreprise
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-lg">
              Entrez le nom d'une entreprise pour obtenir un rapport de due diligence structure avec sources verifiees — equipe, marche, financements, risques.
            </p>
          </div>

          {/* Company name */}
          <div className="space-y-3">
            <Label htmlFor="company-name" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              Nom de l&apos;entreprise
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="company-name"
              placeholder="ex. Mistral AI, Doctolib, Back Market..."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && companyName.trim() && handleSubmit()}
              className="h-10 bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/30"
            />
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_COMPANIES.map((company) => (
                <button
                  key={company}
                  type="button"
                  onClick={() => setCompanyName(company)}
                  className={`text-xs px-2.5 py-1 rounded border transition-all ${
                    companyName === company
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                  }`}
                >
                  {company}
                </button>
              ))}
            </div>
          </div>

          {/* Optional fields */}
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-card/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Informations optionnelles
              </p>
            </div>
            <div className="p-4 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="company-website" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  Site web
                </Label>
                <Input
                  id="company-website"
                  placeholder="ex. https://mistral.ai"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  className="h-10 bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground">
                  Utile si le nom de l&apos;entreprise est ambigu ou tres commun.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional-context" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  Contexte additionnel
                </Label>
                <Textarea
                  id="additional-context"
                  placeholder="Ex : startup francaise dans l'IA, a leve recemment, CEO = Arthur Mensch..."
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  className="min-h-[80px] bg-card border-border text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/30 resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Informations supplementaires pour affiner la recherche et le rapport.
                </p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="button"
            size="lg"
            className="w-full h-11 text-sm font-medium bg-foreground text-background hover:bg-foreground/90"
            onClick={handleSubmit}
            disabled={!companyName.trim()}
          >
            <FileSearch className="w-4 h-4 mr-2" />
            Lancer la due diligence
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            L&apos;analyse prend 30 a 60 secondes pour collecter et verifier les informations.
          </p>

          {!hasTrialRemaining && (
            <p className="text-xs text-destructive text-center">
              Quota d&apos;analyses epuise.{" "}
              {!user ? (
                <button
                  className="underline hover:no-underline"
                  onClick={() => { setAuthView("signup"); setShowAuthDialog(true); }}
                >
                  Creer un compte pour continuer
                </button>
              ) : (
                "Contactez-nous pour upgrader."
              )}
            </p>
          )}
        </div>

        {/* Info column */}
        <div className="space-y-5">
          <div className="border border-border rounded-md overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-card/50">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sections du rapport
              </p>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {WHAT_IS_ANALYSED.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border rounded-md px-4 py-3 space-y-2">
            <p className="text-xs font-medium text-foreground">Sources utilisees</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Recherche web (Bing via Oxylabs), LinkedIn, Crunchbase, PitchBook, presse specialisee, sites officiels.
            </p>
          </div>

          <div className="border border-border rounded-md px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Export disponible :</span>{" "}
              Le rapport complet est exportable en Markdown une fois genere.
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
