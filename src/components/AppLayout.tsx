import { Link, useLocation } from "react-router-dom";
import { BarChart3, Crown, LogOut, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AppLayoutProps {
  children: React.ReactNode;
  user: { email?: string } | null;
  trialRemaining: number;
  hasTrialRemaining: boolean;
  onLogin: () => void;
  onSignOut: () => void;
  onUpgrade: () => void;
}

export function AppLayout({
  children,
  user,
  trialRemaining,
  hasTrialRemaining,
  onLogin,
  onSignOut,
  onUpgrade,
}: AppLayoutProps) {
  const { pathname } = useLocation();
  const isAnalyser = pathname === "/analyser";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={isAnalyser ? "/" : "/analyser"}
                className="flex items-center gap-3 hover:opacity-90 transition-opacity group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="font-semibold text-foreground tracking-tight">
                    <span className="text-primary">ai</span>
                    <span className="text-amber-500">vc</span>
                    <span className="text-primary">.</span>
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Sourcing & Analyse
                  </p>
                </div>
              </Link>
              <span className="hidden sm:inline text-xs text-muted-foreground border-l border-border pl-4">
                {isAnalyser ? "Configuration" : "Analyse"}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {user && (
                <span className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground max-w-[140px] truncate">
                  <User className="w-4 h-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </span>
              )}
              {hasTrialRemaining ? (
                <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs border-primary/30 text-primary">
                  <Sparkles className="w-3 h-3" />
                  {trialRemaining} analyse{trialRemaining > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-destructive/40 text-destructive text-xs">
                  Trial terminé
                </Badge>
              )}
              {user ? (
                <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={onSignOut}>
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={onLogin}>
                  Connexion
                </Button>
              )}
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90" onClick={onUpgrade}>
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">Upgrade</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 bg-muted/20 overflow-x-hidden max-w-full">
        <div className="max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>

      <footer className="border-t border-border bg-white py-5">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              AI-VC • Sourcing & Analyse de Startups pour Fonds d&apos;Investissement
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-muted-foreground">
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <Link to="/a-propos" className="hover:text-foreground transition-colors">À propos</Link>
              <Link to="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link>
              <Link to="/conditions-utilisation" className="hover:text-foreground transition-colors">CGU</Link>
              <Link to="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
