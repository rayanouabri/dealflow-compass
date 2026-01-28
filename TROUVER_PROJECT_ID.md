# 🔍 Comment Trouver le PROJECT_ID Google Cloud

## Méthode 1 : Depuis le Header (Le Plus Simple)

1. Allez sur https://console.cloud.google.com/
2. En haut à gauche, vous voyez le **nom de votre projet** (ex: "Mon Projet")
3. **Cliquez sur le nom du projet**
4. Un menu déroulant s'ouvre
5. Le **Project ID** est affiché juste en dessous (ex: `my-project-123456`)
6. **Copiez ce Project ID**

## Méthode 2 : Depuis les Settings

1. Menu ☰ (en haut à gauche)
2. **IAM & Admin** → **Settings**
3. Le **Project ID** est affiché en haut de la page
4. **Copiez ce Project ID**

## Méthode 3 : Depuis l'URL

Quand vous êtes dans Google Cloud Console, l'URL contient le Project ID :
```
https://console.cloud.google.com/apis/dashboard?project=MON-PROJECT-ID
                                                          ^^^^^^^^^^^^^^
                                                          C'est ça !
```

## ⚠️ Important

- Le **Project ID** est différent du **Project Name**
- Le Project ID ressemble à : `my-project-123456` ou `vertex-ai-demo`
- Le Project Name peut être : "Mon Projet Vertex AI"
- **Utilisez toujours le Project ID** dans les secrets Supabase

## Exemple

Si votre projet s'appelle "Dealflow Compass AI" mais que le Project ID est `dealflow-ai-789012`, utilisez :
```
VERTEX_AI_PROJECT_ID = dealflow-ai-789012
```

Pas :
```
VERTEX_AI_PROJECT_ID = Dealflow Compass AI  ❌
```
