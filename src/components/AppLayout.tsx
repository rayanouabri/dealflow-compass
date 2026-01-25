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
    <div className="min-h-screen flex flex-col bg-background dark">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-[#0a0a0f] to-black -z-10" />
      <div className="fixed inset-0 terminal-grid opacity-[0.03] -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(48,100%,55%,0.05),transparent_50%)] -z-10" />
      
      <header className="sticky top-0 z-50 border-b border-primary/20 bg-background/80 backdrop-blur-md shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={isAnalyser ? "/" : "/analyser"}
                className="flex items-center gap-3 hover:opacity-90 transition-opacity group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-all glow-ai-vc border border-primary/30 group-hover:scale-110">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="font-semibold text-foreground tracking-tight">
                    <span className="text-foreground">ai</span>
                    <span className="text-primary">vc</span>
                    <span className="text-foreground">.</span>
                  </span>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Sourcing & Analyse
                  </p>
                </div>
              </Link>
              <span className="hidden sm:inline text-xs text-muted-foreground border-l border-primary/20 pl-4">
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
                <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs border-primary/40 bg-primary/20 text-primary glow-ai-vc">
                  <Sparkles className="w-3 h-3" />
                  {trialRemaining} analyse{trialRemaining > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-destructive/40 text-destructive text-xs bg-destructive/10">
                  Trial terminé
                </Badge>
              )}
              {user ? (
                <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground hover:text-foreground hover:bg-primary/10" onClick={onSignOut}>
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 hover:border-primary/50 hover:bg-primary/10" onClick={onLogin}>
                  Connexion
                </Button>
              )}
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground glow-ai-vc" onClick={onUpgrade}>
                <Crown className="w-4 h-4" />
                <span className="hidden sm:inline">Upgrade</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden max-w-full relative z-10">
        <div className="max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>

      <footer className="border-t border-primary/20 bg-background/80 backdrop-blur-sm py-5 relative z-10">
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
