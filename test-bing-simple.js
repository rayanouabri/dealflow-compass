const user = "rayanoo_jbYIB";
const pass = "Azertylotfi1+";
const auth = Buffer.from(`${user}:${pass}`).toString("base64");

async function testBingVariations() {
  const tests = [
    {
      label: "Bing with q parameter",
      url: "https://www.bing.com/search?q=AI+startup",
    },
    {
      label: "Bing with search path",
      url: "https://www.bing.com/search?q=startup&count=10",
    },
    {
      label: "Plain Bing homepage",
      url: "https://www.bing.com/",
    },
  ];

  for (const test of tests) {
    console.log(`\n🔍 Testing: ${test.label}`);
    console.log(`   URL: ${test.url}`);

    try {
      const response = await fetch("https://realtime.oxylabs.io/v1/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`,
        },
        body: JSON.stringify({
          source: "bing",
          url: test.url,
          render: "html",
        }),
        timeout: 60000,
      });

      console.log(`   Status: ${response.status}`);

      if (!response.ok) {
        const text = await response.text();
        console.log(`   Error: ${text.substring(0, 150)}`);
        continue;
      }

      const data = await response.json();
      console.log(`   ✅ Job status: ${data.job?.status}`);

      if (data.results?.[0]?.content) {
        console.log(`   HTML length: ${data.results[0].content.length}`);
      } else {
        console.log(`   ❌ No HTML content`);
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message.substring(0, 100)}`);
    }
  }
}

testBingVariations();
