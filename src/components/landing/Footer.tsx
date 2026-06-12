import { Link } from "react-router-dom";

const CONTACT_EMAIL = "rayan.ouabri@edhec.com";

export function Footer() {
  return (
    <footer className="border-t border-border py-14">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <span className="font-display text-lg font-semibold tracking-tight text-foreground">
                AIVC
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-4">
              Sourcing et due diligence automatisés pour fonds d'investissement.
              Des signaux faibles aux mémos sourcés.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {CONTACT_EMAIL}
            </a>
          </div>

          {/* Produit */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-[0.14em] mb-4">
              Produit
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/analyser" className="hover:text-foreground transition-colors">Sourcing</Link></li>
              <li><Link to="/due-diligence" className="hover:text-foreground transition-colors">Due diligence</Link></li>
              <li><Link to="/#pricing" className="hover:text-foreground transition-colors">Tarifs</Link></li>
            </ul>
          </div>

          {/* Entreprise */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-[0.14em] mb-4">
              Entreprise
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link to="/a-propos" className="hover:text-foreground transition-colors">À propos</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AIVC. Tous droits réservés.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <Link to="/conditions-utilisation" className="hover:text-foreground transition-colors">Conditions d'utilisation</Link>
            <Link to="/confidentialite" className="hover:text-foreground transition-colors">Confidentialité</Link>
            <Link to="/mentions-legales" className="hover:text-foreground transition-colors">Mentions légales</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
