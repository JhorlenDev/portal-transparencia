# 📖 Biblia do Projeto - Portal Transparência 360

## Visão Geral

**Portal de Transparência Pública Municipal** - Next.js 16 com Prisma + MariaDB Cloud

- **Repositório:** https://github.com/marreiradigital/portal-transparencia-360 (privado)
- **Deploy:** Vercel (https://portal-transparencia-360.vercel.app)
- **Banco:** MariaDB Cloud (177.136.234.91:3306)

---

## Stack Tecnológica

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 16.2.1 | Framework React full-stack |
| TypeScript | 5.x | Tipagem estática |
| Tailwind CSS | 4.x | Estilização |
| Prisma | 5.22.0 | ORM para banco |
| MariaDB Cloud | - | Banco de dados MySQL |
| Vercel | - | Hospedagem/deploy |

---

## Variáveis de Ambiente (.env)

```
DATABASE_URL="mysql://user:pass@177.136.234.91:3306/marreiradigital_transparencia"
NEXTAUTH_SECRET="eT7lPLbX7ZDAbGaUbFWuvVr1npAk5DTyHqKfXKcHgOg="
NEXTAUTH_URL="https://portal-transparencia-360.vercel.app"
API_BEARER_TOKEN="transparencia360-api-2026-secure-token"
```

**IMPORTANTE:** `.env` NÃO está no git (configurado no Vercel)

---

## Modelos do Banco (Prisma)

### Tabelas Principais

| Modelo | Tabela DB | Descrição |
|--------|-----------|------------|
| Orgao | orgaos | Órgãos públicos |
| Receita | receitas | Receitas municipais |
| Despesa | despesas | Empenhos/liquidações |
| Licitacao | licitacoes | Processos licitatórios |
| Contrato | contratos | Contratos administrativos |
| Servidor | servidores | Servidores públicos |
| SolicitacaoSIC | solicitacoes_sic | Pedidos e-SIC |
| Convenio | convenios | Convênios |
| Dataset | datasets | Catálogo dados abertos |
| ConfiguracaoSite | configuracao_site | **WordPress Options** (chave/valor) |

### ConfiguracaoSite (WP Options)

Cada config é um registro separado (chave/valor), igual `wp_options`:
```
id | chave              | valor                    | tipo  | descricao
1  | nome_site          | Portal da Transparência | text  | Nome do site
2  | descricao          | Portal de transpar...   | text  | Descrição
3  | email_contato      | email@prefeitura.br     | email | E-mail
...
```

**Chaves disponíveis:** nome_site, subtitulo_site, descricao, logo_url, favicon_url, endereco, telefone_contato, email_contato, horario_funcionamento, facebook, instagram, youtube, twitter, link_site_oficial, link_pncp, link_fala_br, link_diario_oficial, texto_rodape, cor_primaria, cor_secundaria, nome_municipio, estado, texto_lai

---

## API Endpoints

### Autenticação

**Todos endpoints exigem Bearer Token** (exceto GET público)

```
Authorization: Bearer transparencia360-api-2026-secure-token
```

### Rotas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET/POST | /api/orgaos | Listar/Criar órgãos |
| GET/PUT/DELETE | /api/orgaos/[id] | Detalhe/Update/Delete |
| GET/POST | /api/receitas | Listar/Criar receitas |
| GET/PUT/DELETE | /api/receitas/[id] | ... |
| GET/POST | /api/despesas | Listar/Criar despesas |
| GET/PUT/DELETE | /api/despesas/[id] | ... |
| GET/POST | /api/licitacoes | Listar/Criar licitações |
| GET/PUT/DELETE | /api/licitacoes/[id] | ... |
| GET/POST | /api/contratos | Listar/Criar contratos |
| GET/PUT/DELETE | /api/contratos/[id] | ... |
| GET/POST | /api/servidores | Listar/Criar servidores |
| GET/PUT/DELETE | /api/servidores/[id] | ... |
| GET/POST | /api/convenios | Listar/Criar convênios |
| GET/PUT/DELETE | /api/convenios/[id] | ... |
| GET/POST | /api/datasets | Listar/Criar datasets |
| GET/PUT/DELETE | /api/datasets/[id] | ... |
| GET | /api/configuracao-site | **Público** - Todas configs |
| POST/PUT | /api/configuracao-site | **Autenticado** - Salvar configs |

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── page.tsx                    # Home (dados dinâmicos)
│   ├── layout.tsx                  # Layout com header/footer dinâmicos
│   ├── api/                        # API Routes
│   │   ├── orgaos/
│   │   ├── receitas/
│   │   ├── despesas/
│   │   ├── licitacoes/
│   │   ├── contratos/
│   │   ├── servidores/
│   │   ├── convenios/
│   │   ├── datasets/
│   │   └── configuracao-site/
│   ├── despesas/
│   ├── receitas/
│   ├── licitacoes/
│   ├── contratos/
│   ├── servidores/
│   ├── convenios/
│   ├── dados-abertos/
│   ├── esic/
│   └── busca/
├── components/
│   ├── ui/                         # Componentes base (Button, Input, Card)
│   └── portal/                      # Header, Footer
├── lib/
│   ├── prisma.ts                   # Cliente Prisma
│   ├── auth.ts                     # Autenticação Bearer Token
│   ├── site-data.ts                # Funções helper (getSiteConfig, getSiteStats, etc)
│   └── utils.ts
prisma/
├── schema.prisma                   # Schema do banco
├── seed.ts                        # Seed de dados
└── migrations/
scripts/
├── seed-config.ts                 # Seed de configurações do site
document-api/
├── document-api.md                 # Documentação geral
├── orgaos.md
├── receitas.md
├── despesas.md
├── licitacoes.md
├── contratos.md
├── servidores.md
├── convenios.md
├── datasets.md
└── configuracao-site.md            # API WordPress Options
```

---

## Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Build produção local
npm run build

# Sincronizar schema com banco (MariaDB Cloud)
npx prisma db push

# Gerar Prisma Client
npx prisma generate

# Seed de configurações
npx tsx scripts/seed-config.ts

# Seed de dados (seeder completo)
npm run db:seed

# Abrir Prisma Studio
npm run db:studio
```

---

## Padrões de Código

### Naming
- **Arquivos/pastas:** kebab-case (licitacoes, configuracao-site)
- **Variáveis JS:** camelCase (nomeSite, telefoneContato)
- **Campos banco:** snake_case (nome_site, telefone_contato)

### API Routes
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'  // Para Vercel

export async function GET(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  // ...
}
```

### Componentes Client vs Server
- **Server Components:** páginas que buscam dados (`async function Home()`)
- **Client Components:** interatividade (`"use client"` no topo)

---

## Configuração do Site (WordPress Style)

### Ler configs
```typescript
import { getSiteConfig } from '@/lib/site-data'

// Em Server Component
const config = await getSiteConfig()
// { nome_site: "Portal da Transparência", ... }
```

### Salvar configs
```bash
curl -X POST "https://.../api/configuracao-site" \
  -H "Authorization: Bearer transparencia360-api-2026-secure-token" \
  -H "Content-Type: application/json" \
  -d '{"nome_site": "Novo Nome", "email_contato": "novo@email.br"}'
```

### Adicionar nova config
Basta enviar uma nova chave no POST - o banco cria automaticamente.

---

## Deploy Vercel

1. Conectar GitHub repo na Vercel
2. Configurar Environment Variables:
   - DATABASE_URL
   - NEXTAUTH_SECRET
   - NEXTAUTH_URL
   - API_BEARER_TOKEN
3. Deploy automático no push para master

**Build usa:** `npm run build` (que roda `prisma generate && next build`)

---

## Seed de Configurações

Rodar localmente para criar configs padrão:
```bash
npx tsx scripts/seed-config.ts
```

Cria 26 registros com dados da Prefeitura de Tefé-AM.

---

## Autenticação

Arquivo: `src/lib/auth.ts`

Tokens válidos:
- `transparencia360-api-2026-secure-token` (produção)
- `dev-api-Key-2026` (desenvolvimento)
- Valor de `NEXTAUTH_SECRET`

---

## Skills Disponíveis

- `.opencode/prisma-mariadb/SKILL.md` - Workflow Prisma + MariaDB

---

## O que fazer ao iniciar novo contexto

1. **Ler .env** para credenciais do banco
2. **Verificar se prisma generate** foi rodado
3. **Rodar seed-config** se for novo banco
4. **Usar site-data.ts** para buscar dados
5. **API usa Bearer Token** em todas as rotas autenticadas
6. **Dynamic = force-dynamic** em todas API routes para Vercel
7. **SEMPRE** Checar segurança do app
9. **Após finalizar o pedido** Suba para o repositório no github comitando em pt-br