# 🔧 Fix : Erreur 402 "Payment required" Azure OpenAI

## 🎯 Problème

L'erreur **402 "Payment required"** signifie que votre ressource Azure OpenAI nécessite :
- Soit l'activation de la facturation
- Soit que les crédits sont épuisés
- Soit que la facturation n'est pas liée à votre abonnement

## ✅ Solutions

### Solution 1 : Vérifier la Facturation Azure

1. **Allez sur Azure Portal** : https://portal.azure.com
2. **Trouvez votre ressource Azure OpenAI**
3. **Vérifiez la facturation** :
   - Allez dans "Usage and estimated costs" ou "Utilisation et coûts estimés"
   - Vérifiez que votre abonnement a des crédits disponibles
   - Vérifiez que la facturation est activée

### Solution 2 : Activer la Facturation (Si nécessaire)

1. **Dans Azure Portal**, allez dans votre ressource Azure OpenAI
2. **Settings > Billing** ou **Paramètres > Facturation**
3. **Activez la facturation** si elle n'est pas activée
4. **Liez votre abonnement** avec les 80€ de crédit

### Solution 3 : Vérifier le Déploiement du Modèle

1. **Dans Azure Portal**, votre ressource Azure OpenAI
2. **Model deployments** ou **Déploiements de modèles**
3. **Vérifiez que `gpt-4o-mini` existe** :
   - Si non, créez-le :
     - Model name : `gpt-4o-mini`
     - Deployment name : `gpt-4o-mini`
   - Si oui, vérifiez qu'il est actif

### Solution 4 : Vérifier les Crédits Azure

1. **Azure Portal > Subscriptions**
2. **Sélectionnez votre abonnement**
3. **Vérifiez les crédits disponibles**
4. **Vérifiez que les crédits sont bien liés à Azure OpenAI**

## 🔍 Diagnostic

Pour vérifier exactement le problème :

1. **Allez sur Azure Portal**
2. **Votre ressource Azure OpenAI**
3. **Logs** ou **Activity log**
4. **Cherchez les erreurs récentes**

## 💡 Astuce

Si vous avez 80€ de crédit Azure mais que l'erreur persiste :
- Les crédits Azure peuvent ne pas être automatiquement liés à Azure OpenAI
- Il faut parfois activer explicitement la facturation pour Azure OpenAI
- Vérifiez que votre abonnement Azure a bien les crédits disponibles

## 📚 Ressources

- [Documentation Azure OpenAI Billing](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/manage-billing)
- [Azure Portal](https://portal.azure.com)

---

**Une fois la facturation activée, attendez 1-2 minutes et réessayez.**

