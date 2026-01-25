# 🤖 OÙ TROUVER LE CHATBOT ?

## ❌ ERREUR COURANTE

**Le chatbot N'EST PAS sur la page d'accueil !**

Il n'apparaît QUE après avoir lancé une analyse.

---

## ✅ ÉTAPES POUR VOIR LE CHATBOT

### 1️⃣ Allez sur l'application
https://ai-vc-sourcing.vercel.app

### 2️⃣ Lancez une analyse
- Tapez "Sequoia Capital" dans la barre de recherche
- Cliquez "Search"
- **Attendez 30-60 secondes** que l'analyse se termine

### 3️⃣ Trouvez l'onglet "Assistant IA"
Une fois l'analyse terminée, vous verrez **2 onglets en haut** :
- 📊 **Rapport d'Analyse** (onglet par défaut)
- 🤖 **Assistant IA** ← **CLIQUEZ ICI !**

### 4️⃣ Utilisez le chatbot
- Dans l'onglet "Assistant IA", vous verrez :
  - Un champ de texte en bas
  - Une zone de conversation
- **Posez une question** : "Quels sont les risques ?"
- **Attendez la réponse** (5-10 secondes)

---

## 🎯 CE QUE VOUS DEVRIEZ VOIR

```
┌─────────────────────────────────────────┐
│ Rapport d'Analyse  │  Assistant IA ✓    │  ← Cliquez ici
├─────────────────────────────────────────┤
│                                         │
│  🤖 AI Assistant                        │
│  Posez vos questions sur cette startup │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🤖 Bonjour ! Comment puis-je...   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Vous: Quels sont les risques ?    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 🤖 Voici les principaux risques...│ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Posez votre question... [Envoyer] │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🚨 SI ÇA NE MARCHE TOUJOURS PAS

### Vérifiez dans la console (F12) :

1. **Ouvrez la console** : Appuyez sur `F12`
2. **Onglet "Console"**
3. **Cherchez des erreurs** en rouge

**Erreurs possibles** :

| Erreur | Solution |
|--------|----------|
| `CORS policy` | Les secrets Vertex AI ne sont pas bien configurés dans Supabase |
| `Failed to fetch` | La fonction ai-qa n'est pas déployée |
| `No AI provider` | Les secrets manquent dans Supabase |

### Vérifiez les logs Supabase :

**Allez ici** : https://supabase.com/dashboard/project/anxyjsgrittdwrizqcgi/functions/ai-qa/logs

**Cherchez** :
- ✅ Lignes vertes = succès
- ❌ Lignes rouges = erreurs

**Si erreur** : Copiez le message d'erreur exact.

---

## 🎬 RÉCAPITULATIF RAPIDE

1. Lancez une analyse de "Sequoia Capital"
2. Attendez la fin de l'analyse
3. Cliquez sur l'onglet **"Assistant IA"**
4. Posez une question
5. Si erreur → Vérifiez console (F12) et logs Supabase

**Le chatbot DOIT apparaître dans l'onglet "Assistant IA" !**
