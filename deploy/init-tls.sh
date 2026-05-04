#!/usr/bin/env bash
# =====================================================================
# Première initialisation des certificats Let's Encrypt
# À lancer UNE FOIS sur le serveur, après le 1er docker compose up.
#
# Usage : ./deploy/init-tls.sh altpool.example.com admin@example.com
# =====================================================================
set -e

DOMAIN="${1:?Usage: $0 <domain> <email>}"
EMAIL="${2:?Usage: $0 <domain> <email>}"

echo "▶ Préparation des dossiers"
mkdir -p deploy/certbot/conf deploy/certbot/www

echo "▶ Démarrage de nginx (HTTP only, sans cert) pour servir le challenge"
# Génère un cert factice temporaire pour que nginx puisse démarrer
mkdir -p "deploy/certbot/conf/live/$DOMAIN"
docker run --rm -v "$(pwd)/deploy/certbot/conf:/etc/letsencrypt" \
  alpine/openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout "/etc/letsencrypt/live/$DOMAIN/privkey.pem" \
  -out "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" \
  -subj "/CN=localhost" 2>/dev/null

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d proxy

echo "▶ Attente 5 secondes pour que nginx soit up"
sleep 5

echo "▶ Suppression du cert factice"
rm -rf "deploy/certbot/conf/live/$DOMAIN"
rm -rf "deploy/certbot/conf/archive/$DOMAIN"
rm -f  "deploy/certbot/conf/renewal/$DOMAIN.conf"

echo "▶ Demande du vrai certificat à Let's Encrypt"
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos --no-eff-email \
  --force-renewal \
  -d "$DOMAIN"

echo "▶ Reload de nginx avec le vrai certificat"
docker compose -f docker-compose.prod.yml --env-file .env.prod restart proxy

echo ""
echo "✓ TLS configuré pour $DOMAIN"
echo "  Renouvelle automatiquement toutes les 12h via le service certbot."
echo ""
echo "  Tu peux maintenant lancer le reste : "
echo "  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d"
