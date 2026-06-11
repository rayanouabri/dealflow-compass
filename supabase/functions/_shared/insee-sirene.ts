// Connecteur INSEE Sirene v3.11 — détection des entreprises récemment créées.
// API gratuite (open data, 30 req/min). Clé lue depuis Deno.env (INSEE_API_KEY).
// Doc: https://api.insee.fr/api-sirene/3.11 — header X-INSEE-Api-Key-Integration

import { logger } from "./logger.ts";
import type { SearchResult } from "./search-client.ts";

const INSEE_BASE = "https://api.insee.fr/api-sirene/3.11";

// Codes NAF/APE ciblant les startups tech/deeptech (format INSEE avec point).
export const DEFAULT_TECH_NAF = [
  "62.01Z", // Programmation informatique
  "62.02A", // Conseil en systèmes et logiciels informatiques
  "63.11Z", // Traitement de données, hébergement
  "63.12Z", // Portails internet
  "58.29C", // Édition de logiciels applicatifs
  "58.21Z", // Édition de jeux électroniques
  "72.11Z", // R&D en biotechnologie
  "72.19Z", // R&D en autres sciences physiques et naturelles
  "26.11Z", // Fabrication de composants électroniques
  "26.51B", // Fabrication d'instrumentation scientifique
  "21.20Z", // Fabrication de préparations pharmaceutiques
];

// Libellés pour enrichir la description (utile au filtre ICP et au scoring).
const NAF_LABELS: Record<string, string> = {
  "62.01Z": "Programmation informatique",
  "62.02A": "Conseil en systèmes et logiciels informatiques",
  "63.11Z": "Traitement de données, hébergement",
  "63.12Z": "Portails internet",
  "58.29C": "Édition de logiciels applicatifs",
  "58.21Z": "Édition de jeux électroniques",
  "72.11Z": "R&D en biotechnologie",
  "72.19Z": "R&D en sciences physiques et naturelles",
  "26.11Z": "Fabrication de composants électroniques",
  "26.51B": "Fabrication d'instrumentation scientifique",
  "21.20Z": "Fabrication de préparations pharmaceutiques",
};

// Catégories juridiques privilégiées (startups finançables : SAS/SASU, SARL).
const DEFAULT_LEGAL = ["5710", "5499"];

// Codes NAF de pure prestation de service (SSII, conseil, dépannage) — exclus :
// quasi jamais des startups deeptech finançables.
const SERVICE_NAF = new Set(["62.02A", "62.02B", "62.03Z", "62.09Z", "95.11Z"]);

// Noms typiques de boutiques de service IT / revendeurs (pas des startups).
const SERVICE_NAME = /informatique|consulting|\bconseil\b|maintenance|\breseau(x)?\b|infogerance|infogérance|depannage|dépannage|\bservices?\b|\bsolutions?\b|\bsystemes?\b|\bsystèmes?\b|negoce|distribution/i;

export interface InseeCompany {
  siren: string;
  siret: string;
  name: string;
  naf: string;
  nafLabel: string;
  creationDate: string;
  city: string;
  postalCode: string;
  nameMatch?: boolean; // true si trouvé via un token de nom de la thèse
}

export interface InseeQueryOptions {
  nafCodes?: string[];
  legalCategories?: string[];
  sinceDays?: number; // créées dans les N derniers jours
  postalPrefixes?: string[]; // ex: ["75", "92"] pour Paris/IDF
  maxResults?: number;
  nameTokens?: string[]; // fragments de raison sociale (ex: "cyber", "secur")
}

