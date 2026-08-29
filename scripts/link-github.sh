#!/usr/bin/env bash
# One-time: link this local project to an existing (possibly empty) GitHub repo.
# Usage: scripts/link-github.sh git@github.com:<user>/ccf-web.git
#    or: scripts/link-github.sh https://github.com/<user>/ccf-web.git
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REMOTE_URL="${1:-}"
if [ -z "$REMOTE_URL" ]; then
  echo "Uso: $0 <url-do-repo-github>"
  echo "Ex.:  $0 git@github.com:SEU_USUARIO/ccf-web.git"
  exit 1
fi

if [ -d .git ]; then
  echo "==> Repositório git já inicializado aqui, pulando 'git init'."
else
  echo "==> Inicializando repositório git..."
  git init -b main
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "==> Remote 'origin' já configurado: $(git remote get-url origin)"
else
  echo "==> Adicionando remote 'origin' -> $REMOTE_URL"
  git remote add origin "$REMOTE_URL"
fi

echo "==> Buscando o remote pra ver se já tem conteúdo..."
git fetch origin || true

if git show-ref --verify --quiet refs/remotes/origin/main; then
  echo
  echo "!! O repositório remoto já tem commits em 'main'."
  echo "!! Decida manualmente como combinar histórico, por exemplo:"
  echo "     git pull --rebase origin main   # traz o histórico remoto pra cá"
  echo "   ou, se o remoto estiver vazio/descartável:"
  echo "     git push -u origin main --force"
  exit 0
fi

echo "==> Criando commit inicial..."
git add -A
git commit -m "Initial commit: Cardigan Web (ported from sistema-cardigan-fichas HTML)" || echo "==> Nada pra commitar (working tree limpo)."

echo "==> Enviando pro GitHub (origin/main)..."
git push -u origin main

echo "==> Feito! Repositório vinculado e enviado."
