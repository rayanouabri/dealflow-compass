import { Link, useLocation } from "react-router-dom";
import { BarChart3, LogOut, User, Sparkles, Search, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AppLayoutProps {
  children: React.ReactNode;
  user: { email?: string } | null;
  trialRemaining: number;
  hasTrialRemaining: boolean;
  onLogin: () => void;
  onSignOut: () => void;
}

export function AppLayout({
  children,
  user,
  trialRemaining,
  hasTrialRemaining,
  onLogin,
  onSignOut,
}: AppLayoutProps) {
  const { pathname } = useLocation();
  const isAnalyser = pathname === "/analyser" || pathname === "/analyse";
  const isDueDiligence = pathname.startsWith("/due-diligence");

  return (
    <div className="min-h-screen flex flex-col bg-background dark">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={isAnalyser ? "/" : "/analyser"}
                className="flex items-center gap-3 hover:opacity-90 transition-opacity group"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-all border border-border">
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
              {/* Navigation tabs */}
              <nav className="hidden sm:flex items-center gap-1 border-l border-border pl-4 ml-2">
                <Link
                  to="/analyser"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${
                    isAnalyser
                      ? "bg-muted text-primary border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  Sourcing
                </Link>
                <Link
                  to="/due-diligence"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${
                    isDueDiligence
                      ? "bg-muted text-primary border border-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <FileSearch className="w-3.5 h-3.5" />
                  Due Diligence
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {user && (
                <span className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground max-w-[140px] truncate">
                  <User className="w-4 h-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </span>
              )}
              {hasTrialRemaining ? (
                <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs border-border bg-muted text-primary">
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
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-hidden max-w-full relative z-10">
        <div className="max-w-full overflow-x-hidden">
          {children}
        </div>
      </main>

      <footer className="border-t border-border bg-background py-5 relative z-10">
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
