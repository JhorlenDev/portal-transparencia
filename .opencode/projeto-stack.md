# Stack Tecnológica do Projeto

## Stack Principal
| Tecnologia | Versão | Uso |
|------------|---------|-----|
| Next.js | 16.2.1 | Framework React full-stack |
| TypeScript | 5.9.3 | Tipagem estática |
| Tailwind CSS | 4.2.2 | Estilização |
| Prisma | 7.6.0 | ORM para banco de dados |
| PostgreSQL | - | Banco de dados relacional |

## Dependências Instaladas

### UI Components
- @radix-ui/react-slot
- class-variance-authority
- clsx
- tailwind-merge
- tailwindcss-animate

### Icons & Utils
- lucide-react
- moment
- recharts

### Forms & Validation
- (pendente de instalar)

### Authentication
- next-auth (pendente)

### API
- @trpc/server
- @trpc/client  
- @trpc/react-query
- @tanstack/react-query
- zod
- superjson

---

## Estrutura de Pastas

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home
│   ├── layout.tsx        # Layout principal
│   ├── despesas/         # Módulo Despesas
│   ├── receitas/         # Módulo Receitas
│   ├── licitacoes/      # Módulo Licitações
│   ├── contratos/       # Módulo Contratos
│   ├── servidores/      # Módulo Servidores
│   ├── convenios/      # Módulo Convênios
│   ├── esic/          # Módulo e-SIC
│   ├── dados-abertos/ # Módulo Dados Abertos
│   └── busca/        # Busca Global
│
├── components/
│   ├── ui/            # Componentes base (Button, Card, Input)
│   └── portal/        # Componentes específicos do portal
│
└── lib/
    ├── prisma.ts      # Cliente Prisma (pendente)
    ├── utils.ts       # Funções utilitárias
    └── ...
```

---

## Variáveis de Ambiente (.env)

```env
# Database
DATABASE_URL="postgresql://usuario:senha@localhost:5432/transparencia360?schema=public"

# NextAuth
NEXTAUTH_SECRET="sua-chave-secreta"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Lint
npm run lint

# Prisma
npx prisma generate      # Gerar cliente
npx prisma migrate dev   # Criar migrações
npx prisma studio        # Visualizar banco
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
