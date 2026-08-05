# Sistema de backup

Faz cópias do **banco de dados** e das **mídias enviadas** (`public/uploads`) — o código-fonte
fica versionado no GitHub e não entra no pacote. Os backups podem ficar no próprio servidor,
no **Google Drive do administrador** ou nos dois.

Painel: **`/admin/backup`** (protegido por senha).

---

## Como funciona

Cada execução gera um pacote `portal-backup-<escopo>-AAAAMMDD-HHMMSS.tar.gz`:

```
manifest.json      data, escopo, tabelas + contagens, lista de mídias com sha256, impressão digital
database/dump.sql  dump lógico completo (DROP + CREATE + INSERT), pronto para restaurar
media/uploads/...  arquivos enviados, com os caminhos originais
```

- **Dump próprio, sem `mysqldump`**: o servidor não tem o binário, então o dump é feito em
  streaming com `mysql2` ([src/lib/backup/db-dump.ts](../src/lib/backup/db-dump.ts)). Usa
  `START TRANSACTION WITH CONSISTENT SNAPSHOT`, ou seja, tira um retrato coerente sem travar o site.
- **Streaming de ponta a ponta**: as mídias entram no pacote por *hardlink* num diretório de
  staging e o `tar.gz` é escrito enquanto o sha256 é calculado. Um pacote de 1,2 GB consome
  cerca de 100 MB de memória.
- **Nada de arquivo pela metade**: o pacote é montado em `<BACKUP_DIR>/tmp/` e só depois
  movido (`rename`) para o diretório final.
- **Um backup por vez**: trava em memória + arquivo `<BACKUP_DIR>/.lock` (assumida
  automaticamente se ficar órfã por queda do processo).

### Deduplicação

Cada pacote tem uma *impressão digital do conteúdo* (`contentHash`), calculada a partir do
sha256 do dump e da lista ordenada de mídias — independente do horário de geração. Se nada mudou
desde o último backup, o pacote anterior é reaproveitado e a execução aparece como
**"sem mudanças"** em vez de duplicar arquivo. Vale também para o Drive: o hash vai nas
`appProperties` do arquivo, então um conteúdo idêntico não é reenviado.

### Google Drive (modo broker)

