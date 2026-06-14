const URL = "https://anxyjsgrittdwrizqcgi.supabase.co";
const SVC = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueHlqc2dyaXR0ZHdyaXpxY2dpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjMyOTM5OSwiZXhwIjoyMDgxOTA1Mzk5fQ.ATiywOXeCX847m_W8NLEV6ZencxcF4Db-NFyXH-u0rk";
const H = { "Content-Type": "application/json", apikey: SVC, Authorization: `Bearer ${SVC}` };
const thesis = { sectors: ["Deeptech", "IA / Machine Learning"], stages: ["Seed", "Série A", "Série B"], geography: "France" };

async function getJob(id) { const r = await fetch(`${URL}/rest/v1/pipeline_jobs?id=eq.${id}&select=*`, { headers: H }); return (await r.json())[0]; }

(async () => {
  const res = await fetch(`${URL}/functions/v1/pipeline-orchestrator`, { method: "POST", headers: H, body: JSON.stringify({ action: "start", customThesis: thesis }) });
  const { pipelineId } = await res.json();
  console.log("Pipeline:", pipelineId);
  const start = Date.now(); let last = "";
  while (Date.now() - start < 290000) {
    const j = await getJob(pipelineId);
    if (j.status !== last) { console.log(`[${((Date.now()-start)/1000).toFixed(0)}s] ${j.status}`); last = j.status; }
    if (j.status === "error") { console.log("ERROR:", j.error_message); return; }
    if (j.status === "dd_done") {
      const sr = j.sourcing_results || [];
      const cats = {};
      for (const c of sr) for (const cat of (c.categories||[])) cats[cat] = (cats[cat]||0)+1;
      console.log("\nSOURCE MIX:", JSON.stringify(cats));
      console.log("\nSHORTLIST:");
      (j.shortlist||[]).slice(0,6).forEach(s => console.log(`  - ${s.name} | total=${s.totalWeighted} fit=${s.scores?.thesisFit} | drStage=${s.dealroomStage||'-'} | [${(s.categories||[]).join(',')}]`));
      const p = j.picked_startup;
      console.log(`\nPICK: ${p?.name} (total ${p?.totalWeighted}, fit ${p?.scores?.thesisFit}, drStage ${p?.dealroomStage||'-'})`);
      console.log("FINAL OK");
      return;
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  console.log("TIMEOUT");
})().catch(e => console.error("ERR", e.message));
