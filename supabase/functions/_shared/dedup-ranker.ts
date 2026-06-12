// Déduplication et ranking des résultats de sourcing
import type { SearchResult } from "./search-client.ts";

export interface SourcingCandidate {
  name: string;
  url: string;
  descriptions: string[];
  mentionCount: number;
  categories: Set<string>;
  sources: string[];
  score: number;
  recencyScore: number;
  signalYear: number | null;
  crossSignalBonus: number;
}

const SIGNAL_WEIGHTS: Record<string, number> = {
  insee: 2, // signal faible seul (juste "société immatriculée") — corrobore, ne domine pas
  insee_named: 5, // raison sociale qui évoque la thèse — signal fort
  ip: 4,
  linkedin: 4, // page société LinkedIn = entité réelle + signal RH/founders
  spinoff: 3,
  university: 3,
  talent: 3,
  incubator: 2,
  grant: 2,
  press: 1,
  github: 4,
  arxiv_hal: 4,
  pappers: 3,
  producthunt: 3,
  wellfound: 3,
  show_hn: 3,
  job_board: 2,
  conference: 2,
};

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.toLowerCase());
    // Retire www. et le slash final ; garde la query (utile pour HN ?id=)
    return (u.hostname.replace(/^www\./, "") + u.pathname + u.search).replace(
      /\/$/,
      "",
    );
  } catch {
    return url.toLowerCase().replace(/^www\./, "").replace(/\/$/, "");
  }
}

// Domaines agrégateurs : un même hôte héberge des milliers d'entreprises
// distinctes. On regroupe alors par chemin complet, pas par hostname.
const AGGREGATOR_HOSTS = new Set([
  "github.com",
  "news.ycombinator.com",
  "ycombinator.com",
  "annuaire-entreprises.data.gouv.fr",
  "linkedin.com",
  "producthunt.com",
  "wellfound.com",
  "angel.co",
  "pappers.fr",
  "societe.com",
  "crunchbase.com",
  "medium.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "reddit.com",
]);

function groupingKey(normUrl: string): string {
  const host = normUrl.split("/")[0];
  return AGGREGATOR_HOSTS.has(host) ? normUrl : host;
}

// Annuaires, listicles, presse, institutions : une page = un article listant
// plusieurs entreprises, PAS une entreprise. On ne les retient jamais comme
// candidat (sinon on source "seedtable", "usine digitale"...).
const DIRECTORY_HOSTS = new Set([
  "seedtable.com",
  "forinov.fr",
  "welcometothejungle.com",
  "lesassisesdelacybersecurite.com",
  "deepstrike.io",
  "crunchbase.com",
  "dealroom.co",
  "eu-startups.com",
  "sifted.eu",
  "maddyness.com",
  "frenchweb.fr",
  "journaldunet.com",
  "usine-digitale.fr",
  "lesechos.fr",
  "bigmedia.bpifrance.fr",
  "bpifrance.fr",
  "lafrenchtech.gouv.fr",
  "lafrenchtech.com",
  "inria.fr",
  "cnrs.fr",
  "techcrunch.com",
  "producthunt.com",
  "ycombinator.com",
  "news.ycombinator.com",
  "wikipedia.org",
  "youtube.com",
  "medium.com",
  "lemondeinformatique.fr",
  "fundraiseinsider.com",
  "frenchtechjournal.com",
  "substack.com",
  "ec.europa.eu",
  "reddit.com",
  "glassdoor.com",
  "indeed.com",
  "bpifrance.com",
  "usinenouvelle.com",
  "challenges.fr",
  "forbes.com",
  "lespepitestech.com",
  "jedha.co",
  "growthlist.co",
  "eu-startups.com",
  "tracxn.com",
  "f6s.com",
  "glass.ai",
  "cybernews.com",
  "g2.com",
  "capterra.com",
  "patents.google.com",
  "espacenet.com",
  "scholar.google.com",
  "arxiv.org",
  "researchgate.net",
  "semanticscholar.org",
  "rand.org",
  "sans.edu",
  "sans.org",
  "slogix.in",
  "gartner.com",
  "statista.com",
  "cloud.google.com",
  "microsoft.com",
  "ibm.com",
  "businessinsider.com",
  "cnbc.com",
  "bloomberg.com",
  "cybersecurity-excellence-awards.com",
  "chooseparisregion.org",
  "satt.fr",
  "polytechnique.edu",
  "universite-paris-saclay.fr",
  "cea.fr",
  "anr.fr",
  "horizon-europe.gouv.fr",
  "europa.eu",
  "deeptechalliance.org",
  "innoenergy.com",
  "eitdigital.eu",
  // Marques grand public / retail B2C confirmées comme faux positifs deeptech
  "signet.watch",
]);

