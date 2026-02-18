# Variables d'environnement Vercel

Pour que l’app (Sourcing + Due Diligence) fonctionne en production, configure dans **Vercel** → projet → **Settings** → **Environment Variables** :

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase (ex. `https://xxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé anon / publishable du projet Supabase |

Sans ces deux variables, la page affiche « Configuration Supabase manquante ». Après ajout, redéployer (redeploy) le projet.
