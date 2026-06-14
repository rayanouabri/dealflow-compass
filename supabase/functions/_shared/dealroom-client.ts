// Dealroom.co — base live de 3M+ startups, endpoints publics sans auth.
// Sert deux usages : (1) SOURCING de startups réelles/fraîches (just-founded,
// live-signals), (2) ENRICHISSEMENT structuré d'un candidat (lookup-slug +
// entity-news → stade/levée vérifiés) pour un filtre déterministe.
import { logger } from "./logger.ts";
import { getCachedSearch, setCachedSearch } from "./search-cache.ts";

const BASE = "https://dealroom.co";
const TIMEOUT = 12000;

async function getJson(path: string): Promise<any | null> {
  try {
    // UA explicite : l'edge Dealroom renvoie du vide aux clients sans User-Agent.
    const r = await fetch(`${BASE}${path}`, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AI-VC/1.0)", "Accept": "application/json" },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (err) {
    logger.warn(`[Dealroom] ${path} failed`, { error: String(err) });
    return null;
  }
}

export interface DealroomCompany {
  name: string;
  url: string;          // site web ou profil Dealroom
  description: string;
  stage?: string;       // ex "SEED", "SERIES A"
  funding?: string;     // ex "$5M"
  founders?: string[];
  hq?: string;
  source: "dealroom_just_founded" | "dealroom_signal" | "dealroom_marketmap";
}

// Startups tout juste fondées (rafraîchi tous les 2 jours) — pépites early,
// anti-notoriété par construction. Filtrables par fundingStatus.
export async function dealroomJustFounded(): Promise<DealroomCompany[]> {
  const d = await getJson(`/data/just-founded.json`);
  const items: any[] = Array.isArray(d) ? d : (d?.items ?? d?.startups ?? []);
  return items.map((it) => ({
    name: String(it.name ?? "").trim(),
    url: it.website ?? it.url ?? it.profileUrl ?? "",
    description: [it?.story?.building, it?.story?.whyNow].filter(Boolean).join(" ").slice(0, 250) ||
      String(it.tagline ?? it.description ?? "").slice(0, 250),
    stage: it.fundingStatus === "pre-funding" ? "pre-seed" : (it.stage ?? "seed"),
    founders: (it.founders ?? []).map((f: any) => f?.name).filter(Boolean),
    hq: it.hq ?? it.country ?? it.location ?? undefined,
    source: "dealroom_just_founded" as const,
  })).filter((c) => c.name.length >= 2);
}

// Derniers tours de financement (signal de fraîcheur). On filtre côté appelant
// sur le secteur/géo. Format meta: "SERIES A · Lead: X · sector".
export async function dealroomLiveSignals(limit = 40): Promise<DealroomCompany[]> {
  const d = await getJson(`/api/live-signals?limit=${limit}`);
  const signals: any[] = d?.signals ?? [];
  return signals
    .filter((s) => s?.type === "round" && s?.title)
    .map((s) => {
      const name = String(s.title).replace(/\s+raised\s+.*$/i, "").trim();
      const stageMatch = String(s.meta ?? "").match(/^([A-Z][A-Z\s]+?)(?:\s*·|$)/);
      return {
        name,
        url: "",
        description: `${s.title}. ${s.meta ?? ""} (${s.city ?? ""}, ${s.time ?? ""})`.slice(0, 250),
        stage: stageMatch ? stageMatch[1].trim().toLowerCase() : undefined,
        funding: s.value,
        hq: s.city,
        source: "dealroom_signal" as const,
      };
    })
    .filter((c) => c.name.length >= 2);
}

// --- Sourcing via MARKET MAPS (listes curées par tag) ---
// Bien plus large que just-founded sur une thèse étroite : c'est là que sont les
// viviers early non célèbres. /api/marketmaps?tag=X liste les maps ; chaque map
// donne jusqu'à ~500 sociétés (website, industries, launchYear, totalFunding).
// On filtre les trop-financées À LA SOURCE (anti-trop-avancé / anti-notoriété).

// Tags réellement disponibles sur /api/marketmaps (cf. availableTags).
const MARKETMAP_TAGS = [
  "AI", "Biotech", "Climate", "Consumer", "Crypto", "Deep Tech", "Defence",
  "Energy", "Europe", "Fintech", "Food & Agri", "France", "Gaming", "Health",
  "HR", "Marketing", "Mobility", "Real Estate", "Robotics", "Space", "UK", "USA",
];