function buildQ(
  nafCodes: string[],
  legalCategories: string[],
  sinceDays: number,
  postalPrefixes: string[],
  nameTokens: string[] = [],
): string {
  const since = new Date(Date.now() - sinceDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const naf = nafCodes
    .map((c) => `activitePrincipaleUniteLegale:${c}`)
    .join(" OR ");
  const cj = legalCategories
    .map((c) => `categorieJuridiqueUniteLegale:${c}`)
    .join(" OR ");
  const parts = [
    `dateCreationUniteLegale:[${since} TO *]`,
    `etatAdministratifUniteLegale:A`,
    `etablissementSiege:true`,
    `(${naf})`,
    `(${cj})`,
  ];
  if (postalPrefixes.length > 0) {
    const cp = postalPrefixes
      .map((p) => `codePostalEtablissement:${p}*`)
      .join(" OR ");
    parts.push(`(${cp})`);
  }
  if (nameTokens.length > 0) {
    const dn = nameTokens
      .map((t) => `denominationUniteLegale:*${t}*`)
      .join(" OR ");
    parts.push(`(${dn})`);
  }
  return parts.join(" AND ");
}

// Exécute une requête Sirene et normalise. `applyServiceFilter` écarte les noms
// de SSII (mode browse) ; on le désactive en mode nom-ciblé.
async function fetchInsee(
  q: string,
  nombre: number,
  key: string,
  applyServiceFilter: boolean,
  nameMatch: boolean,
): Promise<InseeCompany[]> {
  const url = `${INSEE_BASE}/siret?q=${encodeURIComponent(q)}&nombre=${nombre}`;
  try {
    const resp = await fetch(url, {
      headers: { Accept: "application/json", "X-INSEE-Api-Key-Integration": key },
    });
    if (resp.status === 404) return [];
    if (!resp.ok) {
      logger.error("INSEE Sirene erreur", {
        status: resp.status,
        body: (await resp.text()).slice(0, 200),
      });
      return [];
    }
    const data = await resp.json();
    const out: InseeCompany[] = [];
    for (const e of data.etablissements ?? []) {
      const ul = e.uniteLegale ?? {};
      const adr = e.adresseEtablissement ?? {};
      const name = ul.denominationUniteLegale;
      if (!name) continue; // entrepreneur individuel : pas de raison sociale
      if (applyServiceFilter && SERVICE_NAME.test(name)) continue;
      const naf = ul.activitePrincipaleUniteLegale ?? "";
      out.push({
        siren: e.siren ?? "",
        siret: e.siret ?? "",
        name,
        naf,
        nafLabel: NAF_LABELS[naf] ?? "",
        creationDate: ul.dateCreationUniteLegale ?? "",
        city: adr.libelleCommuneEtablissement ?? "",
        postalCode: adr.codePostalEtablissement ?? "",
        nameMatch,
      });
    }
    return out;
  } catch (err) {
    logger.error("INSEE Sirene exception", { error: String(err) });
    return [];
  }
}

// Récupère les sièges d'entreprises récemment immatriculées. Deux modes :
//  1. browse NAF tech (signal faible, filtré anti-SSII)
//  2. nom-ciblé : raison sociale contenant un token de la thèse (signal fort,
//     NAF large incl. conseil, sans filtre de nom)
export async function searchNewCompanies(
  opts: InseeQueryOptions = {},
): Promise<InseeCompany[]> {
  const key = Deno.env.get("INSEE_API_KEY");
  if (!key) {
    logger.warn("INSEE_API_KEY non configuré — skip INSEE Sirene");
    return [];
  }

  const requested = opts.nafCodes?.length ? opts.nafCodes : DEFAULT_TECH_NAF;
  const browseNaf = requested.filter((c) => !SERVICE_NAF.has(c));
  const nafCodes = browseNaf.length > 0 ? browseNaf : ["62.01Z"];
  const legalCategories = opts.legalCategories?.length
    ? opts.legalCategories
    : DEFAULT_LEGAL;
  const sinceDays = opts.sinceDays ?? 120;
  const postalPrefixes = opts.postalPrefixes ?? [];
  const maxResults = Math.min(opts.maxResults ?? 30, 1000);
  const nameTokens = (opts.nameTokens ?? [])
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 4);

  const tasks: Promise<InseeCompany[]>[] = [
    // 1) browse NAF (signal faible)
    fetchInsee(
      buildQ(nafCodes, legalCategories, sinceDays, postalPrefixes),
      maxResults,
      key,
      true,
      false,
    ),
  ];
  // 2) nom-ciblé (signal fort) — NAF large, conseil inclus
  if (nameTokens.length > 0) {
    const broadNaf = requested; // garde 62.02A etc. quand le nom matche
    tasks.push(
      fetchInsee(
        buildQ(broadNaf, legalCategories, sinceDays, postalPrefixes, nameTokens),
        20,
        key,
        false,
        true,
      ),
    );
  }

  const results = await Promise.all(tasks);
  // Dédup par SIREN, priorité au mode nom-ciblé
  const bySiren = new Map<string, InseeCompany>();
  for (const list of results) {
    for (const c of list) {
      const ex = bySiren.get(c.siren);
      if (!ex || (c.nameMatch && !ex.nameMatch)) bySiren.set(c.siren, c);
    }
  }
  const out = [...bySiren.values()];
  logger.info("INSEE Sirene", {
    found: out.length,
    named: out.filter((c) => c.nameMatch).length,
  });
  return out;
}

// Convertit en SearchResult pour réutiliser le dedup/ranking existant.
// URL = fiche publique annuaire-entreprises (stable, unique par SIREN).
export function inseeToSearchResults(
  companies: InseeCompany[],
): (SearchResult & { category: string })[] {
  return companies.map((c) => ({
    title: c.name,
    url: `https://annuaire-entreprises.data.gouv.fr/entreprise/${c.siren}`,
    description: `${c.nameMatch ? "Raison sociale évoquant la thèse. " : ""}Société créée le ${c.creationDate} — ${
      c.nafLabel || c.naf
    }${c.city ? `, ${c.city} (${c.postalCode})` : ""}. Immatriculation récente (signal pré-seed).`,
    extra_snippets: [],
    source: "insee",
    // nom-ciblé = signal plus fort qu'un simple browse NAF
    category: c.nameMatch ? "insee_named" : "insee",
  }));
}
