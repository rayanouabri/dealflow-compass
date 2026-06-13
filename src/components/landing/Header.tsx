import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface HeaderProps {
  onStartTrial: () => void;
  onLogin: () => void;
}

const navLinks = [
  { label: "Méthode", href: "#how-it-works" },
  { label: "Rapport", href: "#report" },
  { label: "Fonctionnalités", href: "#features" },
  { label: "Tarifs", href: "#pricing" },
];

export function Header({ onStartTrial, onLogin }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    element?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-border/70 bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-baseline gap-2 select-none">
          <span className="font-display text-lg font-semibold tracking-tight text-foreground">
            AIVC
          </span>
          <span className="hidden sm:inline text-[11px] text-muted-foreground tracking-wide">
            Sourcing &amp; Due Diligence
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollToSection(link.href)}
              className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={onLogin}
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Se connecter
          </button>
          <Button
            size="sm"
            onClick={onStartTrial}
            className="h-9 px-4 text-[13px] font-medium bg-foreground text-background hover:bg-foreground/90"
          >
            Créer un compte
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="max-w-6xl mx-auto px-5 py-4 space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="block w-full text-left text-sm text-muted-foreground hover:text-foreground py-1.5"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-3 border-t border-border space-y-2">
              <Button variant="outline" className="w-full h-9 text-sm" onClick={onLogin}>
                Se connecter
              </Button>
              <Button
                className="w-full h-9 text-sm bg-foreground text-background hover:bg-foreground/90"
                onClick={onStartTrial}
              >
                Créer un compte
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
