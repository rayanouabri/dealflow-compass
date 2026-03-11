import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BarChart3, Menu, X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  onStartTrial: () => void;
  onLogin: () => void;
}

const navLinks = [
  { label: "Comment ça marche", href: "#how-it-works" },
  { label: "Guide", href: "#how-it-works" },
  { label: "Fonctionnalités", href: "#features" },
  { label: "Tarifs", href: "#pricing" },
];

export function Header({ onStartTrial, onLogin }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    element?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-primary/30 bg-background/90 backdrop-blur-md sticky top-0 z-50 shadow-lg shadow-primary/10">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center glow-ai-vc border border-primary/30">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">
                <span className="text-foreground">ai</span>
                <span className="text-primary">vc</span>
                <span className="text-foreground">.</span>
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Sourcing & Analyse
              </p>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onLogin} className="hover:bg-primary/10">
              Se connecter
            </Button>
            <Button size="sm" onClick={onStartTrial} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground glow-ai-vc">
              <Zap className="w-4 h-4" />
              Essai gratuit
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-card"
          >
            <div className="container px-4 py-4 space-y-4">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="block w-full text-left text-sm text-muted-foreground hover:text-foreground py-2"
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-4 border-t border-border space-y-2">
                <Button variant="outline" className="w-full" onClick={onLogin}>
                  Se connecter
                </Button>
                <Button className="w-full gap-2" onClick={onStartTrial}>
                  <Zap className="w-4 h-4" />
                  Essai gratuit
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
