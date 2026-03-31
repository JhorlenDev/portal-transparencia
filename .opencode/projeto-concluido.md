# Portal da Transparência - Transparência360

## Status: ✅ CONCLUÍDO

### O que foi implementado

#### Banco de Dados
- ✅ Prisma ORM configurado (v5.22.0)
- ✅ MariaDB Cloud (produção)
- ✅ Schema com 10 modelos (Orgao, Receita, Despesa, Licitacao, Contrato, Servidor, Convenio, SolicitacaoSIC, Dataset, ConfiguracaoSite)
- ✅ ConfiguracaoSite estilo WordPress Options (chave/valor)
- ✅ Dados de exemplo inseridos (seed)
- ✅ 26 configurações padrão do site

#### Frontend
- ✅ 10 páginas criadas com dados dinâmicos do banco
- ✅ Componentes UI (Button, Card, Input)
- ✅ Header e Footer dinâmicos (buscam config do banco)
- ✅ Tailwind CSS com tema emerald/slate

#### API
- ✅ 8 APIs REST completas (orgaos, receitas, despesas, licitacoes, contratos, servidores, convenios, datasets)
- ✅ API configuracao-site (GET público, POST/PUT autenticado)
- ✅ Autenticação Bearer Token em todas as rotas
- ✅ Rotas [id] com GET, PUT, DELETE

#### Deploy
- ✅ Vercel (https://portal-transparencia-360.vercel.app)
- ✅ GitHub privado (https://github.com/marreiradigital/portal-transparencia-360)

---

## Como Rodar Localmente

```bash
# Instalar dependências
npm install

# Configurar .env (ver biblia.md para credenciais)
cp .env.example .env

# Gerar Prisma Client
npx prisma generate

# Sincronizar banco
npx prisma db push

# Seed de configurações
npx tsx scripts/seed-config.ts

# Rodar desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

---

## Páginas Disponíveis

| Rota | Descrição |
|------|-----------|
| `/` | Home com stats dinâmicos |
| `/receitas` | Receitas públicas |
| `/despesas` | Despesas públicas |
| `/licitacoes` | Licitações |
| `/contratos` | Contratos administrativos |
| `/servidores` | Servidores públicos |
| `/convenios` | Convênios |
| `/esic` | e-SIC |
| `/dados-abertos` | Dados abertos |
| `/busca` | Busca global |

---

## Estrutura do Banco

### Tabelas Principais
- orgaos (5 registros)
- receitas (4 registros)
- despesas (5 registros)
- licitacoes (3 registros)
- contratos (3 registros)
- servidores (3 registros)
- convenios (2 registros)
- datasets (3 registros)
- configuracao_site (26 configurações)

### Configuração do Site (WordPress Options)
Todas as configs do site estão na tabela `configuracao_site`:
- nome_site, subtitulo_site, descricao
- logo_url, favicon_url
- email_contato, telefone_contato, endereco, horario_funcionamento
- facebook, instagram, youtube, twitter
- link_site_oficial, link_pncp, link_fala_br, link_diario_oficial
- cor_primaria, cor_secundaria
- nome_municipio, estado, texto_lai
