// Query-level cache for web searches (Serper/Brave), backed by the search_cache table.
// Goal: avoid paying for identical searches across analyses (same fund thesis, same
// market/sector queries, repeat due-diligence on the same company). Zero quality loss:
// cached rows are the exact same search results, just served from Postgres.

const DEFAULT_TTL_DAYS = 14;

async function hashQuery(query: string, count: number): Promise<string> {
  const data = new TextEncoder().encode(`${count}|${query.trim().toLowerCase()}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getCachedSearch<T = unknown>(query: string, count: number): Promise<T[] | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  try {
    const h = await hashQuery(query, count);
    const res = await fetch(
      `${url}/rest/v1/search_cache?query_hash=eq.${h}&select=results,expires_at`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) return null;
    return (row.results as T[]) ?? null;
  } catch {
    return null;
  }
}

export async function setCachedSearch(
  query: string,
  count: number,
  results: unknown[],
  ttlDays: number = DEFAULT_TTL_DAYS,
): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  // Never cache empty results — a transient API failure must not poison the cache.
  if (!Array.isArray(results) || results.length === 0) return;
  try {
    const h = await hashQuery(query, count);
    const expires = new Date(Date.now() + ttlDays * 86400_000).toISOString();
    await fetch(`${url}/rest/v1/search_cache`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        query_hash: h,
        query: query.slice(0, 500),
        result_count: results.length,
        results,
        expires_at: expires,
      }),
    });
  } catch {
    // Cache write failures are non-fatal.
  }
}
