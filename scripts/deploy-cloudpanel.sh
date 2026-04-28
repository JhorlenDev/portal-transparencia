#!/usr/bin/env bash
set -Eeuo pipefail

SSH_USER="${SSH_USER:-webserver}"
SSH_HOST="${SSH_HOST:-10.10.0.154}"
APP_DIR="${APP_DIR:-/home/tefe-portaltransparencia/htdocs}"
BRANCH="${BRANCH:-master}"
PM2_APP="${PM2_APP:-transparencia}"
PUBLIC_URL="${PUBLIC_URL:-https://transparencia.tefe.am.gov.br}"

remote_args=$(printf '%q ' "$APP_DIR" "$BRANCH" "$PUBLIC_URL" "$PM2_APP")

ssh -tt "${SSH_USER}@${SSH_HOST}" "sudo bash -s -- ${remote_args}" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

APP_DIR="$1"
BRANCH="$2"
PUBLIC_URL="$3"
PM2_APP="$4"

cd "$APP_DIR"

git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

if [ -f .env ]; then
  if grep -q '^NEXT_PUBLIC_APP_URL=' .env; then
    sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=$PUBLIC_URL|" .env
  else
    printf '\nNEXT_PUBLIC_APP_URL=%s\n' "$PUBLIC_URL" >> .env
  fi
else
  printf 'NEXT_PUBLIC_APP_URL=%s\n' "$PUBLIC_URL" > .env
fi

npm install
npx prisma generate
npm run lint
npm run build
pm2 restart "$PM2_APP" --update-env
pm2 status "$PM2_APP"
REMOTE_SCRIPT
