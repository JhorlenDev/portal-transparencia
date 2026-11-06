# Integração com a Fiorilli (SCPI)

O portal importa despesas, receitas, licitações, contratos, diárias e transferências da
**API de Dados Abertos da Fiorilli**, o sistema contábil da Prefeitura, mantido pela DC Sistemas.
Esses dados convivem com os que a Prefeitura envia pelo webhook da Acordar
(`/api/acordar/webhook`). Cada linha diz de onde veio na coluna `fonte` (`fiorilli` ou `acordar`).

Painel de monitoramento: **`/admin/sincronizacao`** (mesma senha do `/admin`, `ADMIN_PASSWORD`).

---

## Frequência de atualização

| Origem | Quando atualiza |
|---|---|
| **Fiorilli, ano corrente** | três vezes por dia, às **02:00, 10:00 e 18:00** (Manaus) |
| **Fiorilli, anos anteriores** | aos **domingos**, só na execução das 02:00 |
| **Fiorilli, manual** | botão "Sincronizar agora" no painel, ou o script de linha de comando |
| **Acordar (Prefeitura)** | quando a Prefeitura envia ao webhook, sem agenda fixa |
| **Movimentação do empenho** | consultada na hora, ao abrir o detalhe de uma despesa (cache de 10 min) |

Os anos anteriores são recarregados porque ainda mudam: anulações e pagamentos de restos a pagar
alteram empenhos antigos.

Uma sincronização completa do ano corrente leva **cerca de 35 segundos**. Quase todo esse tempo
é das despesas, porque a Fiorilli devolve o ano inteiro de uma vez.

O agendador roda dentro do processo do Next (`src/instrumentation.ts`), igual ao backup e ao
`acordar-cron`. Só liga com `FIORILLI_SYNC_ENABLED=true`. Duas sincronizações nunca rodam ao mesmo
tempo: se uma já estiver em andamento, a outra é recusada.

---

## Qual dado aparece no site

**Num ano em que existem dados da Fiorilli, o site mostra só os dados da Fiorilli.** Isso vale
para despesas, receitas, licitações e contratos. Nos anos sem nada da Fiorilli, o site mostra os
dados da Acordar.

A Fiorilli é o sistema contábil oficial. Somar as duas fontes contaria o mesmo empenho duas vezes.
A regra fica em `prioridadeFiorilli()`, em [src/lib/site-data.ts](../src/lib/site-data.ts).

Nas receitas, a Fiorilli manda a árvore inteira do plano de contas. Para não somar o pai com os
filhos, só entram nos totais as contas do último nível (nível 10 na receita orçamentária).

---

## Configuração

Variáveis de ambiente (veja também o [.env.example](../.env.example)):

| Variável | Padrão | Para quê |
|---|---|---|
| `FIORILLI_SYNC_ENABLED` | `false` | liga a sincronização diária automática |
| `FIORILLI_SYNC_HORARIO` | `02:00,10:00,18:00` | horários das execuções diárias, separados por vírgula, no fuso de Manaus. O histórico de domingo roda no primeiro |
| `FIORILLI_SYNC_ANOS_HISTORICOS` | vazio | anos recarregados aos domingos, ex. `2022,2023,2024,2025` |
| `FIORILLI_BASE_URL` | URL de Tefé | endereço da API |
| `FIORILLI_DEFAULT_EMPRESA` | `1` | código da entidade na Fiorilli |
| `FIORILLI_TIMEOUT_MS` | `30000` | tempo limite de cada chamada (as despesas usam 180 s) |
| `FIORILLI_MAX_RETRIES` | `3` | novas tentativas em caso de falha (espera 1 s, 3 s e 9 s) |

---

## Primeira implantação

1. **Antes do deploy**, confira se há `id_external_ref` repetido nas despesas de produção. A
   migração cria um índice único e falha se houver repetição. A consulta está no topo de
   [prisma/migrations/20261103120000_fonte_integracoes/migration.sql](../prisma/migrations/20261103120000_fonte_integracoes/migration.sql).
2. Faça o deploy normal. O `prisma migrate deploy` aplica a migração.
3. Faça a carga histórica:
   ```bash
   npx tsx scripts/fiorilli-sync.ts --anos 2022,2023,2024,2025,2026
   ```
