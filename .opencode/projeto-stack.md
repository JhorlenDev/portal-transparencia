# Stack Tecnológica do Projeto

## Stack Principal
| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 16.2.1 | Framework React full-stack |
| TypeScript | 5.x | Tipagem estática |
| Tailwind CSS | 4.x | Estilização |
| Prisma | 5.22.0 | ORM para banco de dados |
| MariaDB Cloud | - | Banco de dados MySQL (produção) |
| Vercel | - | Hospedagem/deploy |

## Dependências Instaladas

### UI Components
- @radix-ui/react-slot
- @radix-ui/react-alert-dialog
- class-variance-authority
- clsx
- tailwind-merge
- tailwindcss-animate (pendente)

### Icons & Utils
- lucide-react
- recharts (pendente)

### API & Auth
- next-auth (pendente)
- zod

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
│   ├── ui/                         # Componentes base (Button, Card, Input)
│   └── portal/                     # Header, Footer
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
├── licitacoes.md
├── contratos.md
├── convenios.md
├── servidores.md
├── despesas.md
├── receitas.md
├── orgaos.md
├── datasets.md
└── configuracao-site.md           # API WordPress Options
```

---

## Variáveis de Ambiente (.env)

```
DATABASE_URL="mysql://user:pass@host:3306/database"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://..."
API_BEARER_TOKEN="..."
```

**IMPORTANTE:** `.env` NÃO está no git

---

## Comandos Úteis

```bash
# desenvolvimento local
npm run dev

# Build produção
npm run build

# Sincronizar schema com banco
npx prisma db push

# Gerar Prisma Client
npx prisma generate

# Seed de configurações
npx tsx scripts/seed-config.ts

# Seed de dados
npm run db:seed

# Abrir Prisma Studio
npm run db:studio
```

---

## Design System

### Cores Principais
- Primary: Emerald (#059669 / #047857)
- Background: Slate-50 (#f8fafc)
- Text: Slate-900 (#0f172a)

### Fontes
- Inter (Google Fonts)

### Componentes
Os componentes seguem o padrão shadcn/ui com customizações para o tema do Portal da Transparência.
