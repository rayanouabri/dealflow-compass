// Dealroom.co — base live de 3M+ startups, endpoints publics sans auth.
// Sert deux usages : (1) SOURCING de startups réelles/fraîches (just-founded,
// live-signals), (2) ENRICHISSEMENT structuré d'un candidat (lookup-slug +
// entity-news → stade/levée vérifiés) pour un filtre déterministe.
import { logger } from "./logger.ts";

const BASE = "https://dealroom.co";
const TIMEOUT = 12000;

async function getJson(path: string): Promise<any | null> {
  try {
    const r = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(TIMEOUT) });
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
  source: "dealroom_just_founded" | "dealroom_signal";
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

  return {
    matched: items.length > 0 || !!match,
    slug,
    profileUrl: match?.profileUrl ?? `https://app.dealroom.co/companies/${slug}`,
    newsText,
    latestStageHint: detectLatestStage(newsText),
  };
}
