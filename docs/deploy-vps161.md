# Deploy na VPS 10.10.0.161 (Docker + Nginx Proxy Manager)

Este projeto nasceu na **VPS 10.10.0.160**, rodando em Node no host sob PM2
(`/home/tefe-portaltransparencia/htdocs`, porta 7072). Na 161 o modelo e outro:
nao existe Node no host — build e execucao sao do Docker, e quem atende a
internet e o Nginx Proxy Manager.

O manual da maquina esta em `skills/vps-161/SKILL.md`. Aqui fica so o que e
deste projeto.

## Layout na maquina

```
/opt/portal-transparencia/
├── app/            clone git (a fonte da verdade)
│   ├── .env        segredos da aplicacao      — 600, fora do git
│   └── .env.db     credenciais do MySQL       — 600, fora do git
├── mysql/          datadir do banco  (uid 999)
├── uploads/        anexos enviados   (uid 1000)
└── backups/        pacotes .tar.gz   (uid 1000)
```

Estado mora **fora** da arvore do git: o deploy faz `git reset --hard`, e o que
estiver dentro dela some.

| | |
|---|---|
| containers | `portal-transparencia-web`, `portal-transparencia-db` |
| loopback | `127.0.0.1:3013` (app), `127.0.0.1:3307` (banco, so diagnostico) |
| redes | `proxy` (com o NPM) e `portaltransparencia_interna` |
| imagem | `portal-transparencia:latest` |
| health | `/api/v1/health` — e `?db=1` quando quiser incluir o banco |

## O banco e proprio desta VPS

Na 160 o MySQL era **local** (`127.0.0.1:3306/transp`, Percona 8.0.36) e o ufw
de la libera apenas 22/80/443. A 161 **nao alcanca** aquele banco — nem pela
rede interna, nem pelo IP publico. Por isso aqui sobe um MySQL proprio, no
container `db`, com os dados copiados da 160 no momento da migracao.

Sao dois bancos independentes a partir do corte. Enquanto as duas instancias
estiverem de pe, escrita feita de um lado **nao** aparece do outro.

O datadir e do **uid 999**, nao do 1000 como o resto da casa: o entrypoint da
imagem oficial do MySQL precisa criar o socket em `/var/run/mysqld`, e forcar
`user: "1000:1000"` quebra isso. Como so o proprio container escreve ali, o
alinhamento com o `apps-core` nao faz falta.

```bash
sudo chown -R 999:999 /opt/portal-transparencia/mysql
```

## Deploy

```bash
ssh apps-core@10.10.0.161
bash /opt/portal-transparencia/app/scripts/deploy-vps161.sh
```

O script guarda a imagem atual como `:anterior`, atualiza o codigo pelo git,
limpa cache de build se `/var` estiver apertado, constroi, sobe o banco e espera
ficar `healthy`, aplica `prisma migrate deploy` num container efemero (se falhar,
o deploy para e a versao antiga continua no ar), sobe o compose e so entao
confere o health.

Rollback:

```bash
docker tag portal-transparencia:anterior portal-transparencia:latest
docker compose -f /opt/portal-transparencia/app/docker-compose.prod.yml up -d
```

## As duas pontas do dominio

Publicar `transparencia.tefe.am.gov.br` aqui exige **duas** mudancas:

1. **Tunel Cloudflare, na VPS 160** — a entrada aponta hoje para
   `http://10.10.0.160:7072`; passa a apontar para `http://10.10.0.161:80`, que
   e o NPM. Nunca para a porta de loopback da app: ela nao responde de fora da
   maquina, e o sintoma e timeout sem pista no config.
2. **Proxy host no NPM da 161** — `forward_host: portal-transparencia-web`,
   `forward_port: 3000`, sem SSL (o TLS termina na Cloudflare, antes de chegar).

Faltando uma delas o sintoma muda: sem a primeira, timeout; sem a segunda, **404
com assinatura `openresty`**.

## `.env` de container nao aceita aspas

`--env-file` do Docker nao interpreta aspas — o `dotenv` interpreta. Um `.env`
copiado da 160 vem com `CHAVE="valor"` e o container recebe as aspas dentro do
valor: a URL do banco deixa de casar o protocolo `mysql://` e uma chave hex de 64
caracteres chega com 66. Ao copiar de la:

```bash
sed -i -E 's/^([A-Za-z_][A-Za-z0-9_]*)="(.*)"$/\1=\2/' .env
```

E termine o arquivo com quebra de linha, senao a proxima variavel adicionada
gruda na ultima.

## Um agendador por vez

O `src/instrumentation.ts` inicia o agendador de backup e o cron do "acordar"
dentro do processo da app. Com a 160 e a 161 de pe ao mesmo tempo, os dois
disparam — e cada um escreve no seu proprio banco e no seu proprio disco.

No corte: **desligue o PM2 da 160 antes** de considerar a 161 como oficial, e
ressincronize `uploads/` no momento do corte, nao antes. Copia feita com
antecedencia e um instantaneo, e o que entrou depois dela so existe do lado
antigo.

```bash
# na 160
sudo -u root pm2 stop transparencia
```

Cuidado com `pm2 save` na 160: a lista e compartilhada por todos os projetos.