// Synonymes (secteurs/géo saisis par l'utilisateur, souvent en FR) → tag Dealroom.
const TAG_SYNONYMS: Record<string, string> = {
  ia: "AI", ai: "AI", "intelligence artificielle": "AI", llm: "AI", "gen ai": "AI",
  deeptech: "Deep Tech", "deep tech": "Deep Tech", hardtech: "Deep Tech",
  fintech: "Fintech", finance: "Fintech", "assurtech": "Fintech", paiement: "Fintech",
  biotech: "Biotech", pharma: "Biotech",
  sante: "Health", "santé": "Health", health: "Health", healthtech: "Health", medtech: "Health", "e-sante": "Health",
  climat: "Climate", climate: "Climate", cleantech: "Climate", greentech: "Climate",
  energie: "Energy", "énergie": "Energy", energy: "Energy",
  crypto: "Crypto", web3: "Crypto", blockchain: "Crypto",
  defense: "Defence", "défense": "Defence", defence: "Defence",
  mobilite: "Mobility", "mobilité": "Mobility", mobility: "Mobility", transport: "Mobility", automobile: "Mobility",
  robotique: "Robotics", robotics: "Robotics",
  spatial: "Space", space: "Space", aerospace: "Space",
  gaming: "Gaming", jeux: "Gaming", jeu: "Gaming",
  food: "Food & Agri", foodtech: "Food & Agri", agri: "Food & Agri", agritech: "Food & Agri", agtech: "Food & Agri",
  rh: "HR", hr: "HR",
  immobilier: "Real Estate", proptech: "Real Estate", "real estate": "Real Estate",
  marketing: "Marketing", adtech: "Marketing", consumer: "Consumer", retail: "Consumer", b2c: "Consumer",
  france: "France", fr: "France",
  europe: "Europe", eu: "Europe", "ue": "Europe",
  uk: "UK", "royaume-uni": "UK", "royaume uni": "UK",
  usa: "USA", us: "USA", "etats-unis": "USA", "états-unis": "USA",
};

function toDealroomTags(sectors: string[], geography?: string): string[] {
  const raw = [...sectors, ...(geography ? [geography] : [])]
    .flatMap((s) => String(s).toLowerCase().split(/[,/|]+/))
    .map((s) => s.trim())
    .filter(Boolean);
  const tags = new Set<string>();
  for (const term of raw) {
    if (TAG_SYNONYMS[term]) { tags.add(TAG_SYNONYMS[term]); continue; }
    // match partiel (ex "intelligence artificielle B2B" contient "intelligence artificielle")
    for (const [k, v] of Object.entries(TAG_SYNONYMS)) {
      if (k.length >= 4 && term.includes(k)) { tags.add(v); break; }
    }
    const direct = MARKETMAP_TAGS.find((t) => t.toLowerCase() === term);
    if (direct) tags.add(direct);
  }
  return [...tags];
}