// Grands groupes : leurs pages produit (oracle.com/java, wso2.com/bijira,
// sap.com/products/...) passent pour des startups. Jamais candidats.
const CORPORATE_HOSTS = new Set([
  "wso2.com",
  "oracle.com",
  "sap.com",
  "salesforce.com",
  "google.com",
  "amazon.com",
  "aws.amazon.com",
  "meta.com",
  "facebook.com",
  "apple.com",
  "adobe.com",
  "atlassian.com",
  "vmware.com",
  "redhat.com",
  "intel.com",
  "nvidia.com",
  "cisco.com",
  "siemens.com",
  "bosch.com",
  "schneider-electric.com",
  "thalesgroup.com",
  "airbus.com",
  "safran-group.com",
  "3ds.com",
  "dassault-systemes.com",
  "capgemini.com",
  "soprasteria.com",
  "atos.net",
  "orange.com",
  "huawei.com",
  "samsung.com",
  "sony.com",
  "fujitsu.com",
  "accenture.com",
  "servicenow.com",
  "workday.com",
  "databricks.com",
  "snowflake.com",
]);

// Match par suffixe : alexandre.substack.com → substack.com
function isDirectoryHost(normUrl: string): boolean {
  const host = normUrl.split("/")[0];
  for (const d of DIRECTORY_HOSTS) {
    if (host === d || host.endsWith("." + d)) return true;
  }
  for (const d of CORPORATE_HOSTS) {
    if (host === d || host.endsWith("." + d)) return true;
  }
  return false;
}

// Généralisation du pattern wso2.com/bijira : une SOUS-PAGE d'un domaine dont
// le nom extrait ne correspond pas au domaine est presque toujours un produit,
// une filiale ou une fonctionnalité d'une autre entreprise — pas une startup
// autonome. La vraie page d'une startup est sa racine (path vide) ou une page
// dont le titre porte sa marque (= son domaine).
function isProductSubpage(normUrl: string, name: string): boolean {
  const slash = normUrl.indexOf("/");
  if (slash === -1) return false; // racine du domaine : jamais filtré
  const host = normUrl.slice(0, slash);
  const path = normUrl.slice(slash + 1);
  if (!path) return false;
  const nameToken = name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  if (nameToken.length < 4) return false; // nom trop court pour décider
  const hostAlnum = host.replace(/[^a-z0-9]/g, "");
  const hostBase = host.split(".")[0].replace(/[^a-z0-9]/g, "");
  // Le nom porte le domaine (acmerobotics → acmerobotics.com) ou le domaine
  // porte le nom (acme.io/about titré "Acme") → page du site de la startup.
  if (hostAlnum.includes(nameToken.slice(0, 10))) return false;
  if (hostBase.length >= 4 && nameToken.includes(hostBase)) return false;
  return true;
}

// Un nom qui ressemble à un titre d'article/listicle n'est pas une entreprise.
// Les vraies raisons sociales sont courtes et sans marqueurs éditoriaux.
const ARTICLE_NAME =
  /\b(top|best|meilleur|meilleures|liste|list of|funded|guide|startups?|entreprises?|companies|classement|palmarès|annuaire|ranking|directory|research|papers?|report|forecast|forsights|topics|resources|trends?|overview|state of|i built|i made|we built|how (i|to|we)|built a|tutorial|introducing|summary|review)\b/i;

// Mots seuls trop génériques pour être une raison sociale (pages de rubrique).
const GENERIC_SINGLE_NAME =
  /^(startups?|entreprises?|compan(y|ies)|news|actualit[ée]s?|accueil|home|blog|articles?|portfolio|about|contact|innovation|technologies?|deeptech|solutions?)$/i;

