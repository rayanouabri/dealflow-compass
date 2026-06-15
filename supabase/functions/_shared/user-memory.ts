// Mémoire de sourcing par utilisateur : évite de re-proposer les mêmes sociétés
// d'un run à l'autre. Lecture/écriture via le client service-role (RLS bypass).
import { logger } from "./logger.ts";

export function normalizeName(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents
    .replace(/\b(sas|sasu|sarl|sa|inc|ltd|llc|gmbh)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// Domaines agrégateurs : leur hostname n'identifie pas une société → on n'exclut
// jamais sur ce domaine (sinon on exclurait toutes les fiches annuaire/LinkedIn).
const SHARED_HOSTS = new Set([
  "annuaire-entreprises.data.gouv.fr",
  "linkedin.com",
  "github.com",
  "news.ycombinator.com",
]);

export interface SourcedSet {
  names: Set<string>;
  domains: Set<string>;
}

// Charge les sociétés déjà proposées à un utilisateur (N derniers jours).
export async function loadSourcedSet(
  supabase: any,
  userId: string,
  sinceDays = 120,
): Promise<SourcedSet> {
  const names = new Set<string>();
  const domains = new Set<string>();
  try {
    const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("user_sourced_companies")
      .select("name_normalized, domain")
      .eq("user_id", userId)
      .gte("sourced_at", since)
      .limit(2000);
    if (error) {
      logger.warn("loadSourcedSet erreur", { error: error.message });
      return { names, domains };
    }
    for (const row of data ?? []) {
      if (row.name_normalized) names.add(row.name_normalized);
      if (row.domain && !SHARED_HOSTS.has(row.domain)) domains.add(row.domain);
    }
  } catch (err) {
    logger.warn("loadSourcedSet exception", { error: String(err) });
  }
  return { names, domains };
}

// Vrai si la société a déjà été proposée à cet utilisateur.
export function isAlreadySourced(
  set: SourcedSet,
  name: string,
  url: string,
): boolean {
  const n = normalizeName(name);
  if (n && set.names.has(n)) return true;
  const d = domainOf(url);
  if (d && !SHARED_HOSTS.has(d) && set.domains.has(d)) return true;
  return false;
}

// Enregistre les sociétés d'une shortlist pour un utilisateur (upsert).
export async function saveSourcedCompanies(
  supabase: any,
  userId: string,
  pipelineId: string,
  companies: { name: string; url: string }[],
): Promise<void> {
  try {
    const rows = companies
      .map((c) => ({
        user_id: userId,
        name: c.name,
        name_normalized: normalizeName(c.name),
        domain: domainOf(c.url),
        pipeline_id: pipelineId,
      }))
      .filter((r) => r.name_normalized.length >= 2);
    if (rows.length === 0) return;
    const { error } = await supabase
      .from("user_sourced_companies")
      .upsert(rows, { onConflict: "user_id,name_normalized", ignoreDuplicates: true });
    if (error) logger.warn("saveSourcedCompanies erreur", { error: error.message });
  } catch (err) {
    logger.warn("saveSourcedCompanies exception", { error: String(err) });
  }
}

// --- Feedback explicite sur les picks (👍 / 👎) ---------------------------
// 👎 : exclusion DURE des runs futurs. 👍 : exemples few-shot pour la thèse.
export interface PickFeedback {
  down: Set<string>; // noms normalisés rejetés
  up: string[];      // noms aimés (bruts, pour le prompt)
}

export async function loadPickFeedback(
  supabase: any,
  userId: string,
): Promise<PickFeedback> {
  const down = new Set<string>();
  const up: string[] = [];
  try {
    const { data, error } = await supabase
      .from("pick_feedback")
      .select("company_name, verdict")
      .eq("user_id", userId)
      .limit(1000);
    if (error) {
      logger.warn("loadPickFeedback erreur", { error: error.message });
      return { down, up };
    }
    for (const row of data ?? []) {
      if (row.verdict === "down") {
        const n = normalizeName(row.company_name);
        if (n) down.add(n);
      } else if (row.verdict === "up" && up.length < 12) {
        up.push(row.company_name);
      }
    }
  } catch (err) {
    logger.warn("loadPickFeedback exception", { error: String(err) });
  }
  return { down, up };
}

export function isRejected(fb: PickFeedback, name: string): boolean {
  const n = normalizeName(name);
  return !!n && fb.down.has(n);
}

// Upsert : un seul avis par (utilisateur, société). Renvoie true si OK.
export async function savePickFeedback(
  supabase: any,
  userId: string,
  pipelineId: string | null,
  company: string,
  verdict: "up" | "down",
): Promise<boolean> {
  const name = (company || "").trim();
  if (name.length < 2) return false;
  try {
    const { error } = await supabase
      .from("pick_feedback")
      .upsert(
        { user_id: userId, pipeline_id: pipelineId, company_name: name, verdict },
        { onConflict: "user_id,company_name" },
      );
    if (error) {
      logger.warn("savePickFeedback erreur", { error: error.message });
      return false;
    }
    return true;
  } catch (err) {
    logger.warn("savePickFeedback exception", { error: String(err) });
    return false;
  }
}
