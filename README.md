# Portal da Transparência 360

Portal de transparência pública municipal desenvolvido com Next.js 16, React 19 e Prisma (MySQL). Apresenta dados de receitas, despesas, contratos, licitações, convênios e servidores públicos.

## Tecnologias

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend**: API Routes do Next.js, Prisma ORM
- **Database**: MySQL
- **UI Components**: Radix UI, Lucide Icons

## Funcionalidades

### Páginas de Dados

| Página | Descrição |
|--------|-----------|
| `/despesas` | Despesas públicas com filtro por ano, credor e categoria |
| `/receitas` | Receitas previstas e arrecadadas por exercício |
| `/contratos` | Contratos administrativos, atas e aditivos |
| `/licitacoes` | Processos licitatórios, dispensas e inexigibilidades |
| `/convenios` | Convênios, termos de colaboração e transferências |
| `/servidores` | Quadro de pessoal e remuneração dos servidores |

### Recursos

- **Busca Global**: `/busca` - Pesquisa unificada em todas as entidades
- **Anexos**: Modal de download de documentos em todas as tabelas
- **Filtros**: Barras de filtro por ano, status, categoria e texto
- **Dados Estruturados**: SEO otimizado com schema.org
- **Responsivo**: Layout adaptável para mobile e desktop

## Integração com API Externa

### Endpoint de Importação

```
POST /api/acordar/webhook
```

Recebe dados da API externa (Prefeitura360) e sincroniza com o banco local.

**Entidades suportadas**:
- `despesas` - Despesas públicas
- `receitas` - Receitas municipais
- `contratos` - Contratos administrativos
- `licitacoes` - Processos licitatórios
- `convenios` - Convênios e transferências
- `servidores` - Servidores públicos

**Funcionalidades**:
- Sincronização completa (upsert)
- Armazenamento do payload original na coluna `payload`
- Download automático de anexos da API externa
- Remoção de registros que não existem mais na API (sync deletion)

### Variáveis de Ambiente

```env
DATABASE_URL=mysql://user:password@host:3306/database
ACORDAR_API_URL=https://api.prefeitura360.com.br
ACORDAR_API_KEY=sua-chave-de-api
```

## Executando o Projeto

```bash
# Instalar dependências
npm install

# Gerar Prisma Client
npx prisma generate

# Executar migrações
npx prisma migrate dev

# Seed de dados iniciais (configurações do site)
npm run db:seed

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

## Configurações do Site

O portal possui configurações editáveis via banco de dados (tabela `ConfiguracaoSite`):

- Nome do site, descrição, logo
- Links para PNCP, Fala.BR, Diário Oficial
- Redes sociais (Facebook, Instagram, YouTube, Twitter)
- Cor primária e secundária
- Informações de contato (endereço, telefone, e-mail)

## Estrutura de Arquivos

```
src/
├── app/                    # Next.js App Router
│   ├── despesas/           # Página de despesas
│   ├── receitas/          # Página de receitas
│   ├── contratos/         # Página de contratos
│   ├── licitacoes/        # Página de licitações
│   ├── convenios/         # Página de convênios
│   ├── servidores/        # Página de servidores
│   ├── busca/             # Busca global
│   └── api/               # API Routes
│       └── acordar/       # Webhook de importação
├── components/            # Componentes React
│   ├── attachments/       # Modal de anexos
│   ├── portal/            # Componentes do portal
│   └── ui/                # Componentes base
├── lib/                   # Funções utilitárias
│   ├── prisma.ts         # Cliente Prisma
│   └── site-data.ts      # Funções de busca de dados
└── styles/               # Estilos globais
```

## Schema do Banco

Principais tabelas (via Prisma):

- `Despesa`, `Receita`, `Contrato`, `Licitacao`, `Convenio`, `Servidor`
- `Anexo` - Arquivos vinculados às entidades
- `ConfiguracaoSite` - Configurações do portal
- `Orgao`, `Credor`, `FonteRecurso` - Dados de apoio

## Desenvolvimento

```bash
# Verificar tipos TypeScript
npx tsc --noEmit

# Verificar lint
npm run lint

# Abrir Prisma Studio
npm run db:studio
```

## Deploy

O projeto está configurado para deploy no Vercel. Configure as variáveis de ambiente na plataforma.

```bash
# Build de produção
npm run build
```

## Licença

MIT