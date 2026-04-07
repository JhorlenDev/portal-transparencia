# API de Transparência - Visão Geral

Este documento descreve a API de transparência utilizada para integração com o portal externo de transparência.

## Endpoints Disponíveis

### 1. GET /api/transparencia/[entity]

Retorna os dados de uma entidade específica do módulo de transparência.

**Autenticação:** Bearer Token (TRANSPARENCIA_CREDENCIAL do .env)

**Parâmetros de Query:**
- `org` (obrigatório): Slug da organização
- `limit` (opcional): Limite de registros (padrão: 500, máximo: 500)
- `offset` (opcional): Offset para paginação (padrão: 0)

**Exemplo de requisição:**
```bash
curl -X GET "https://prefeitura.tefe.am.gov.br/api/transparencia/despesas?org=prefeitura-test" \
```

**Entidades disponíveis:**

| Entity | Tabela Prisma | Descrição |
|--------|---------------|------------|
| `settings` | transparencyModuleSetting | Configurações do módulo |
| `roles` | transparencyModuleRole | Roles de usuários |
| `macro_categories` | transparencyMacroCategory | Categorias macro |
| `publications` | transparencyPublication | Publicações |
| `publication_attachments` | transparencyPublicationAttachment | Anexos de publicações |
| `publication_relations` | transparencyPublicationRelation | Relações de publicações |
| `collections` | transparencyCollection | Coleções |
| `collection_items` | transparencyCollectionItem | Itens de coleção |
| `legal_obligations` | transparencyLegalObligation | Obrigações legais |
| `datasets` | transparencyDataset | Datasets |
| `import_jobs` | transparencyImportJob | Jobs de importação |
| `revenues` | transparencyRevenue | Receitas |
| `expenses` | transparencyExpense | Despesas |
| `procurements` | transparencyProcurement | Licitações |
| `contracts` | transparencyContract | Contratos |
| `agreements` | transparencyAgreement | Convênios |
| `server_payroll` | transparencyServerPayroll | Folha de pagamento |
| `projects_works` | transparencyProjectWork | Obras |
| `workflow_events` | transparencyWorkflowEvent | Eventos de workflow |
| `audit_logs` | transparencyAuditLog | Logs de auditoria |
| `internal_comments` | transparencyInternalComment | Comentários internos |
| `responsible_orgs` | transparencyResponsibleOrg | Órgãos responsáveis |

**Resposta:**
```json
{
  "entity": "despesas",
  "org": "prefeitura-test",
  "total": 10,
  "limit": 500,
  "offset": 0,
  "data": [
    {
      "id": "xxx",
      "organization_id": "yyy",
      "commitment_number": "001/2024",
      "creditor_name": "Fornecedor ABC",
      "cpf_cnpj": "12.345.678/0001-90",
      "object": "Material de escritório",
      "value": 15000.00,
      "fiscal_year": 2024,
      "budget_element": "339030",
      "org_unit": "Prefeitura Municipal",
      "commitment_date": "2024-01-15",
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 2. POST /api/transparencia-notify

Notifica o sistema externo sobre alterações em uma organização. Este endpoint é **assíncrono** - não espera resposta do webhook.

**Body (JSON):**
```json
{
  "orgao": "prefeitura-test"
}
```
Ou:
```json
{
  "orgao_slug": "prefeitura-test"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Notificação enviada"
}
```

## Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# Credencial para autenticação Bearer nos endpoints GET
TRANSPARENCIA_CREDENCIAL="sua_credencial_aqui"

# URL do webhook para notificações assíncronas
TRANSPARENCIA_WEBHOOK_URL="https://transparencia.tefe.am.gov.br/api/acordar/webhook"
```

## Fluxo de Sincronização (Assíncrono)

### Antes (P2P - Point-to-Point)
O sistema anterior enviava POST diretamente para o endpoint externo e **esperava a resposta** antes de continuar:
1. Criar/Atualizar registro no banco local
2. Enviar POST para API externa
3. **Esperar resposta** (bloqueante)
4. Se OK, continuar

### Depois (Async Webhook)
O novo sistema envia uma notificação assíncrona e **não espera resposta**:
1. Criar/Atualizar registro no banco local
2. Enviar POST para `/api/transparencia-notify` com `orgao=:slug`
3. O servidor envia notificação para `TRANSPARENCIA_WEBHOOK_URL` sem esperar resposta
4. Imediatamente retorna sucesso para o usuário
5. O sistema externo procesa a notificação e busca os dados via GET

## Schemas JSON por Entidade

### Despesas (expenses)
```json
{
  "id": "string",
  "organization_id": "string",
  "commitment_number": "string",
  "creditor_name": "string",
  "cpf_cnpj": "string",
  "object": "string",
  "value": "number|null",
  "fiscal_year": "number|null",
  "budget_element": "string",
  "org_unit": "string",
  "commitment_date": "string",
  "created_at": "string|null"
}
```

### Receitas (revenues)
```json
{
  "id": "string",
  "organization_id": "string",
  "accounting_id": "string",
  "revenue_nature": "string",
  "predicted_value": "number|null",
  "collected_value": "number|null",
  "fiscal_year": "number|null",
  "org_unit": "string",
  "source_destination": "string",
  "created_at": "string|null"
}
```

### Contratos (contracts)
```json
{
  "id": "string",
  "organization_id": "string",
  "contract_number": "string",
  "contract_year": "number|null",
  "contractor_name": "string",
  "contractor_cnpj": "string",
  "object": "string",
  "status": "string",
  "initial_value": "number|null",
  "start_date": "string",
  "end_date": "string",
  "manager_name": "string",
  "created_at": "string|null"
}
```

