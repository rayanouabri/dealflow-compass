// Test Bing HTML parsing
const user = "rayanoo_jbYIB";
const pass = "Azertylotfi1+";
const auth = Buffer.from(`${user}:${pass}`).toString("base64");

function parseBingResults(html) {
  const results = [];

  // Bing search results are in <li> with data-bm attributes
  const listItems = html.match(/<li[^>]*data-bm[^>]*>[\s\S]*?(?=<\/li>)/gi) || [];

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

async function testBingParsing() {
  console.log("🔍 Fetching Bing results for 'AI startup France'...\n");

  try {
    const response = await fetch("https://realtime.oxylabs.io/v1/queries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        source: "bing",
        url: "https://www.bing.com/search?q=AI%20startup%20France&count=10",
        render: "html",
      }),
      timeout: 60000,
    });

    if (response.status !== 200) {
      const text = await response.text();
      console.log(`❌ Error (${response.status}):`, text.substring(0, 200));
      return;
    }

    const data = await response.json();
    console.log("✅ Oxylabs succeeded");
    console.log("   Job status:", data.job?.status);

    if (data.results?.[0]?.content) {
      const html = data.results[0].content;
      const parsed = parseBingResults(html);

      console.log(`\n📊 Parsed ${parsed.length} results:`);
      parsed.slice(0, 5).forEach((r, i) => {
        console.log(`\n  [${i + 1}] ${r.title}`);
        console.log(`      ${r.url}`);
        if (r.description) console.log(`      ${r.description.substring(0, 80)}...`);
      });
    } else {
      console.log("❌ No HTML content in response");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

testBingParsing();
