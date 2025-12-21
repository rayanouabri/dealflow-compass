# 📧 Guide Détaillé : Activer Email Auth dans Supabase

## 🎯 Objectif
Activer l'authentification par email pour permettre aux utilisateurs de s'inscrire et se connecter avec email + mot de passe.

---

## 📋 Étape par Étape

### Étape 1 : Accéder à la Configuration Authentication

1. **Allez sur** : [https://app.supabase.com](https://app.supabase.com)
2. **Connectez-vous** avec votre compte Supabase
3. **Sélectionnez votre projet** (celui avec l'URL `anxyjsgrittdwrizqcgi.supabase.co`)
4. **Dans le menu de gauche**, cliquez sur **"Authentication"** (icône avec une clé 🔑)

---

### Étape 2 : Accéder aux Providers

1. **Dans le menu de gauche** (sous "Authentication"), vous verrez plusieurs sections :
   - **Users**
   - **OAuth Apps**
   - **NOTIFICATIONS** (avec "Email" dedans)
   - **CONFIGURATION**

2. **Cliquez sur "Sign In / Providers"** dans la section **CONFIGURATION**

   > 💡 **Alternative** : Vous pouvez aussi cliquer directement sur **"Providers"** si vous le voyez dans le menu

---

### Étape 3 : Activer Email Provider

1. **Vous verrez une liste de providers** :
   - Email
   - Google
   - GitHub
   - Apple
   - etc.

2. **Trouvez "Email"** dans la liste (généralement le premier)

3. **Cliquez sur "Email"** pour ouvrir ses paramètres

4. **Activez le toggle** (bouton ON/OFF) à côté de "Enable Email provider"

   > ✅ **Le toggle doit être vert/activé** pour que l'authentification par email fonctionne

---

### Étape 4 : Configurer les Options Email (Optionnel mais Recommandé)

#### Pour le Développement (Test Rapide) :

1. **Désactivez "Confirm email"** :
   - Cherchez l'option **"Confirm email"** ou **"Email confirmation"**
   - **Désactivez le toggle** (OFF)
   - ⚠️ **Pourquoi ?** : Cela permet de tester rapidement sans avoir à confirmer l'email à chaque inscription

#### Pour la Production :

1. **Activez "Confirm email"** :
   - **Activez le toggle** (ON)
   - ⚠️ **Important** : Les utilisateurs devront confirmer leur email avant de pouvoir se connecter

2. **Configurez les templates d'email** (optionnel) :
   - Allez dans **"Authentication"** → **"Emails"** → **"Templates"**
   - Personnalisez les emails de confirmation, reset password, etc.

---

### Étape 5 : Vérifier que c'est Activé

1. **Retournez sur la page "Sign In / Providers"**
2. **Vérifiez que** :
   - ✅ Le toggle "Email" est **vert/activé**
   - ✅ Vous voyez les options de configuration (Confirm email, etc.)

---

### Étape 6 : Tester dans l'Application

1. **Démarrez votre application** :
   ```bash
   npm run dev
   ```

2. **Allez sur** : `http://localhost:8080`

3. **Testez l'inscription** :
   - Cliquez sur "Créer un compte" ou "Essai gratuit"
   - Entrez un email et un mot de passe
   - Cliquez sur "Créer un compte"

4. **Si "Confirm email" est désactivé** :
   - ✅ Vous devriez être connecté immédiatement
   - ✅ Vous devriez être redirigé vers la page "analyzer"

5. **Si "Confirm email" est activé** :
   - 📧 Vous recevrez un email de confirmation
   - Cliquez sur le lien dans l'email
   - ✅ Vous serez ensuite connecté

---

## 🐛 Dépannage

### Problème : Le toggle "Email" ne s'active pas

**Solution** :
1. Rafraîchissez la page (F5)
2. Vérifiez que vous êtes bien connecté à Supabase
3. Vérifiez que vous avez les permissions admin sur le projet

### Problème : L'inscription ne fonctionne pas

**Vérifications** :
1. ✅ Le provider "Email" est bien activé
2. ✅ Les variables d'environnement sont correctes dans `.env`
3. ✅ Le serveur de développement est redémarré après modification du `.env`

### Problème : "Email confirmation required" même si désactivé

**Solution** :
1. Vérifiez que vous avez bien désactivé "Confirm email" dans les settings
2. Attendez quelques secondes (propagation)
3. Réessayez l'inscription

### Problème : Pas d'email reçu (si confirmation activée)

**Vérifications** :
1. Vérifiez votre dossier spam
2. Vérifiez que l'email est correct
3. Dans Supabase Dashboard → **Authentication** → **Emails** → **SMTP Settings** :
   - Par défaut, Supabase utilise un service email limité
   - Pour la production, configurez un SMTP personnalisé

---

## 📸 Capture d'Écran (Référence)

D'après votre capture d'écran, vous êtes actuellement sur la page **"Emails"** → **"Templates"**.

Pour activer Email Auth, vous devez :

1. **Cliquez sur "Sign In / Providers"** dans le menu de gauche (section CONFIGURATION)
2. **Activez le toggle "Email"**

---

## ✅ Checklist

- [ ] J'ai accédé à Authentication → Sign In / Providers
- [ ] J'ai activé le toggle "Email"
- [ ] J'ai configuré "Confirm email" selon mes besoins (OFF pour dev, ON pour prod)
- [ ] J'ai testé l'inscription dans l'application
- [ ] L'inscription fonctionne correctement

---

## 📚 Ressources

- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
- [Configuration Email Provider](https://supabase.com/docs/guides/auth/auth-email)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)

---

## 🎯 Résumé Rapide

1. **Supabase Dashboard** → **Authentication** → **Sign In / Providers**
2. **Cliquez sur "Email"**
3. **Activez le toggle** (ON)
4. **Configurez "Confirm email"** (OFF pour dev, ON pour prod)
5. **Testez dans l'application**

C'est tout ! 🎉

