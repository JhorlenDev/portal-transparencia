# API de Despesas

Base URL: `http://localhost:3000/api/despesas`

## Autenticação

Todos os endpoints desta API requerem autenticação Bearer Token.

**Header:**
```
Authorization: Bearer <SEU_TOKEN>
```

---

## Listar Todas as Despesas

### GET `/api/despesas`

Retorna lista de todas as despesas cadastradas.

**Parâmetros de Query:**
- `exercicio` (opcional): Filtrar por ano de exercício
- `orgaoNome` (opcional): Filtrar por nome do órgão
- `tipoMovimento` (opcional): Filtrar por tipo (empenho/liquidacao/pagamento)

**Exemplo de Requisição:**
```bash
curl -X GET "http://localhost:3000/api/despesas?exercicio=2026" \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta (200):**
```json
[
  {
    "id": "desp123abc",
    "exercicio": 2026,
    "numeroEmpenho": "2026NE0001",
    "dataEmpenho": "2026-01-15T00:00:00.000Z",
    "tipoMovimento": "empenho",
    "credorNome": "Empresa ABC Ltda",
    "credorCpfCnpj": "12.345.678/0001-90",
    "objeto": "Fornecimento de materiais de escritório",
    "historico": null,
    "orgaoId": null,
    "orgaoNome": "Secretaria Municipal de Educação",
    "elementoDespesa": "33.90.30",
    "elementoDespesaNome": "Material de Consumo",
    "valorEmpenhado": 15000,
    "valorLiquidado": 12000,
    "valorPago": 10000,
    "createdAt": "2026-03-30T20:00:00.000Z",
    "updatedAt": "2026-03-30T20:00:00.000Z"
  }
]
```

---

## Obter Despesa por ID

### GET `/api/despesas/[id]`

Retorna uma despesa específica pelo ID.

**Parâmetros de URL:**
- `id` (string): ID da despesa

**Exemplo de Requisição:**
```bash
curl -X GET http://localhost:3000/api/despesas/desp123abc \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta (200):**
```json
{
  "id": "desp123abc",
  "exercicio": 2026,
  "numeroEmpenho": "2026NE0001",
  "dataEmpenho": "2026-01-15T00:00:00.000Z",
  "tipoMovimento": "empenho",
  "credorNome": "Empresa ABC Ltda",
  "credorCpfCnpj": "12.345.678/0001-90",
  "objeto": "Fornecimento de materiais de escritório",
  "orgaoNome": "Secretaria Municipal de Educação",
  "elementoDespesa": "33.90.30",
  "elementoDespesaNome": "Material de Consumo",
  "valorEmpenhado": 15000,
  "valorLiquidado": 12000,
  "valorPago": 10000,
  "createdAt": "2026-03-30T20:00:00.000Z",
  "updatedAt": "2026-03-30T20:00:00.000Z"
}
```

---

## Criar Despesa

### POST `/api/despesas`

Cria uma nova despesa.

**Body (JSON):**
```json
{
  "exercicio": 2026,
  "numeroEmpenho": "2026NE0001",
  "dataEmpenho": "2026-01-15",
  "tipoMovimento": "empenho",
  "credorNome": "Empresa ABC Ltda",
  "credorCpfCnpj": "12.345.678/0001-90",
  "objeto": "Fornecimento de materiais de escritório",
  "orgaoNome": "Secretaria Municipal de Educação",
  "elementoDespesa": "33.90.30",
  "elementoDespesaNome": "Material de Consumo",
  "valorEmpenhado": 15000,
  "valorLiquidado": 12000,
  "valorPago": 10000
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|------------|
| exercicio | integer | Sim | Ano do exercício |
| numeroEmpenho | string | Sim | Número do empenho |
| dataEmpenho | date | Não | Data do empenho |
| tipoMovimento | string | Sim | Tipo: engajamento/liquidacao/pagamento |
| credorNome | string | Não | Nome do credor |
| credorCpfCnpj | string | Não | CPF ou CNPJ do credor |
| objeto | string | Não | Objeto da despesa |
| historico | string | Não | Histórico |
| orgaoId | string | Não | ID do órgão |
| orgaoNome | string | Não | Nome do órgão |
| elementoDespesa | string | Não | Elemento de despesa |
| elementoDespesaNome | string | Não | Nome do elemento |
| valorEmpenhado | float | Não | Valor_empenhado |
| valorLiquidado | float | Não | Valor liquidado |
| valorPago | float | Não | Valor pago |

---

## Atualizar Despesa

### PUT `/api/despesas/[id]`

Atualiza uma despesa existente.

**Parâmetros de URL:**
- `id` (string): ID da despesa

**Body (JSON):**
```json
{
  "valorLiquidado": 15000,
  "valorPago": 12000
}
```

---

## Deletar Despesa

### DELETE `/api/despesas/[id]`

Remove uma despesa do banco de dados.

**Parâmetros de URL:**
- `id` (string): ID da despesa

---

## Códigos de Status

| Código | Descrição |
|--------|-----------|
| 200    | Sucesso |
| 201    | Criado com sucesso |
| 400    | Erro na requisição |
| 401    | Não autorizado |
| 403    | Proibido (IP não permitido) |
| 404    | Recurso não encontrado |
| 500    | Erro interno do servidor |
