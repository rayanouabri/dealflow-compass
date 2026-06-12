import { Link, useLocation } from "react-router-dom";
import { LogOut, User, Search, FileSearch } from "lucide-react";

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
  const isAnalyser = pathname === "/analyser" || pathname === "/analyse" || pathname === "/pipeline";
  const isDueDiligence = pathname.startsWith("/due-diligence");

  return (
    <div className="min-h-screen flex flex-col bg-background dark">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to={isAnalyser ? "/" : "/analyser"}
              className="hover:opacity-80 transition-opacity"
            >
              <span className="font-display text-base font-semibold tracking-tight text-foreground">
                AIVC
              </span>
            </Link>

            <div className="h-4 w-px bg-border" />

            <nav className="flex items-center">
              <Link
                to="/analyser"
                className={`flex items-center gap-1.5 px-3 text-[13px] font-medium border-b-2 transition-colors h-14 ${
                  isAnalyser
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Sourcing
              </Link>
              <Link
                to="/due-diligence"
                className={`flex items-center gap-1.5 px-3 text-[13px] font-medium border-b-2 transition-colors h-14 ${
                  isDueDiligence
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileSearch className="w-3.5 h-3.5" />
                Due Diligence
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground max-w-[160px]">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </span>
            )}

            <span className={`text-xs ${hasTrialRemaining ? "text-muted-foreground" : "text-destructive"}`}>
              {hasTrialRemaining
                ? `${trialRemaining} crédit${trialRemaining !== 1 ? "s" : ""}`
                : "Quota épuisé"}
            </span>

            {user ? (
              <button
                onClick={onSignOut}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            ) : (
              <button
                onClick={onLogin}
                className="text-xs px-3 py-1.5 rounded border border-border hover:border-primary/60 text-muted-foreground hover:text-foreground transition-all"
              >
                Connexion
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-5 sm:px-8 py-10 overflow-x-hidden">
        {children}
      </main>

      <footer className="border-t border-border py-5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              AIVC - Sourcing & Analyse pour fonds d'investissement
            </p>
            <div className="flex flex-wrap justify-center gap-5 text-xs text-muted-foreground">
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <Link to="/a-propos" className="hover:text-foreground transition-colors">A propos</Link>
              <Link to="/mentions-legales" className="hover:text-foreground transition-colors">Mentions legales</Link>
              <Link to="/conditions-utilisation" className="hover:text-foreground transition-colors">CGU</Link>
              <Link to="/confidentialite" className="hover:text-foreground transition-colors">Confidentialite</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
