# 🔑 Quelle Clé Utiliser : anon ou service_role ?

## ✅ Réponse Rapide

**Pour votre application frontend, utilisez TOUJOURS la clé `anon` (publique).**

❌ **NE JAMAIS** utiliser la clé `service_role` dans le frontend !

---

## 📋 Les Deux Types de Clés dans Supabase

### 1. **anon key** (Clé Publique) ✅ À UTILISER

- **Où la trouver** : Settings → API → `anon` `public` key
- **Format** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (longue chaîne)
- **Sécurité** : Peut être exposée dans le frontend (c'est fait pour ça)
- **Permissions** : Respecte les Row Level Security (RLS)
- **Usage** : Frontend React, applications clientes

### 2. **service_role key** (Clé Secrète) ❌ NE JAMAIS UTILISER DANS LE FRONTEND

- **Où la trouver** : Settings → API → `service_role` `secret` key
- **Format** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (longue chaîne différente)
- **Sécurité** : ⚠️ **TRÈS SECRÈTE** - Ne jamais exposer !
- **Permissions** : Bypass toutes les règles RLS (accès total)
- **Usage** : Backend uniquement, Edge Functions, scripts serveur

---

## 🎯 Pour Votre Application

### Dans le fichier `.env` :

```env
# ✅ CORRECT - Utilisez anon key
VITE_SUPABASE_URL=https://votre-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # anon key

# ❌ INCORRECT - Ne jamais mettre service_role ici
# VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # service_role (DANGER!)
```

### Dans Supabase Dashboard :

1. **Allez dans** : Settings → API
2. **Vous verrez deux clés** :
   - **`anon` `public`** ← **C'EST CELLE-CI** pour le frontend
   - **`service_role` `secret`** ← Ne jamais utiliser dans le frontend

---

## 📝 Exemple Concret

### ✅ Bon Usage (Frontend)

```typescript
// src/integrations/supabase/client.ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY; // anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
```

### ❌ Mauvais Usage (NE JAMAIS FAIRE)

```typescript
// ❌ DANGER - Ne jamais faire ça !
const SUPABASE_PUBLISHABLE_KEY = "service_role_key_ici"; // ⚠️ TRÈS DANGEREUX
```

---

## 🔒 Pourquoi ?

### Clé `anon` (Publique) :
- ✅ Sécurisée pour le frontend
- ✅ Respecte les règles RLS
- ✅ Limite les permissions
- ✅ Peut être commitée dans Git (pas de problème)

### Clé `service_role` (Secrète) :
- ❌ Donne accès TOTAL à la base de données
- ❌ Bypass toutes les règles de sécurité
- ❌ Si exposée, n'importe qui peut modifier/supprimer vos données
- ❌ Ne JAMAIS commitée dans Git

---

## ✅ Checklist

Quand vous configurez votre `.env` :

- [ ] J'utilise la clé `anon` `public` (pas `service_role`)
- [ ] La clé commence par `eyJhbG...`
- [ ] Je l'ai copiée depuis Settings → API → `anon` `public`
- [ ] Je ne l'ai pas mise dans le code source directement
- [ ] Elle est dans le fichier `.env` (qui est dans `.gitignore`)

---

## 🆘 Si Vous Avez Utilisé la Mauvaise Clé

Si vous avez accidentellement utilisé `service_role` dans le frontend :

1. **Régénérez la clé** : Settings → API → Regenerate `service_role` key
2. **Mettez à jour** votre `.env` avec la bonne clé `anon`
3. **Redémarrez** votre serveur

---

## 📚 Résumé

| Clé | Usage | Sécurité | Où l'utiliser |
|-----|-------|----------|---------------|
| **anon** (public) | Frontend | ✅ Sécurisée | `.env` pour frontend |
| **service_role** (secret) | Backend uniquement | ⚠️ Très sensible | Edge Functions, scripts serveur |

**Pour votre application DealFlow Compass, utilisez TOUJOURS la clé `anon` !** ✅

