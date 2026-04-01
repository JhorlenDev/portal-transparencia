# API de Licitações

Base URL: `http://localhost:3000/api/licitacoes`

## Autenticação

Todos os endpoints desta API requerem autenticação Bearer Token.

**Header:**
```
Authorization: Bearer <SEU_TOKEN>
```

---

## Listar Todas as Licitações

### GET `/api/licitacoes`

Retorna lista de todas as licitações cadastradas.

**Parâmetros de Query:**
- `ano` (opcional): Filtrar por ano
- `status` (opcional): Filtrar por status
- `modalidade` (opcional): Filtrar por modalidade

**Exemplo:**
```bash
curl -X GET "http://localhost:3000/api/licitacoes?ano=2026" \
  -H "Authorization: Bearer <TOKEN>"
```

**Status disponíveis:** planejamento, publicado, em_andamento, homologado, revoked

**Modalidades:** pregao_eletronico, tomada_precos, convite, concorrencia, dispensa, inexigibilidade

---

## Obter Licitação por ID

### GET `/api/licitacoes/[id]`

Retorna uma licitação específica pelo ID.

---

## Criar Licitação

### POST `/api/licitacoes`

Cria uma nova licitação.

**Body (JSON):**
```json
{
  "autoridade": "Prefeitura",
  "modalidade": "Pregão",
  "regulamento": "Lei 14.133/2021",
  "numero_licitacao": "001",
  "ano": 2026,
  "numero_edital": "001/2026",
  "numero_proc_administrativo": "12345.6789/2026",
  "numero_processo": "01234.5678/2026",
  "fundamento_legal": "Art. 37, inciso XXI da Constituição Federal",
  "ano_referencia": 2026,
  "referencia_processo": "Processo de referência",
  "reeditacao": false,
  "convenio_transfergov": "convênio-001/2026",
  "ano_convenio": 2026,
  "enviar_transfergov": false,
  "tipo_objeto": "Aquisição",
  "fonte_orcamentaria": "Recursos Próprios",
  "objeto": "Aquisição de materiais de escritório",
  "observacao": "Observação adicional sobre a licitação",
  "tipo_contrato": "Contrato de Fornecimento",
  "validade_meses": 12,
  "prazo_pagamento": "30 dias",
  "status": "Aberto",
  "valor_estimado": 150000.00,
  "data_abertura": "2026-01-20",
  "orgao_nome": "Prefeitura Municipal"
}
```

**Campos:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|------------|
| autoridade | varchar(255) | Não | Autoridade responsável |
| modalidade | varchar(255) | **Sim** | Modalidade da licitação |
| regulamento | varchar(255) | Não | Regulamento aplicável (ex: Lei 14.133/2021) |
| numero_licitacao | varchar(50) | Não | Número da licitação |
| ano | integer | **Sim** | Ano da licitação |
| numero_edital | varchar(50) | Não | Número do edital |
| numero_proc_administrativo | varchar(100) | Não | Número do processo administrativo |
| numero_processo | varchar(100) | Não | Número do processo |
| fundamento_legal | text | Não | Fundamento legal da licitação |
| ano_referencia | integer(4) | Não | Ano de referência |
| referencia_processo | varchar(100) | Não | Referência do processo |
| reeditacao | boolean | Não | Indica se é reiteração (padrão: false) |
| convenio_transfergov | varchar(255) | Não | Convênio TransferGov |
| ano_convenio | integer(4) | Não | Ano do convênio |
| enviar_transfergov | boolean | Não | Enviar para TransferGov (padrão: false) |
| tipo_objeto | varchar(100) | Não | Tipo do objeto (ex: Aquisição, Serviço, Obra) |
| fonte_orcamentaria | varchar(255) | Não | Fonte orçamentária |
| orgao_id | uuid | Não | ID do órgão (relação) |
| orgao_nome | varchar(255) | Não | Nome do órgão |
| objeto | varchar(500) | **Sim** | Objeto completo da licitação |
| observacao | varchar(255) | Não | Observação adicional |
| tipo_contrato | varchar(100) | Não | Tipo de contrato |
| validade_meses | integer(3) | Não | Validade em meses |
| prazo_pagamento | varchar(50) | Não | Prazo de pagamento |
| status | varchar(50) | **Sim** | Status da licitação (padrão: planejamento) |
| valor_estimado | decimal(15,2) | Não | Valor estimado |
| data_abertura | date | Não | Data de abertura |
| criterio_julgamento | varchar(100) | Não | Critério de julgamento |
| justificativa | text | Não | Justificativa |
| link_pncp | varchar(500) | Não | Link no PNCP |

**Resposta (201):**
```json
{
  "message": "Licitação criada com sucesso",
  "id": "lic123abc",
  "data": {
    "id": "lic123abc",
    "numero": "001",
    "ano": 2026,
    "modalidade": "Pregão",
    "objeto": "Aquisição de materiais de escritório",
    "status": "planejamento",
    "valorEstimado": 150000,
    "createdAt": "2026-03-30T20:30:00.000Z",
    "updatedAt": "2026-03-30T20:30:00.000Z"
  }
}
```

---

## Atualizar Licitação

### PUT `/api/licitacoes/[id]`

Atualiza uma licitação existente.

---

## Deletar Licitação

### DELETE `/api/licitacoes/[id]`

Remove uma licitação do banco de dados.

---

## Estrutura da Tabela (Banco de Dados)

```sql
CREATE TABLE licitacoes (
    id VARCHAR(36) PRIMARY KEY,
    autoridade VARCHAR(255),
    modalidade VARCHAR(255) NOT NULL,
    regulamento VARCHAR(255),
    numero_licitacao VARCHAR(50),
    ano INT(4) NOT NULL,
    numero_edital VARCHAR(50),
    numero_proc_administrativo VARCHAR(100),
    numero_processo VARCHAR(100),
    fundamento_legal TEXT,
    ano_referencia INT(4),
    referencia_processo VARCHAR(100),
    reeditacao TINYINT(1) DEFAULT 0,
    convenio_transfergov VARCHAR(255),
    ano_convenio INT(4),
    enviar_transfergov TINYINT(1) DEFAULT 0,
    tipo_objeto VARCHAR(100),
    fonte_orcamentaria VARCHAR(255),
    orgao_id VARCHAR(36),
    orgao_nome VARCHAR(255),
    objeto VARCHAR(500) NOT NULL,
    observacao VARCHAR(255),
    tipo_contrato VARCHAR(100),
    validade_meses INT(3),
    prazo_pagamento VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'planejamento',
    valor_estimado DECIMAL(15,2),
    data_abertura DATE,
    criterio_julgamento VARCHAR(100),
    justificativa TEXT,
    link_pncp VARCHAR(500),
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL,
    FOREIGN KEY (orgao_id) REFERENCES Orgao(id) ON DELETE SET NULL ON UPDATE CASCADE
);
```

---

## Códigos de Status

| Código | Descrição |
|--------|-----------|
| 200    | Sucesso |
| 201    | Criado com sucesso |
| 400    | Erro na requisição |
| 401    | Não autorizado |
| 403    | Proibido |
| 404    | Recurso não encontrado |
| 500    | Erro interno do servidor |