export async function dealroomMarketmaps(
  sectors: string[],
  geography?: string,
  opts: { maxMaps?: number; maxCompanies?: number; maxFundingUsdM?: number } = {},
): Promise<DealroomCompany[]> {
  const maxMaps = opts.maxMaps ?? 4;
  const maxCompanies = opts.maxCompanies ?? 160;
  const fundingCapUsd = (opts.maxFundingUsdM ?? 300) * 1_000_000;
  const wanted = toDealroomTags(sectors, geography);
  if (wanted.length === 0) return [];

  // 1) Liste des maps, filtrée serveur sur un tag secteur prioritaire si reconnu.
  const sectorTag = wanted.find((t) => t !== "France" && t !== "Europe" && t !== "UK" && t !== "USA");
  const listUrl = sectorTag
    ? `/api/marketmaps?tag=${encodeURIComponent(sectorTag)}&limit=80`
    : `/api/marketmaps?limit=120`;
  const list = await getJson(listUrl);
  const maps: any[] = list?.results ?? [];
  if (maps.length === 0) return [];

  // 2) Score par recouvrement de tags ; on écarte les maps géantes génériques
  //    (>1200 sociétés = trop large, bruité) et on préfère les plus ciblées.
  const wantedLc = wanted.map((w) => w.toLowerCase());
  const scored = maps
    .map((m) => {
      const mtags = (m.tags ?? []).map((t: string) => String(t).toLowerCase());
      const overlap = wantedLc.filter((w) => mtags.some((mt: string) => mt.includes(w) || w.includes(mt))).length;
      const count = m.companyCount ?? m.company_count ?? 0;
      return { m, overlap, count };
    })
    .filter((x) => x.overlap > 0 && x.count > 0 && x.count <= 1200)
    .sort((a, b) => b.overlap - a.overlap || a.count - b.count)
    .slice(0, maxMaps);
  if (scored.length === 0) return [];

  // 3) Sociétés de chaque map retenue (fetch parallèle → wall-time ~12s),
  //    filtre des trop-financées à la source.
  const mapData = await Promise.all(scored.map(({ m }) => {
    const cu = m.companiesUrl || m.companies_url || `/api/marketmap?id=${m.id}`;
    const path = String(cu).startsWith("http") ? String(cu).replace(BASE, "") : String(cu);
    return getJson(path);
  }));

  const out: DealroomCompany[] = [];
  const seen = new Set<string>();
  for (const data of mapData) {
    for (const co of (data?.companies ?? [])) {
      if (out.length >= maxCompanies) break;
      const name = String(co?.name ?? "").trim();
      if (name.length < 2) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      const funding = Number(co?.totalFunding?.amount ?? 0);
      if (funding > fundingCapUsd) continue; // trop avancé → écarté à la source
      seen.add(key);
      // hq peut être une string, null, ou un objet {city,country} selon la map.
      const hqStr = typeof co.hq === "string" ? co.hq
        : (co.hq?.city || co.hq?.country || co.hq?.name || "");
      out.push({
        name,
        url: co.website || co.dealroomUrl || "",
        description: [
          co.tagline, co.segment, (co.industries ?? []).join(", "),
          hqStr, co.launchYear ? `founded ${co.launchYear}` : "",
        ].filter(Boolean).join(" · ").slice(0, 250),
        funding: funding ? `$${Math.round(funding / 1e6)}M` : undefined,
        hq: hqStr || undefined,
        source: "dealroom_marketmap" as const,
      });
    }
  }
  return out;
}

// --- Enrichissement structuré d'un candidat nommé ---
export interface DealroomEnrichment {
  matched: boolean;
  slug?: string;
  profileUrl?: string;
  // Texte d'actualités (tours de table, étapes) — sert au gate stade et à la DD.
  newsText?: string;
  // Signal de maturité détecté (pour le filtre déterministe).
  latestStageHint?: string | null;
}

const STAGE_ORDER = ["pre-seed", "seed", "series a", "series b", "series c", "series d", "series e", "growth", "ipo", "public"];

function detectLatestStage(text: string): string | null {
  const t = text.toLowerCase();
  let best: number | null = null;
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    const s = STAGE_ORDER[i];
    const re = new RegExp(`\\b${s.replace(/\s/g, "\\s*")}\\b`);
    if (re.test(t) || (s === "ipo" && /\bipo\b|cot[ée]e|nasdaq|euronext/.test(t))) {
      best = i;
      break;
    }
  }
  return best === null ? null : STAGE_ORDER[best];
}

function slugify(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function dealroomEnrich(name: string): Promise<DealroomEnrichment> {
  // Cache 5 j par société : l'enrichissement (stade réel) ne bouge pas d'un run à
  // l'autre → évite de retaper lookup-slug + entity-news à chaque pipeline.
  const cacheKey = `dealroom|enrich|${name.toLowerCase().trim()}`;
  const cached = await getCachedSearch<DealroomEnrichment>(cacheKey, 1);
  if (cached && cached.length > 0) return cached[0];

  // lookup-slug a une couverture partielle ; entity-news marche directement
  // avec un slug = nom slugifié. On tente le lookup, sinon fallback slugify.
  const lookup = await getJson(`/api/lookup-slug?name=${encodeURIComponent(name)}&type=company&limit=1`);
  const match = (lookup?.matches ?? lookup?.results ?? [])[0];
  const slug = match?.slug ?? slugify(name);
  if (!slug) return { matched: false };

  const news = await getJson(`/api/entity-news?path=${encodeURIComponent(slug)}&type=company`);
  const items: any[] = news?.items ?? [];
  if (items.length === 0 && !match) return { matched: false };

  const newsText = items
    .map((it) => `${it.title ?? ""}. ${it.summary ?? ""}`)
    .join("\n")
    .slice(0, 4000);

  const result: DealroomEnrichment = {
    matched: items.length > 0 || !!match,
    slug,
    profileUrl: match?.profileUrl ?? `https://app.dealroom.co/companies/${slug}`,
    newsText,
    latestStageHint: detectLatestStage(newsText),
  };
  await setCachedSearch(cacheKey, 1, [result], 5);
  return result;
}