4. No `.env` de produção, defina `FIORILLI_SYNC_ENABLED=true` e `FIORILLI_SYNC_ANOS_HISTORICOS`,
   e reinicie o container.
5. Abra `/admin/sincronizacao` e confira se todas as cargas terminaram como `SUCESSO` ou `IGNORADO`.

---

## Sincronização manual

```bash
npx tsx scripts/fiorilli-sync.ts                                 # ano corrente, todos os módulos
npx tsx scripts/fiorilli-sync.ts --anos 2024,2025                # anos específicos
npx tsx scripts/fiorilli-sync.ts --anos 2025 --modulos despesas  # só um módulo
```

Módulos: `despesas`, `receitas`, `licitacoes`, `contratos`, `diarias`, `transferencias`.
As licitações sincronizam antes dos contratos porque o contrato é ligado à licitação pelo número
do processo.

Pela API (exige sessão de administrador):

```
GET  /api/admin/fiorilli/sync    situação, resumo por ano e últimos registros
POST /api/admin/fiorilli/sync    dispara uma sincronização ({ "exercicios": [2026], "modulos": [...] })
GET  /api/admin/fiorilli/saude   testa cada endpoint da Fiorilli
```

---

## Status no painel

| Status | Significado |
|---|---|
| `SUCESSO` | carga gravada e totais conferidos |
| `DIVERGENTE` | carga gravada, mas os totais não bateram com os da própria Fiorilli. Os detalhes aparecem no registro |
| `IGNORADO` | nada gravado de propósito, ex.: receitas de anos anteriores (veja as limitações abaixo) |
| `ERRO` | a chamada falhou. Os dados anteriores continuam como estavam |
| `INTERROMPIDO` | o servidor reiniciou no meio da carga. A próxima execução refaz tudo |

Uma resposta vazia da Fiorilli **nunca apaga** dados já gravados. Isso evita que uma instabilidade
da API zere o portal.

---

## Limitações da API

Problemas do lado da Fiorilli, que não têm como ser resolvidos no portal:

| Problema | Efeito no portal |
|---|---|
| **Servidores** responde sempre com erro HTTP 500 | a folha de pessoal não é importada da Fiorilli |
| **Receitas** ignora o exercício pedido e sempre devolve o ano corrente | receitas de anos anteriores só existem se vierem da Acordar |
| **Licitações** não trazem edital, participantes, vencedor nem anexos | a página de detalhe avisa que esses dados não são publicados |
| **Objeto da licitação** cortado em 150 caracteres | quando existe contrato, o texto completo vem do contrato |
| **Emendas parlamentares** voltam com valores zerados | não importadas |
| **Itens do empenho** não existem na API | não exibidos |

Particularidades que o código já trata (detalhes nos comentários de `src/lib/fiorilli/`):

- valores em formato `1234,56` e datas em `DD/MM/AAAA HH:mm:ss`, gravadas no fuso de Manaus;
- ano com 2 dígitos nas licitações;
- a consulta de licitações e contratos de um ano também traz processos de anos anteriores ainda ativos;
- a chave única do empenho é o `PKEMP`, porque as anulações repetem número e tipo;
- nos contratos, `EMPENHADO` é só do ano consultado. O total soma `EMPENHADOANT`.

---

## Código

```
src/lib/fiorilli/
  client.ts               chamadas HTTP, tempo limite e novas tentativas
  parse.ts                conversão de valores, datas e documentos
  persistencia.ts         gravação em lotes (upsert por fonte + id_external_ref)
  despesas.ts, receitas.ts, licitacoes.ts, contratos.ts, diarias.ts, transferencias.ts
  sync.ts                 orquestra os módulos e grava o histórico em sincronizacao_logs
  agendador.ts            execução diária e dominical
  saude.ts                teste de cada endpoint, usado pelo painel
  movimentos-empenho.ts   liquidações e pagamentos de um empenho, consultados na hora
```

## Testes

```bash
npm run test:fiorilli                                 # sem rede e sem banco
npx tsx scripts/test-fiorilli.ts --integracao         # também chama a API real de Tefé
npx tsx scripts/test-fiorilli.ts --integracao --banco # também grava no banco de DATABASE_URL
```

Com `--banco`, os testes só criam e apagam registros próprios: o exercício fictício 2099 e o
`id_external_ref` começando por `teste-fiorilli-`.
