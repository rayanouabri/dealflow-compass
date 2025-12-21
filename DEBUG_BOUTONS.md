# 🐛 Debug : Les Boutons Ne Fonctionnent Pas

## 🔍 Vérifications à Faire

### 1. Ouvrir la Console du Navigateur

1. **Ouvrez votre application** : `http://localhost:8080`
2. **Appuyez sur F12** (ou Clic droit → Inspecter)
3. **Allez dans l'onglet "Console"**

### 2. Tester les Boutons

1. **Cliquez sur un bouton** (ex: "Essai gratuit" ou "Démarrer le sourcing IA")
2. **Regardez la console** :
   - ✅ Vous devriez voir : `handleStartTrial called, user: null` (ou un objet user)
   - ✅ Vous devriez voir : `No user, opening signup dialog` (si pas connecté)
   - ❌ Si vous ne voyez RIEN → Le bouton ne déclenche pas l'événement

### 3. Vérifier les Erreurs

**Dans la console, cherchez des erreurs en rouge** :
- ❌ `Cannot read property '...' of undefined`
- ❌ `onStartTrial is not a function`
- ❌ `TypeError: ...`
- ❌ Erreurs React

**Copiez-collez ces erreurs** pour que je puisse les corriger.

---

## 🔧 Solutions Possibles

### Problème 1 : Les boutons ne déclenchent rien

**Symptômes** :
- Aucun log dans la console quand vous cliquez
- Le bouton ne réagit pas visuellement

**Solutions** :
1. **Vérifiez que le serveur tourne** :
   ```bash
   npm run dev
   ```

2. **Rechargez la page** (Ctrl+R ou F5)

3. **Vérifiez que vous êtes sur la landing page** :
   - L'URL devrait être `http://localhost:8080/`
   - Vous devriez voir "Sourcez les meilleures opportunités..."

### Problème 2 : Erreur "onStartTrial is not a function"

**Symptômes** :
- Erreur dans la console : `onStartTrial is not a function`
- Le bouton ne fonctionne pas

**Solution** :
- Vérifiez que `LandingPage` reçoit bien les props `onStartTrial` et `onLogin`
- Vérifiez dans `Index.tsx` que `handleStartTrial` et `handleLogin` sont bien définis

### Problème 3 : Le dialog s'ouvre mais ne se ferme pas après connexion

**Symptômes** :
- Le dialog d'auth s'ouvre correctement
- Après connexion/inscription, le dialog reste ouvert
- Pas de redirection vers "analyzer"

**Solutions** :
1. **Vérifiez dans la console** :
   - Vous devriez voir : `AuthDialog: handleSuccess called`
   - Vous devriez voir : `Auth success callback, user: ...`
   - Vous devriez voir : `User logged in, redirecting to analyzer`

2. **Vérifiez que Email Auth est activé** dans Supabase :
   - Authentication → Sign In / Providers → Email → Toggle ON

3. **Vérifiez que "Confirm email" est désactivé** (pour le dev) :
   - Authentication → Sign In / Providers → Email → "Confirm email" → Toggle OFF

### Problème 4 : Redirection ne fonctionne pas

**Symptômes** :
- Connexion réussie
- Dialog se ferme
- Mais reste sur la landing page

**Solutions** :
1. **Attendez 1-2 secondes** après connexion (le useEffect a un délai)

2. **Vérifiez dans la console** :
   - `User logged in, redirecting to analyzer` devrait apparaître

3. **Vérifiez manuellement** :
   - Après connexion, regardez si `user` est bien défini dans le state
   - Dans la console, tapez : `window.location.reload()` pour forcer un rechargement

---

## 🧪 Test Manuel

### Test 1 : Vérifier que les fonctions sont appelées

1. **Ouvrez la console** (F12)
2. **Cliquez sur "Essai gratuit"**
3. **Vous devriez voir** :
   ```
   handleStartTrial called, user: null
   No user, opening signup dialog
   ```

### Test 2 : Vérifier l'ouverture du dialog

1. **Cliquez sur "Essai gratuit"**
2. **Le dialog devrait s'ouvrir** avec le formulaire d'inscription
3. **Si le dialog ne s'ouvre pas** :
   - Vérifiez dans la console s'il y a des erreurs
   - Vérifiez que `showAuthDialog` est bien `true` dans le state

### Test 3 : Vérifier la connexion

1. **Ouvrez le dialog** (cliquez sur "Essai gratuit")
2. **Créez un compte** ou **connectez-vous**
3. **Regardez la console** :
   - Vous devriez voir plusieurs logs
   - Le dialog devrait se fermer
   - Vous devriez être redirigé vers "analyzer"

---

## 📝 Informations à Me Donner

Si les boutons ne fonctionnent toujours pas, donnez-moi :

1. **Les erreurs de la console** (copiez-collez tout ce qui est en rouge)
2. **Ce qui se passe quand vous cliquez** :
   - Rien ne se passe ?
   - Le dialog s'ouvre mais ne se ferme pas ?
   - Une erreur apparaît ?
3. **Les logs dans la console** quand vous cliquez sur un bouton

---

## 🔄 Solution Rapide : Recharger Tout

Si rien ne fonctionne, essayez :

1. **Arrêtez le serveur** (Ctrl+C dans le terminal)
2. **Supprimez le cache** :
   ```bash
   rm -rf node_modules/.vite
   ```
3. **Redémarrez** :
   ```bash
   npm run dev
   ```
4. **Rechargez la page** (Ctrl+Shift+R pour forcer le rechargement)

---

## ✅ Checklist de Vérification

- [ ] Le serveur `npm run dev` tourne
- [ ] Je suis sur `http://localhost:8080/`
- [ ] La console est ouverte (F12)
- [ ] Je vois des logs quand je clique sur les boutons
- [ ] Email Auth est activé dans Supabase
- [ ] "Confirm email" est désactivé (pour le dev)
- [ ] Aucune erreur rouge dans la console

Une fois ces vérifications faites, dites-moi ce que vous voyez dans la console ! 🔍

