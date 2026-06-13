const user = "rayanoo_jbYIB";
const pass = "Azertylotfi1+";
const auth = Buffer.from(`${user}:${pass}`).toString("base64");

function parseBingResults(html) {
  const results = [];

  // Bing search results are in <li> with data-bm attributes
  const listItems = html.match(/<li[^>]*data-bm[^>]*>[\s\S]*?(?=<\/li>)/gi) || [];
  console.log(`   Found ${listItems.length} <li> elements with data-bm`);

  for (const item of listItems.slice(0, 20)) {
    // Find title in <h2> or <a>
    const titleMatch = item.match(/<h2[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) ||
                       item.match(/<a[^>]*title="([^"]+)"/i) ||
                       item.match(/<h2[^>]*>([^<]+)<\/h2>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Find URL - Bing uses href attribute
    const urlMatch = item.match(/<a[^>]*href="([^"]+)"/);
    let url = urlMatch ? urlMatch[1] : "";

    // Skip Bing's own pages and tracking links
    if (url.startsWith("/") || url.includes("bing.com") || !url.startsWith("http")) {
      continue;
    }

    // Find description
    const descMatch = item.match(/<p[^>]*>([^<]+)<\/p>/i);
    const description = descMatch ? descMatch[1].trim() : "";

    if (title && url) {
      results.push({ title, url, description });
    }
  }

  return results;
}

async function testBingFinal() {
  console.log("🧪 Final Bing + Oxylabs Integration Test\n");

  const query = "AI startup France";
  const bingQuery = query.replace(/ /g, "+");
  const searchUrl = `https://www.bing.com/search?q=${bingQuery}`;

  console.log(`Query: "${query}"`);
  console.log(`Bing URL: ${searchUrl}\n`);

  try {
    const response = await fetch("https://realtime.oxylabs.io/v1/queries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        source: "bing",
        url: searchUrl,
        render: "html",
      }),
      timeout: 60000,
    });

    console.log(`Oxylabs response: ${response.status}`);

    if (!response.ok) {
      const text = await response.text();
      console.log(`❌ Error: ${text}`);
      return;
    }

    const data = await response.json();
    console.log(`Job status: ${data.job?.status}`);

    if (!data.results?.[0]?.content) {
      console.log(`❌ No HTML content`);
      return;
    }

    const html = data.results[0].content;
    console.log(`HTML size: ${html.length} bytes`);

    const parsed = parseBingResults(html);
    console.log(`\n✅ Parsed ${parsed.length} results:\n`);

    parsed.slice(0, 8).forEach((r, i) => {
      console.log(`[${i + 1}] ${r.title}`);
      console.log(`    ${r.url}`);
      if (r.description) {
        console.log(`    "${r.description.substring(0, 100)}${r.description.length > 100 ? "..." : ""}"`);
      }
      console.log();
    });

    if (parsed.length === 0) {
      console.log("⚠️  No results parsed. Checking HTML structure...");
      console.log(`First 500 chars of HTML:`);
      console.log(html.substring(0, 500));
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

testBingFinal();
