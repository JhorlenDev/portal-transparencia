---
name: Prisma + MariaDB Cloud
description: Workflow para atualizar schema do Prisma com banco MariaDB Cloud
---

# Skill: Prisma + MariaDB Cloud

## Contexto
Este projeto usa Prisma ORM com MariaDB Cloud. O banco está configurado no `.env` com as variáveis:
- `DATABASE_URL`
- `MARIADB_CLOUD_IP`
- `MARIADB_CLOUD_DB`
- `MARIADB_CLOUD_USER`
- `MARIADB_CLOUD_PASS`
- `MARIADB_CLOUD_PORT`

## Workflow Padrão

### 1. Verificar Configuração do Banco
Sempre verificar o `.env` primeiro para obter as credenciais do banco de dados.

### 2. Verificar Schema Prisma
Ler `prisma/schema.prisma` para entender a estrutura atual:
- Provider está definido como `mysql`
- Model `Orgao` é a tabela principal com foreign keys

### 3. Atualizar Schema Prisma
Ao adicionar campos:
- Usar snake_case no banco (`@map("nome_campo")`)
- Booleanos usam `Boolean @default(false)`
- Tipos: String, Int, Float, DateTime, Boolean
- Para relacionamentos: `orgaoId String? @map("orgao_id")` + `orgao Orgao? @relation(...)`

### 4. Verificar migration_lock.toml
Antes de rodar migrações, verificar `prisma/migrations/migration_lock.toml`:
- Deve estar com `provider = "mysql"` (não sqlite)
- Se estiver sqlite, alterar para mysql

### 5. Executar Comando Correto
Para MariaDB Cloud (sem permissão de criar shadow database):
```bash
npx prisma db push
```
Para SQLite/PostgreSQL local:
```bash
npx prisma migrate dev --name nome_da_migracao
```

### 6. Gerar Client
Sempre executar após db push:
```bash
npx prisma generate
```

## Erros Comuns

### Error P3019
"Specified datasource does not match"
→ Solução: Alterar `migration_lock.toml` de `sqlite` para `mysql`

### Error P3014
"Could not create shadow database"
→ Solução: Usar `npx prisma db push` ao invés de `migrate dev`

## Estrutura de Modelos (Exemplo Licitacao)
```prisma
model Licitacao {
  id                String   @id @default(cuid())
  autoridade        String?  @map("autoridade")
  numero            String
  ano               Int
  modalidade        String
  // ... outros campos
  orgaoId           String?  @map("orgao_id")
  orgao             Orgao?   @relation(fields: [orgaoId], references: [id])
  createdAt         DateTime @default(now()) @map("created_date")
  updatedAt         DateTime @updatedAt @map("updated_date")

  @@map("licitacoes")
}
```

## Documentação
Atualizar `document-api/<modelo>.md` com:
- Lista completa de campos
- Tipos, obrigatoriedade, descrições
- Exemplo de payload JSON
- Estrutura da tabela (CREATE TABLE)
