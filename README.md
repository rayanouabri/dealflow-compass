# DealFlow Compass

**AI-Powered Startup Sourcing & Due Diligence Platform for VC Funds**

DealFlow Compass est une plateforme SaaS qui aide les fonds VC à automatiser leur sourcing de startups et à effectuer des due diligences approfondies grâce à l'IA.

## 🚀 Configuration Supabase

### 1. Créer un projet Supabase

1. Allez sur [https://app.supabase.com](https://app.supabase.com)
2. Créez un nouveau projet
3. Notez votre **Project URL** et votre **anon/public key** dans Settings > API

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=https://votre-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=votre_anon_key_ici
LOVABLE_API_KEY=votre_lovable_api_key_ici
```

Vous pouvez copier `env.example` et remplir les valeurs :

```bash
cp env.example .env
```

### 3. Appliquer les migrations

Les migrations Supabase sont dans `supabase/migrations/`. Elles créent automatiquement :
- La table `analysis_history` pour stocker les analyses
- Les politiques RLS (Row Level Security)
- Les index pour les performances

### 4. Déployer l'Edge Function

L'Edge Function `analyze-fund` est déjà déployée automatiquement ! ✅

### 5. Configurer les secrets de l'Edge Function

**Option GRATUITE (Recommandée)** : Utiliser Google Gemini API

1. Obtenez une clé API Gemini gratuite : [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Dans Supabase Dashboard > **Edge Functions** > **analyze-fund** > **Settings** > **Secrets**
3. Ajoutez le secret `GEMINI_API_KEY` avec votre clé API Gemini

> 💡 **Gratuit** : Gemini offre 15 requêtes/minute et 1,500 requêtes/jour gratuitement !

Voir le guide complet : [GEMINI_SETUP.md](./GEMINI_SETUP.md)

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

L'application sera accessible sur **http://localhost:8080**

## 🛠️ Technologies utilisées

- **Frontend**: React + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **IA**: Google Gemini API (Gratuit - 15 req/min)

## 📝 Comment éditer ce code ?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
