import { Link } from "react-router-dom";
import { BarChart3, Github, Linkedin, Twitter, Mail } from "lucide-react";

const CONTACT_EMAIL = "rayan.ouabri@edhec.com";

export function Footer() {
  return (
    <footer className="border-t border-primary/20 bg-card/30 backdrop-blur-sm py-12 relative">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4 hover:opacity-90 transition-opacity">
              <BarChart3 className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">
                <span className="text-primary">ai</span>
                <span className="text-amber-500">vc</span>
                <span className="text-primary">.</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Outil de sourcing et d&apos;analyse de startups pour fonds d&apos;investissement. 
              AI-VC accompagne l&apos;innovation et la croissance des entreprises.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <Mail className="w-4 h-4" />
              {CONTACT_EMAIL}
            </a>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Produit */}
          <div>
            <h4 className="font-semibold mb-4 text-sm text-foreground">Produit</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/#features" className="hover:text-foreground transition-colors">Fonctionnalités</Link></li>
              <li><Link to="/#pricing" className="hover:text-foreground transition-colors">Tarifs</Link></li>
              <li><Link to="/analyser" className="hover:text-foreground transition-colors">Analyser</Link></li>
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="font-semibold mb-4 text-sm text-foreground">Entreprise</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/a-propos" className="hover:text-foreground transition-colors">À propos</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AI-VC. Tous droits réservés.
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-xs text-muted-foreground">
            <Link to="/conditions-utilisation" className="hover:text-foreground transition-colors">Conditions d&apos;utilisation</Link>
            <Link to="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</Link>
            <Link to="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
