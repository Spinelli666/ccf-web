#!/usr/bin/env bash
# Bootstrap script for a fresh clone on Linux (or any machine with Docker).
# Idempotent-ish: safe to re-run. See CLAUDE.md for full context.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Projeto: $ROOT_DIR"

if [ ! -f .env ]; then
  echo "==> Criando .env a partir de .env.example (AJUSTE AUTH_SECRET antes de ir pra produção!)"
  cp .env.example .env
else
  echo "==> .env já existe, mantendo como está."
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "!! Docker não encontrado no PATH. Instale o Docker (ou Postgres nativo) e configure DATABASE_URL em .env manualmente."
else
  echo "==> Subindo Postgres via docker compose..."
  docker compose up -d db
  echo "==> Esperando o Postgres ficar pronto..."
  for i in $(seq 1 30); do
    if docker compose exec -T db pg_isready -U cardigan -d cardigan >/dev/null 2>&1; then
      echo "==> Postgres pronto."
      break
    fi
    sleep 1
  done
fi

echo "==> Instalando dependências (npm install)..."
npm install

echo "==> Gerando o Prisma Client..."
npx prisma generate

if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "==> Aplicando migrações existentes (prisma migrate deploy)..."
  npx prisma migrate deploy
else
  echo "==> Nenhuma migração existe ainda — criando a migração inicial (prisma migrate dev --name init)..."
  npx prisma migrate dev --name init
fi

echo "==> Populando raças padrão (prisma:seed)..."
npm run prisma:seed

cat <<'EOF'

==> Tudo pronto!
    - Confira o .env (principalmente AUTH_SECRET) antes de ir pra produção.
    - Rodar em dev:   npm run dev
    - Build + start:  npm run build && npm run start
    - Ver CLAUDE.md pra contexto completo do projeto e pendências.
EOF