A autenticação passa pelo [BackupHub](https://backup.marreira.link/api/skill/broker), que só
guarda o `refresh_token` e emite `access_token`. **Os arquivos vão do servidor direto para o
`googleapis.com`** — não passam pelo BackupHub. O `brokerToken` fica cifrado em AES-256-GCM no
banco e nunca aparece em log, URL ou resposta de API.

Ao conectar, dá para escolher:

| Opção | Efeito |
|---|---|
| **Drive completo** | permite escolher qualquer pasta; o Google exibe o aviso de "app não verificado" |
| **Só a pasta do app** | sem aviso do Google, mas grava apenas na pasta criada pelo sistema |

Envio: arquivos até 5 MB vão em uma requisição (multipart); acima disso, sessão retomável em
pedaços de 8 MB, com retomada automática após queda de conexão e *backoff* respeitando
`Retry-After` em 429/503.

### Agendamento e retenção

Local e nuvem são configurados de forma independente, no fuso `America/Manaus`:

| Frequência | Configuração |
|---|---|
| `INTERVALO` | a cada N horas |
| `DIARIO` | horários fixos (`03:00,15:00` = 2× ao dia) |
| `SEMANAL` | dias da semana + horários |

Retenção por **quantidade** (manter os N mais recentes) e/ou por **idade** (apagar após D dias);
`0` desliga a regra. O backup mais recente nunca é apagado.

O agendador roda dentro do processo do Next (`instrumentation.ts`, tique de 60 s), ligado por
padrão em produção. Quem preferir o cron do sistema pode desligar (`BACKUP_SCHEDULER_ENABLED=false`)
e chamar o endpoint:

```bash
curl -X POST -H "Authorization: Bearer $API_BEARER_TOKEN" \
  https://transparencia.tefe.am.gov.br/api/admin/backup/cron
```

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ADMIN_PASSWORD` | sim | senha do painel `/admin` (sem ela, o painel responde 503) |
| `ADMIN_SESSION_SECRET` | não | chave que assina o cookie de sessão (padrão: `NEXTAUTH_SECRET`) |
| `BACKUP_DIR` | não | onde os pacotes ficam (padrão: `<projeto>/backups`; nunca pode ser dentro de `public/`) |
| `BACKUP_ENCRYPTION_KEY` | não | chave AES do token do Drive (padrão: `NEXTAUTH_SECRET`) |
| `BACKUPHUB_BASE_URL` | não | instância do BackupHub (padrão: `https://backup.marreira.link`) |
| `BACKUP_SCHEDULER_ENABLED` | não | liga/desliga o agendador interno (padrão: ligado em produção) |
| `BACKUP_MEDIA_DIRS` | não | pastas de mídia, separadas por vírgula (padrão: `public/uploads`) |
| `BACKUP_DATABASE_URL` | não | conexão só para o dump, ex.: usuário somente-leitura (padrão: `DATABASE_URL`) |
| `BACKUP_TIMEZONE` | não | fuso do agendamento (padrão: `America/Manaus`) |

> Em produção, aponte `BACKUP_DIR` para fora do diretório do repositório
> (ex.: `/home/tefe-portaltransparencia/backups`), para que o `git reset --hard` do deploy
> nunca chegue perto dos pacotes.

---

## Restaurar

```bash
# 1) simulação: valida manifesto, dump e sha256 de cada mídia — não altera nada
npx tsx scripts/restore-backup.ts --arquivo backups/portal-backup-completo-....tar.gz

# 2) restauração de verdade (pede confirmação digitando o nome do banco)
npx tsx scripts/restore-backup.ts --arquivo <pacote> --aplicar --banco --midias
```

O dump recria as tabelas (`DROP TABLE IF EXISTS` + `CREATE TABLE`). As tabelas de controle do
próprio backup (`backup_jobs`, `backup_drive_contas`) ficam **de fora** do pacote: a primeira
mudaria a cada execução e quebraria a deduplicação; a segunda guarda o token do Drive, que não
deve viajar junto para a nuvem.

---

## Testes

```bash
npx tsx scripts/test-backup.ts             # 40 testes locais (~4 min)
npx tsx scripts/test-backup.ts --grande    # inclui pacote de 1,2 GB (~6 min)
npx tsx scripts/test-backup-drive.ts       # 22 testes de nuvem contra um Drive simulado
npx tsx scripts/test-backup-drive.ts --real  # subconjunto contra a conta conectada de verdade
```

Os testes trabalham em diretórios temporários (não tocam em `public/uploads` nem no `BACKUP_DIR`
real) e apagam do histórico os registros que criaram. O que eles cobrem:

- **Banco**: escape de aspas/backslash/`\0`/emoji validado mandando o literal de volta ao MariaDB;
  contagem por tabela conferida com `COUNT(*)`; dump determinístico; transação aberta e fechada.
- **Mídias**: nome com espaço/acento/emoji, arquivo de 0 byte, symlink de arquivo e de pasta,
  arquivo sem permissão, link quebrado, arquivo que some no meio da varredura.
- **Pacote**: extração byte a byte, manifesto, sha256, escopos parciais.
- **Duplicidade**: segunda execução sem mudanças, mudança de 1 byte, `--forcar`, dois backups
  no mesmo segundo.
- **Concorrência**: 3 execuções simultâneas (1 roda, 2 recusadas), trava órfã, trava recente.
- **Retenção**: por quantidade, por idade, preservação do mais recente, regra desligada.
- **Falhas**: disco insuficiente, banco fora do ar, ausência de lixo em `tmp/`, trava liberada.
- **Nuvem** (simulada): multipart e sessão retomável, queda de conexão no meio do envio,
  503/429 com `Retry-After`, token vencido, dedupe, retenção, download com conferência de
  sha256, download corrompido, pasta inexistente, conta revogada.
