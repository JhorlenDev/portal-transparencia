# syntax=docker/dockerfile:1.7
#
# Imagem de producao do Portal da Transparencia, para a VPS 10.10.0.161
# (AlmaLinux + Docker + Nginx Proxy Manager).
#
# Debian slim, nao Alpine: os query engines do Prisma sao binarios nativos
# compilados contra glibc. No musl do Alpine eles instalam sem reclamar e falham
# so na execucao.
#
# A arvore inteira do build vai para a imagem final (em vez do `output:
# standalone`, mais enxuto). E uma troca consciente: a imagem fica maior, mas da
# para rodar migration, seed e os scripts de backup/restauracao por `docker exec`
# na MESMA imagem que serve o site, sem manter um segundo caminho de deploy.

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
# Uma queda de rede no meio do install derruba a camada inteira e perde tudo que
# ja tinha baixado; as retentativas evitam refazer do zero por um ECONNRESET.
ENV npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000

# --- dependencias -----------------------------------------------------------
FROM base AS deps
WORKDIR /app
# openssl aqui nao e opcional: e por ele que o Prisma detecta a plataforma do
# query engine. Sem o pacote a deteccao cai num alvo errado, o build termina sem
# reclamar, o container sobe, e so a PRIMEIRA consulta ao banco morre com
# "could not locate the Query Engine".
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
# O schema entra junto porque o `postinstall` do projeto roda `prisma generate`,
# que precisa dele. Sem isso o `npm ci` falha no proprio postinstall.
COPY package.json package-lock.json ./
COPY prisma ./prisma
# O datasource resolve `env("DATABASE_URL")` e o generate aborta se a variavel
# nao existir. Um valor de fachada basta — `generate` nao conecta em lugar
# nenhum — e mantem credencial real fora da imagem.
ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/build
RUN npm ci

# --- build ------------------------------------------------------------------
FROM base AS build
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* e a excecao a regra de "segredo nunca por ARG": o Next injeta
# essas variaveis em TODOS os bundles no momento do build (cliente, servidor
# Node e edge), entao um valor vindo so pelo env_file em runtime seria ignorado.
# Nao e segredo — e a URL publica do site — e precisa estar certa aqui.
ARG NEXT_PUBLIC_APP_URL=https://transparencia.tefe.am.gov.br
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/build
ENV NODE_ENV=production
RUN npm run build

# --- runtime ----------------------------------------------------------------
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# openssl tambem no runtime: o query engine do Prisma linka contra ele.
# Nao entra client de MySQL: o modulo de backup gera o dump com `mysql2` puro,
# sem depender do binario `mysqldump`.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app ./

# Diretorios de estado. Sao pontos de bind mount no compose; criados aqui com o
# dono certo para o caso de subirem vazios.
RUN mkdir -p /app/public/uploads /app/backups \
 && chown -R node:node /app/public/uploads /app/backups

# uid 1000, igual ao apps-core do host: arquivo criado no bind mount por um lado
# fica gravavel pelo outro.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/v1/health || exit 1

# Binario direto, sem passar por npm/npx: um CMD que resolve pacote no registry
# deixa o start dependendo de rede toda vez que o container sobe.
CMD ["node_modules/.bin/next", "start"]
