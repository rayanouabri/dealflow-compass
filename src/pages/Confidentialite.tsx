import { StaticPageLayout } from "@/components/StaticPageLayout";
import { Link } from "react-router-dom";

export default function Confidentialite() {
  return (
    <StaticPageLayout title="Politique de confidentialité">
      <div className="space-y-6">
        <p>
          Cette politique décrit comment sont traitées vos données dans le cadre de l&apos;utilisation d&apos;AI-VC.
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Données collectées</h2>
        <p>
          Nous collectons les données nécessaires au fonctionnement du service : identifiants de connexion 
          (ex. email), historique d&apos;analyses, paramètres saisis (fonds, thèses). Les requêtes envoyées 
          aux APIs (Gemini, Brave) sont utilisées uniquement pour générer les analyses.
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Finalités</h2>
        <p>
          Les données servent à fournir le service, sauvegarder vos analyses, gérer votre compte et, 
          le cas échéant, vous contacter (support, informations importantes).
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Hébergement et sous-traitants</h2>
        <p>
          Nous nous appuyons sur Supabase (base de données, auth) et Vercel (hébergement). 
          Les traitements sont réalisés dans le respect des règles applicables.
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Vos droits</h2>
        <p>
          Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement et, le cas échéant, 
          d&apos;opposition ou de limitation du traitement. Pour les exercer :{" "}
          <Link to="/contact" className="text-primary hover:underline">Contact</Link> (rayan.ouabri@edhec.com).
        </p>
      </div>
    </StaticPageLayout>
  );
}