### Licitações (procurements)
```json
{
  "id": "string",
  "organization_id": "string",
  "procurement_number": "string",
  "procurement_year": "number|null",
  "modality": "string",
  "object": "string",
  "status": "string",
  "estimated_value": "number|null",
  "opening_date": "string",
  "org_unit": "string",
  "process_number": "string",
  "legal_basis": "string",
  "authority": "string",
  "regulation": "string",
  "notice_number": "string",
  "admin_process_number": "string",
  "reference_year": "number|null",
  "reference_process": "string",
  "is_reissue": "boolean",
  "transferegov_agreement": "string",
  "send_transferegov": "boolean",
  "agreement_year": "string",
  "object_type": "string",
  "budget_source": "string",
  "observation": "string",
  "contract_type": "string",
  "contract_validity_months": "number|null",
  "payment_term": "string",
  "created_at": "string|null"
}
```

### Convênios (agreements)
```json
{
  "id": "string",
  "organization_id": "string",
  "parties": "string",
  "object": "string",
  "status": "string",
  "total_value": "number|null",
  "start_date": "string",
  "end_date": "string",
  "goals": "string",
  "created_at": "string|null"
}
```

### Servidores/Pagamento (server_payroll)
```json
{
  "id": "string",
  "organization_id": "string",
  "server_name": "string",
  "position": "string",
  "department": "string",
  "employment_type": "string",
  "base_salary": "number|null",
  "benefits": "number|null",
  "allowances": "number|null",
  "deductions": "number|null",
  "net_salary": "number|null",
  "reference_period": "string",
  "created_at": "string|null"
}
```

### Datasets (datasets)
```json
{
  "id": "string",
  "organization_id": "string",
  "name": "string",
  "slug": "string",
  "description": "string|null",
  "area": "string|null",
  "periodicity": "string|null",
  "status": "string",
  "last_updated_at": "string|null",
  "created_at": "string|null"
}
```

### Órgãos Responsáveis (responsible_orgs)
```json
{
  "id": "string",
  "organization_id": "string",
  "name": "string",
  "slug": "string",
  "short_name": "string|null",
  "description": "string|null",
  "is_active": "boolean",
  "sort_order": "number"
}
```

### Publicações (publications)
```json
{
  "id": "string",
  "organization_id": "string",
  "title": "string",
  "summary": "string|null",
  "content": "string|null",
  "publication_type": "string|null",
  "macro_category_id": "string|null",
  "document_date": "string|null",
  "legal_basis": "string|null",
  "official_reference_number": "string|null",
  "official_reference_year": "number|null",
  "process_reference": "string|null",
  "keywords": "string[]",
  "editorial_status": "string",
  "version_number": "number",
  "published_at": "string|null",
  "created_at": "string|null"
}
```

### Obrigações Legais (legal_obligations)
```json
{
  "id": "string",
  "organization_id": "string",
  "responsible_organization_id": "string|null",
  "title": "string",
  "description": "string|null",
  "macro_category_id": "string|null",
  "legal_basis": "string|null",
  "expected_frequency": "string",
  "current_status": "string",
  "next_due_at": "string|null",
  "last_evidence_at": "string|null",
  "justification": "string|null"
}
```

### Categorias Macro (macro_categories)
```json
{
  "id": "string",
  "organization_id": "string",
  "name": "string",
  "slug": "string",
  "description": "string|null",
  "status": "string",
  "created_at": "string|null"
}
```

### Coleções (collections)
```json
{
  "id": "string",
  "organization_id": "string",
  "title": "string",
  "description": "string|null",
  "public_slug": "string",
  "editorial_status": "string",
  "created_at": "string|null"
}
```

### Jobs de Importação (import_jobs)
```json
{
  "id": "string",
  "organization_id": "string",
  "import_type": "string|null",
  "source_type": "string|null",
  "reference_period": "string|null",
  "started_by": "string|null",
  "started_at": "string|null",
  "finished_at": "string|null",
  "status": "string",
  "total_processed": "number",
  "total_errors": "number",
  "created_at": "string|null"
}
```

### Logs de Auditoria (audit_logs)
```json
{
  "id": "string",
  "organization_id": "string",
  "actor_user_id": "string|null",
  "entity_type": "string",
  "entity_id": "string|null",
  "action": "string",
  "before_data": "any",
  "after_data": "any",
  "metadata": "any",
  "created_at": "string|null"
}
```

### Eventos de Workflow (workflow_events)
```json
{
  "id": "string",
  "organization_id": "string",
  "entity_type": "string|null",
  "entity_id": "string|null",
  "from_status": "string|null",
  "to_status": "string",
  "comment": "string|null",
  "actor_user_id": "string|null",
  "created_at": "string|null"
}
```

## Exemplos de Uso

### Listar todas as despesas de uma organização
```bash
curl -X GET "https://prefeitura.tefe.am.gov.br/api/transparencia/expenses?org=prefeitura-test&limit=100" \
  -H "Authorization: Bearer JURUbeba2026@"
```

### Notificar sobre alteração
```bash
curl -X POST "https://prefeitura.tefe.am.gov.br/api/transparencia-notify" \
  -H "Content-Type: application/json" \
  -d '{"orgao": "prefeitura-test"}'
```

### Listar todas as licitações
```bash
curl -X GET "https://prefeitura.tefe.am.gov.br/api/transparencia/procurements?org=prefeitura-test" \
  -H "Authorization: Bearer JURUbeba2026@"
```