function looksLikeArticle(name: string): boolean {
  if (name.length > 40) return true; // raison sociale trop longue
  if (GENERIC_SINGLE_NAME.test(name.trim())) return true; // "Startups", "News"…
  if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(name.trim())) {
    return true; // commence par un emoji/drapeau
  }
  if (/\b\d[\d.,]*\+?\b/.test(name) && ARTICLE_NAME.test(name)) return true; // "15 meilleures", "1,600+ funded"
  const wordCount = name.trim().split(/\s+/).length;
  if (wordCount >= 4 && ARTICLE_NAME.test(name)) return true;
  return false;
}

export function extractCompanyName(title: string, url: string): string {
  // Supprime les suffixes courants de titres.
  // Le séparateur doit être PRÉCÉDÉ d'un espace : couper au tiret d'un mot
  // composé fabriquait de faux noms ("Two InnoEnergy-backed companies…" →
  // "Two InnoEnergy" qui passait les filtres anti-article).
  let name = title
    .replace(/\s+[|\-–—]\s*.+$/, "")  // "Acme - Homepage" → "Acme"
    .replace(/\s*:.*$/, "")            // "Acme: About" → "Acme"
    .replace(/,.*$/, "")               // "Acme, the open-source X" → "Acme"
    .replace(/["«»]/g, "")             // Guillemets français
    .trim();

  if (name.length > 60 || name.length < 2) {
    // Fallback : domaine principal
    try {
      name = new URL(url).hostname
        .replace(/^www\./, "")
        .split(".")[0]
        .replace(/-/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2"); // camelCase → spaced
    } catch {
      name = url;
    }
  }

  return name;
}

function computeRecencyScore(descriptions: string[]): { score: number; year: number | null } {
  const text = descriptions.join(" ");
  const currentYear = new Date().getFullYear();

  // Années détectées dans les descriptions, fenêtre glissante (année courante
  // -3 à +1) — jamais d'année hardcodée.
  const years = (text.match(/\b20\d{2}\b/g) ?? [])
    .map(Number)
    .filter((y) => y >= currentYear - 3 && y <= currentYear + 1);
  if (years.length === 0) return { score: 1, year: null };

  const latestYear = Math.max(...years);
  const yearDiff = Math.max(0, currentYear - latestYear);

  // Année courante = 10, -1 = 7, -2 = 4, avant = 1
  let score = 1;
  if (yearDiff === 0) score = 10;
  else if (yearDiff === 1) score = 7;
  else if (yearDiff === 2) score = 4;

  return { score, year: latestYear };
}

function computeCrossSignalBonus(categories: Set<string>): number {
  const highValueSignals = ["insee", "insee_named", "github", "arxiv_hal", "pappers", "show_hn", "ip", "linkedin", "spinoff", "producthunt", "wellfound", "university", "talent"];
  const highValueCount = Array.from(categories).filter(cat => highValueSignals.includes(cat)).length;

  if (highValueCount >= 4) return 25;
  if (highValueCount === 3) return 15;
  if (highValueCount === 2) return 5;
  return 0;
}

// Regroupe les résultats par startup et calcule les scores
export function deduplicateAndRank(
  results: (SearchResult & { category?: string })[],
): SourcingCandidate[] {
  const byUrl = new Map<string, SourcingCandidate>();

  for (const r of results) {
    if (!r.url) continue;

    const normUrl = normalizeUrl(r.url);
    // Ignore les pages d'annuaires/presse (ne sont pas des entreprises)
    if (isDirectoryHost(normUrl)) continue;

    const candidateName = extractCompanyName(r.title, r.url);
    // Ignore les titres d'articles/listicles capturés comme faux candidats
    if (looksLikeArticle(candidateName)) continue;

    // Sous-page produit d'un autre domaine (ex: wso2.com/bijira) : le nom ne
    // correspond pas au domaine → produit/filiale, pas une startup autonome.
    // Ne s'applique pas aux agrégateurs (github.com/org est légitime).
    if (
      !AGGREGATOR_HOSTS.has(normUrl.split("/")[0]) &&
      isProductSubpage(normUrl, candidateName)
    ) {
      continue;
    }

    // Clé de regroupement : hostname pour un site d'entreprise (acme.com/team
    // et acme.com/blog → même candidat), chemin complet pour un agrégateur.
    const key = groupingKey(normUrl);

    if (!byUrl.has(key)) {
      byUrl.set(key, {
        name: candidateName,
        url: r.url,
        descriptions: [],
        mentionCount: 0,
        categories: new Set(),
        sources: [],
        score: 0,
        recencyScore: 0,
        signalYear: null,
        crossSignalBonus: 0,
      });
    }

    const candidate = byUrl.get(key)!;
    candidate.mentionCount += 1;

    if (r.description) candidate.descriptions.push(r.description);
    if (r.category) candidate.categories.add(r.category);
    if (r.source && !candidate.sources.includes(r.source)) {
      candidate.sources.push(r.source);
    }
  }

  // Scoring pondéré avec recency + cross-signal bonus
  const candidates: SourcingCandidate[] = [];
  for (const c of byUrl.values()) {
    // Compute recency score and year
    const { score: recencyScore, year: signalYear } = computeRecencyScore(c.descriptions);
    c.recencyScore = recencyScore;
    c.signalYear = signalYear;

    // Compute cross-signal bonus
    c.crossSignalBonus = computeCrossSignalBonus(c.categories);

    // Filter noise with relaxed rules for high-value signals
    const hasHighValueSignal = Array.from(c.categories).some(cat =>
      ["insee", "insee_named", "github", "arxiv_hal", "pappers", "show_hn", "linkedin", "ip"].includes(cat)
    );
    if (c.mentionCount < 2 && c.categories.size < 2 && !hasHighValueSignal) {
      continue;
    }

    // Weighted score: (sum_weights × min(mentions, 15)) + recencyScore + crossSignalBonus
    let weight = 0;
    for (const cat of c.categories) {
      weight += (SIGNAL_WEIGHTS[cat] ?? 1);
    }
    const cappedMentions = Math.min(c.mentionCount, 15); // Diminishing returns
    c.score = weight * cappedMentions + c.recencyScore + c.crossSignalBonus;
    candidates.push(c);
  }

  return candidates.sort((a, b) => b.score - a.score);
}

// Filtre strict on-thesis (gratuit, basé texte).
// Élimine les candidats qui matchent un terme d'exclusion sans aucun terme
// obligatoire de l'ICP. Boost ceux qui matchent les termes obligatoires.
export function filterByICP(
  candidates: SourcingCandidate[],
  opts: { mustHave?: string[]; exclude?: string[] },
): SourcingCandidate[] {
  const mustHave = (opts.mustHave ?? []).map((t) => t.toLowerCase()).filter(Boolean);
  const exclude = (opts.exclude ?? []).map((t) => t.toLowerCase()).filter(Boolean);

  if (mustHave.length === 0 && exclude.length === 0) return candidates;

  const matchesWord = (text: string, term: string): boolean => {
    // match mot entier pour éviter les faux positifs (ex: "fonds" dans "profonds")
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  };

  const result: SourcingCandidate[] = [];
  for (const c of candidates) {
    const text = `${c.name} ${c.descriptions.join(" ")}`.toLowerCase();
    const hasMust = mustHave.length === 0 || mustHave.some((t) => matchesWord(text, t));
    const hasExclusion = exclude.some((t) => matchesWord(text, t));
    // Les candidats du registre INSEE sont déjà pré-qualifiés par leur code NAF :
    // on ne les rejette pas sur un mot du libellé NAF (ex: "conseil en logiciels").
    const fromRegistry = c.categories.has("insee") || c.categories.has("insee_named");

    // Rejet strict : ressemble à un acteur exclu et ne matche aucun terme produit
    if (hasExclusion && !hasMust && !fromRegistry) continue;

    // Boost les candidats qui matchent explicitement le type d'entreprise visé
    if (mustHave.length > 0 && hasMust) {
      c.score += 10;
    }
    result.push(c);
  }

  return result.sort((a, b) => b.score - a.score);
}
