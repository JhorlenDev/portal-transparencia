#!/usr/bin/env bash
# Deploy do Portal da Transparencia na VPS 10.10.0.161 (Docker + Nginx Proxy
# Manager).
#
# Roda DENTRO da VPS, como apps-core:
#   bash /opt/portal-transparencia/app/scripts/deploy-vps161.sh
#
# Substitui o scripts/deploy-cloudpanel.sh, que e do modelo antigo (VPS 160,
# Node no host, PM2). Aqui nao existe Node no host: build e execucao sao do
# Docker.
#
# Idempotente e reproduzivel: o codigo sempre vem do git, nunca do PC local.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/portal-transparencia/app}"
IMAGE="${IMAGE:-portal-transparencia:latest}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BRANCH="${BRANCH:-master}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3013/api/v1/health}"

cd "$APP_DIR"
echo "==> Deploy Portal da Transparencia em $APP_DIR (branch $BRANCH)"

# O .env nao esta no git (e nem deve estar): sem ele o container sobe sem banco
# e sem os segredos, e a falha aparece longe daqui.
for arquivo in .env .env.db; do
  if [ ! -f "$arquivo" ]; then
    echo "!! $APP_DIR/$arquivo nao existe. Crie antes de deployar (chmod 600)." >&2
    exit 1
  fi
done

# ---- 1. Rollback barato: guarda a imagem que esta servindo agora ------------
# Custa um tag e transforma "o deploy novo quebrou" num comando so.
if docker image inspect "$IMAGE" >/dev/null 2>&1; then
  docker tag "$IMAGE" "${IMAGE%:*}:anterior"
  echo "==> imagem atual marcada como ${IMAGE%:*}:anterior"
fi

# ---- 2. Codigo do git ------------------------------------------------------
# .env, .env.db e os diretorios de estado ficam fora do git; o reset nao os toca.
echo "==> git fetch + reset --hard origin/$BRANCH"
git fetch --prune origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# ---- 3. Espaco antes do build ----------------------------------------------
# O cache de build cresce rapido — uma app Node passa de 8 GB em poucos builds —
# e mora em /var, nao em /. Um build que enche o disco derruba a VPS inteira,
# com todas as apps dela.
LIVRE_GB=$(df -BG --output=avail /var | tail -1 | tr -dc '0-9')
echo "==> /var com ${LIVRE_GB}G livres"
if [ "$LIVRE_GB" -lt 12 ]; then
  echo "==> pouco espaco: limpando cache de build"
  docker builder prune -af >/dev/null
  docker image prune -f  >/dev/null
  echo "==> agora com $(df -BG --output=avail /var | tail -1 | tr -dc '0-9')G livres"
fi

# ---- 4. Build --------------------------------------------------------------
# Sem --build-arg de segredo: o valor de um ARG fica no historico da imagem e
# `docker history` o devolve em texto claro. Os segredos chegam em runtime, pelo
# env_file do compose.
#
# NEXT_PUBLIC_APP_URL e a excecao: o Next injeta essa variavel nos bundles no
# momento do build, entao em runtime ela ja nao muda nada. Nao e segredo.
APP_URL="$(sed -n 's/^NEXT_PUBLIC_APP_URL=//p' .env | tail -1 | tr -d "\"' ")"
APP_URL="${APP_URL:-https://transparencia.tefe.am.gov.br}"
echo "==> docker build (NEXT_PUBLIC_APP_URL=$APP_URL)"
DOCKER_BUILDKIT=1 docker build --build-arg NEXT_PUBLIC_APP_URL="$APP_URL" -t "$IMAGE" .

# ---- 5. Banco --------------------------------------------------------------
# O banco sobe antes e sozinho: a migracao do passo 6 precisa dele de pe, e a
# rede `portaltransparencia_interna` so passa a existir depois deste `up`.
echo "==> subindo o banco"
docker compose -f "$COMPOSE_FILE" up -d db
for i in $(seq 1 30); do
  ESTADO="$(docker inspect --format '{{.State.Health.Status}}' portal-transparencia-db 2>/dev/null || echo indisponivel)"
  [ "$ESTADO" = "healthy" ] && break
  echo "    banco: $ESTADO (tentativa $i/30) — aguardando 2s..."
  sleep 2
done
if [ "$ESTADO" != "healthy" ]; then
  echo "!! O banco nao ficou healthy. Logs:" >&2
  docker logs portal-transparencia-db --tail 40 >&2
  exit 1
fi

# ---- 6. Migracoes ----------------------------------------------------------
# Container efemero na imagem nova, antes de trocar o que serve o site: se uma
# migracao falhar, o deploy para aqui e a versao antiga continua no ar.
# `migrate deploy` so aplica migracoes ja versionadas — uma mudanca destrutiva
# deve FALHAR o deploy, nunca apagar dados de producao.
echo "==> prisma migrate deploy"
docker run --rm --env-file .env --network portaltransparencia_interna \
  "$IMAGE" node_modules/.bin/prisma migrate deploy

# ---- 7. Sobe ---------------------------------------------------------------
echo "==> docker compose up -d"
docker compose -f "$COMPOSE_FILE" up -d

# ---- 8. Health check -------------------------------------------------------
echo "==> Health check em $HEALTH_URL"
for i in $(seq 1 30); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
  if [ "$CODE" = "200" ]; then
    echo "==> OK: app respondeu 200 (tentativa $i)"
    curl -s "$HEALTH_URL"; echo
    docker ps --filter name=portal-transparencia --format "    {{.Names}}  {{.Status}}"
    echo "==> Deploy concluido com sucesso."
    exit 0
  fi
  echo "    tentativa $i/30: HTTP $CODE — aguardando 2s..."
  sleep 2
done

echo "!! Health check falhou. Logs:" >&2
docker logs portal-transparencia-web --tail 40 >&2
echo "!! Para voltar a versao anterior:" >&2
echo "     docker tag ${IMAGE%:*}:anterior $IMAGE && docker compose -f $COMPOSE_FILE up -d" >&2
exit 1
