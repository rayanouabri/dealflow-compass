// Script de test pour l'Edge Function
// Copiez-collez ce code dans la console du navigateur (F12 → Console)

const testEdgeFunction = async () => {
  console.log("🔍 Test de l'Edge Function...\n");
  
  // 1. Vérifier les variables d'environnement
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  console.log("1️⃣ Variables d'environnement :");
  console.log("   SUPABASE_URL:", supabaseUrl || "❌ MANQUANT");
  console.log("   SUPABASE_KEY:", supabaseKey ? "✅ Configuré" : "❌ MANQUANT");
  console.log("");
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Configuration Supabase manquante !");
    console.log("   Créez un fichier .env avec :");
    console.log("   VITE_SUPABASE_URL=votre_url");
    console.log("   VITE_SUPABASE_PUBLISHABLE_KEY=votre_cle");
    return;
  }
  
  // 2. Tester l'Edge Function
  const functionUrl = `${supabaseUrl}/functions/v1/analyze-fund`;
  console.log("2️⃣ Test de l'Edge Function :");
  console.log("   URL:", functionUrl);
  console.log("");
  
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify({
        fundName: "Sequoia Capital",
        params: { numberOfStartups: 1 }
      }),
    });
    
    const text = await response.text();
    console.log("3️⃣ Réponse de l'Edge Function :");
    console.log("   Status:", response.status);
    console.log("   Response:", text);
    console.log("");
    
    if (response.ok) {
      try {
        const data = JSON.parse(text);
        console.log("✅ SUCCESS ! Données reçues :");
        console.log(data);
      } catch (e) {
        console.log("⚠️ Réponse OK mais pas JSON valide");
      }
    } else {
      try {
        const error = JSON.parse(text);
        console.error("❌ ERREUR :");
        console.error("   Message:", error.error);
        console.error("");
        console.error("🔧 Solutions possibles :");
        if (error.error?.includes("GEMINI_API_KEY") || error.error?.includes("API key")) {
          console.error("   1. Allez dans Supabase Dashboard → Secrets");
          console.error("   2. Vérifiez que GEMINI_API_KEY existe");
          console.error("   3. Redéployez la fonction après avoir ajouté le secret");
        }
      } catch (e) {
        console.error("❌ ERREUR (non-JSON) :", text);
      }
    }
  } catch (error) {
    console.error("❌ Erreur lors de l'appel :", error);
  }
};

// Exécuter le test
testEdgeFunction();

