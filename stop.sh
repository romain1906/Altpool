#!/usr/bin/env bash
# Stoppe les conteneurs backend + postgres
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/backend"
docker-compose down
echo "✓ Arrêté. (ajoute -v pour vider la base : docker-compose down -v)"
