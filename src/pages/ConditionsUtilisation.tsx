import { StaticPageLayout } from "@/components/StaticPageLayout";
import { Link } from "react-router-dom";

export default function ConditionsUtilisation() {
  return (
    <StaticPageLayout title="Conditions d'utilisation">
      <div className="space-y-6">
        <p>
          L&apos;utilisation du site AI-VC implique l&apos;acceptation des présentes conditions.
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Objet du service</h2>
        <p>
          AI-VC fournit un outil de sourcing et d&apos;analyse de startups à destination des professionnels 
          de l&apos;investissement. Le service est proposé &laquo; en l&apos;état &raquo;.
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Usage</h2>
        <p>
          Vous vous engagez à utiliser le service de manière conforme à la loi et à ne pas en abuser 
          (spam, extraction massive, utilisation frauduleuse).
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Limitation de responsabilité</h2>
        <p>
          Les analyses produites sont indicatives. AI-VC ne garantit pas l&apos;exactitude ou l&apos;exhaustivité 
          des données. Les décisions d&apos;investissement restent sous votre entière responsabilité.
        </p>
        <h2 className="text-lg font-semibold text-foreground mt-8">Contact</h2>
        <p>
          Pour toute question : <Link to="/contact" className="text-primary hover:underline">Contact</Link>.
        </p>
      </div>
    </StaticPageLayout>
  );
}
