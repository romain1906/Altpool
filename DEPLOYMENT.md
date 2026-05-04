# 🚀 Déploiement AltPool en production

Stack : **Postgres + Spring Boot + React (nginx) + Reverse proxy nginx + Certbot**, le tout en Docker.

## 1. Prérequis serveur

### Hardware minimum
- **2 CPU / 2 GB RAM / 20 GB disque**
- 4 GB RAM recommandé si beaucoup d'utilisateurs concurrents

### OS
- **Ubuntu 22.04 LTS** ou **Debian 12** (les commandes ci-dessous valent pour Ubuntu)
- Toute distrib avec Docker fonctionnera

### Logiciels à installer

```bash
# Docker + Docker Compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Vérification
docker --version          # >= 24
docker compose version    # >= 2.20
```

### DNS

Avant de déployer, fais pointer ton domaine vers l'IP du serveur :

```
A    altpool.example.com   →  IP_DU_SERVEUR
```

Vérification : `dig altpool.example.com +short` doit retourner ton IP.

### Firewall

Ouvre les ports **80** (HTTP), **443** (HTTPS) et **22** (SSH) :

```bash
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443
sudo ufw enable
```

---

## 2. Récupération du code sur le serveur

```bash
sudo mkdir -p /opt && sudo chown $USER /opt
cd /opt
git clone https://github.com/romain1906/AltPool.git altpool
cd altpool
```

(Pour un repo privé, utilise un deploy key SSH ou un Personal Access Token.)

---

## 3. Configuration

### 3.1. Variables d'environnement

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Remplis :
- `DB_PASSWORD` → généré avec `openssl rand -base64 32`
- `JWT_SECRET` → généré avec `openssl rand -base64 64`
- `DOMAIN` → ton vrai domaine
- `ADMIN_EMAIL` → ton email (pour Let's Encrypt)

### 3.2. Domaine dans la config nginx

```bash
nano deploy/nginx/altpool.conf
```

Remplace les **3 occurrences** de `altpool.example.com` par ton domaine.

---

## 4. Build initial des images

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod build
```

Ça prend 5-10 min la première fois (download Maven deps + npm install + build React).

---

## 5. Première installation TLS (Let's Encrypt)

```bash
./deploy/init-tls.sh altpool.example.com admin@example.com
```

Le script :
1. Démarre nginx avec un certificat factice
2. Demande un vrai certificat à Let's Encrypt via le challenge HTTP webroot
3. Reload nginx avec le vrai certificat

Si ça réussit, tu vois `Successfully received certificate.` Sinon vérifie ton DNS et tes ports 80/443.

---

## 6. Démarrage de la stack complète

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Vérification :

```bash
docker compose -f docker-compose.prod.yml ps
# tous les services doivent être "Up" + healthy

curl -I https://altpool.example.com
# doit retourner 200 OK avec ton certificat valide
```

Visite **https://altpool.example.com** dans ton navigateur.

---

## 7. Comptes initiaux

Le `init.sql` crée automatiquement les comptes seed (admin/admin, gerant/gerant, etc.). **Change leurs mots de passe immédiatement** après la première connexion :

1. Login `admin/admin` → Mon profil → Changer mon mot de passe
2. Idem pour `gerant`, `user`

Ou via SQL direct :
```bash
docker exec -it altpool-db psql -U altpool -d altpool
> UPDATE users SET password = '<bcrypt_hash>' WHERE username = 'admin';
```

---

## 8. Backups automatiques

```bash
sudo cp deploy/backup-db.sh /usr/local/bin/altpool-backup
sudo chmod +x /usr/local/bin/altpool-backup

# Cron quotidien à 3h du matin
sudo crontab -e
# Ajoute :
0 3 * * * cd /opt/altpool && BACKUP_DIR=/var/backups/altpool /usr/local/bin/altpool-backup >> /var/log/altpool-backup.log 2>&1
```

Backups stockés dans `/var/backups/altpool/`, conservés 14 jours. Pour restaurer :

```bash
gunzip < /var/backups/altpool/db-20260504-030001.sql.gz | docker exec -i altpool-db psql -U altpool altpool
```

---

## 9. Mises à jour du code

Quand tu pushes une nouvelle version :

```bash
cd /opt/altpool
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Les containers backend + frontend sont recréés, postgres et le proxy restent en place.

⚠️ **Migrations de schéma** : pour l'instant on utilise `ddl-auto: update` qui ajoute les nouvelles colonnes mais ne supprime rien. Pour une vraie gestion long-terme, ajouter Flyway (à voir Phase suivante).

---

## 10. Logs et monitoring

```bash
# Logs en temps réel
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f proxy

# Stats ressources
docker stats

# Vérifier le renouvellement TLS
docker logs altpool-certbot
```

---

## 11. Désactiver Swagger en prod (optionnel)

Si tu veux planquer Swagger UI publiquement :

Édite `backend/src/main/resources/application.yml` et ajoute un profil `prod` :
```yaml
---
spring:
  config:
    activate:
      on-profile: prod
springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

Puis dans `docker-compose.prod.yml`, le backend a déjà `SPRING_PROFILES_ACTIVE: prod`.

---

## 12. Checklist sécurité avant mise en ligne

- [ ] `.env.prod` n'est PAS dans Git
- [ ] `JWT_SECRET` est unique et fort (`openssl rand -base64 64`)
- [ ] `DB_PASSWORD` est unique et fort
- [ ] Mots de passe `admin/admin`, `gerant/gerant`, etc. sont changés
- [ ] Firewall ouvre uniquement 22, 80, 443
- [ ] SSH par clé uniquement (pas de mot de passe)
- [ ] HTTPS valide avec A+ sur https://www.ssllabs.com/ssltest/
- [ ] Backups testés (au moins une restauration réussie)
- [ ] Logs accessibles et lisibles

---

## Architecture en image

```
                 Internet
                    │
                    ▼
               [ Cloudflare / DNS ]
                    │ HTTPS (443)
                    ▼
         ┌──────────────────────┐
         │   nginx proxy        │  altpool-proxy
         │   TLS termination    │  certbot pour Let's Encrypt
         │   /api → backend     │
         │   /     → frontend   │
         └──────┬─────────┬─────┘
                │         │
        ┌───────▼─┐   ┌───▼──────┐
        │ backend │   │ frontend │
        │ Spring  │   │ React +  │
        │ :8080   │   │ nginx    │
        └────┬────┘   └──────────┘
             │
             │ JDBC
        ┌────▼────┐
        │postgres │
        │ :5432   │
        └─────────┘

Volumes Docker :
- altpool-db-data    → /var/lib/postgresql/data
- altpool-uploads    → /var/altpool/uploads (avatars)
- ./deploy/certbot/  → certificats Let's Encrypt
```
