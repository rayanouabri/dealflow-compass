# Guide déploiement SearXNG — Recherche illimitée et gratuite

SearXNG est un méta-moteur open source qui agrège Google, Bing, DuckDuckGo, Brave, etc.
Tu le déploies sur ton propre serveur : **illimité, sans API key, ~4€/mois**.

## Architecture

```
Supabase Edge Function
       │
       │  GET /search?q=...&format=json
       ▼
 [Ton VPS SearXNG]  ←── aggrège
       ├── Google
       ├── Bing
       ├── DuckDuckGo
       └── Brave
```

---

## 1. Créer un VPS

### Option recommandée : Hetzner (le moins cher)

1. Va sur https://www.hetzner.com/cloud
2. Crée un compte
3. "Create Server" :
   - **Location** : Falkenstein (EU)
   - **OS** : Ubuntu 24.04
   - **Type** : CX11 (2 vCPU, 2 GB RAM) = **3.29€/mois**
4. Ajoute une clé SSH ou note le mot de passe root

### Autres options
- **OVH** : VPS Starter ~3€/mois
- **Scaleway** : STARDUST ~0.36€/mois (très limité RAM)
- **DigitalOcean** : Droplet Basic ~4$/mois

---

## 2. Se connecter au VPS

```bash
ssh root@<IP_DU_VPS>
```

---

## 3. Installer Docker

```bash
# Installer Docker en une ligne
curl -fsSL https://get.docker.com | sh

# Vérifier
docker --version
```

---

## 4. Déployer SearXNG avec Docker Compose

```bash
# Créer le dossier
mkdir -p /opt/searxng && cd /opt/searxng

# Créer docker-compose.yml
cat > docker-compose.yml << 'EOF'
services:
  searxng:
    image: searxng/searxng:latest
    container_name: searxng
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./searxng:/etc/searxng:rw
    environment:
      - SEARXNG_BASE_URL=https://search.${DOMAIN:-localhost}
      - SEARXNG_SECRET_KEY=$(openssl rand -hex 32)
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
EOF

# Démarrer SearXNG
docker compose up -d

# Vérifier que ça tourne
docker compose logs -f
```

---

## 5. Activer le format JSON (obligatoire pour l'API)

```bash
# Créer le fichier de config
mkdir -p /opt/searxng/searxng
cat > /opt/searxng/searxng/settings.yml << 'EOF'
use_default_settings: true

server:
  secret_key: "CHANGE_MOI_PAR_UNE_CHAINE_ALEATOIRE"
  limiter: false  # Désactive le rate limiting (tu es le seul utilisateur)
  image_proxy: false

search:
  safe_search: 0
  autocomplete: ""
  default_lang: "fr"

engines:
  - name: google
    engine: google
    disabled: false
    timeout: 6.0
  - name: bing
    engine: bing
    disabled: false
    timeout: 6.0
  - name: duckduckgo
    engine: duckduckgo
    disabled: false
    timeout: 6.0

outgoing:
  request_timeout: 6.0
  useragent_suffix: ""
  pool_connections: 100
  pool_maxsize: 20

result_proxy:
  url: ""

ui:
  static_use_hash: true

# Activer l'API JSON
enabled_plugins:
  - 'Hash plugin'
  - 'Search on category select'
  - 'Self Informations'
  - 'Tracker URL remover'
  - 'Ahmia blacklist'
EOF

# Redémarrer pour appliquer la config
docker compose restart
```

---

## 6. Tester en local

```bash
# Depuis le VPS
curl "http://localhost:8080/search?q=test&format=json" | head -200
```

Tu dois voir du JSON avec un champ `results`.

---

## 7. Exposer via HTTPS avec Caddy (reverse proxy)

```bash
# Installer Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# Pointer un domaine vers l'IP du VPS (chez ton registrar)
# Ex: search.mondomaine.com → A → <IP_DU_VPS>

# Configurer Caddy
cat > /etc/caddy/Caddyfile << 'EOF'
search.mondomaine.com {
  reverse_proxy localhost:8080

  # Sécurité basique : token secret pour éviter que n'importe qui utilise ton instance
  @unauthorized {
    not header X-Api-Key ton_token_secret_ici
    not path /search*
  }
}
EOF

# Démarrer Caddy (gère le SSL automatiquement)
systemctl enable caddy && systemctl start caddy
```

---

## 8. Ajouter la variable d'environnement dans Supabase

Dans le [dashboard Supabase](https://supabase.com/dashboard/project/anxyjsgrittdwrizqcgi/functions/secrets) :

```
SEARXNG_URL = https://search.mondomaine.com
```

C'est tout. Le code dans `search-client.ts` utilise automatiquement SearXNG en priorité dès que `SEARXNG_URL` est défini.

---

## 9. Tester depuis une Edge Function

```bash
curl -X POST https://anxyjsgrittdwrizqcgi.supabase.co/functions/v1/pipeline-orchestrator \
  -H "Authorization: Bearer <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "fundName": "Accel"}'
```

---

## Coût total

| Élément | Coût |
|---|---|
| VPS Hetzner CX11 | 3.29€/mois |
| Domaine (optionnel) | ~10€/an = 0.83€/mois |
| SSL (Let's Encrypt via Caddy) | Gratuit |
| SearXNG | Gratuit |
| Brave API / Serper | 0€ (utilisés en fallback uniquement) |
| **Total** | **~4€/mois** |

---

## Sans domaine (option simple)

Si tu ne veux pas de domaine, tu peux utiliser l'IP directement en HTTP :

```
SEARXNG_URL = http://<IP_DU_VPS>:8080
```

⚠️ Sans HTTPS, les requêtes ne sont pas chiffrées. OK pour un usage perso/interne.

---

## Maintenance

```bash
# Mettre à jour SearXNG
cd /opt/searxng
docker compose pull && docker compose up -d

# Voir les logs
docker compose logs -f searxng

# Redémarrer en cas de problème
docker compose restart
```

---

## Sécurité

Par défaut, ton instance est publique. Pour la rendre privée, ajoute un token dans `settings.yml` :

```yaml
server:
  secret_key: "CHANGE_MOI"
  # Rate limiting désactivé (usage privé)
  limiter: false
```

Et dans `search-client.ts`, le header `X-Requested-With: dealflow-compass` identifie l'appelant dans les logs SearXNG.

Pour une sécurité renforcée, configure Caddy avec un token d'API (voir étape 7).
