#!/usr/bin/env bash
# Lance AltPool en une seule commande :
#   ./start.sh
#
# - Démarre Postgres + Backend via docker-compose (en arrière-plan)
# - Installe les dépendances frontend si besoin
# - Démarre le frontend (au premier plan, Ctrl+C pour arrêter)
# - Ouvre le navigateur sur http://localhost:3000

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "▶ Démarrage Postgres + Backend (Docker)"
cd "$ROOT/backend"
docker-compose up --build -d

echo "▶ Attente du backend (port 8080)..."
for i in {1..40}; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/v3/api-docs | grep -q "200"; then
    echo "   backend prêt"
    break
  fi
  sleep 2
done

cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  echo "▶ Installation des dépendances frontend..."
  npm install
fi

echo "▶ Ouverture du navigateur..."
( sleep 4 && open http://localhost:3000 ) &

echo "▶ Démarrage du frontend (Ctrl+C pour arrêter)"
npm start
