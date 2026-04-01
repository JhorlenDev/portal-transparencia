# API de Convênios

Base URL: `http://localhost:3000/api/convenios`

## Autenticação

Todos os endpoints desta API requerem autenticação Bearer Token.

**Header:**
```
Authorization: Bearer <SEU_TOKEN>
```

---

## Listar Todos os Convênios

### GET `/api/convenios`

Retorna lista de todos os convênios cadastrados.

**Parâmetros de Query:**
- `ano` (opcional): Filtrar por ano
- `status` (opcional): Filtrar por status
- `tipo` (opcional): Filtrar por tipo

**Status disponíveis:** em_execucao, encerrado, rescindido, suspended

**Tipos:** convenio, termo_colaboracao, termo_fomento, acordo_cooperacao

---

## Obter Convênio por ID

### GET `/api/convenios/[id]`

Retorna um convênio específico pelo ID.

---

## Criar Convênio

### POST `/api/convenios`

Cria um novo convênio.

**Body (JSON):**
```json
{
  "numero": "001",
  "ano": 2026,
  "tipo": "convenio",
  "objeto": "Aquisição de equipamentos para unidades de saúde",
  "objetoResumido": "Equipamentos de saúde",
  "status": "em_execucao",
  "concedente": "Governo Federal",
  "concedenteCnpj": "00.394.460/0001-05",
  "convenente": "Prefeitura Municipal",
  "dataInicioVigencia": "2026-01-01",
  "dataFimVigencia": "2026-12-31",
  "valorTotal": 500000,
  "valorRepasse": 450000,
  "valorContrapartida": 50000,
  "valorExecutado": 150000,
  "numeroProcesso": "12345.678/2025",
  "linkPlataforma": "https://..."
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|------------|
| numero | string | Sim | Número do convênio |
| ano | integer | Sim | Ano |
| tipo | string | Sim | Tipo de convênio |
| objeto | string | Sim | Objeto completo |
| objetoResumido | string | Não | Objeto resumido |
| status | string | Não | Status (padrão: em_execucao) |
| concedente | string | Sim | Nome do concedente |
| concedenteCnpj | string | Não | CNPJ do concedente |
| convenente | string | Não | Nome do convenente |
| dataInicioVigencia | date | Sim | Data de início |
| dataFimVigencia | date | Não | Data de fim |
| valorTotal | float | Sim | Valor total |
| valorRepasse | float | Não | Valor do repasse |
| valorContrapartida | float | Não | Valor da contrapartida |
| valorExecutado | float | Não | Valor executado |
| numeroProcesso | string | Não | Número do processo |
| linkPlataforma | string | Não | Link na plataforma |

**Resposta (201):**
```json
{
  "message": "Convênio criado com sucesso",
  "id": "conv123abc",
  "data": {
    "id": "conv123abc",
    "numero": "001",
    "ano": 2026,
    "tipo": "convenio",
    "objeto": "Aquisição de equipamentos para unidades de saúde",
    "objetoResumido": "Equipamentos de saúde",
    "status": "em_execucao",
    "concedente": "Governo Federal",
    "concedenteCnpj": "00.394.460/0001-05",
    "convenente": "Prefeitura Municipal",
    "dataInicioVigencia": "2026-01-01T00:00:00.000Z",
    "dataFimVigencia": "2026-12-31T00:00:00.000Z",
    "valorTotal": 500000,
    "valorRepasse": 450000,
    "valorContrapartida": 50000,
    "valorExecutado": 150000,
    "numeroProcesso": "12345.678/2025",
    "linkPlataforma": "https://...",
    "createdAt": "2026-03-30T20:30:00.000Z",
    "updatedAt": "2026-03-30T20:30:00.000Z"
  }
}
```

---

## Atualizar Convênio

### PUT `/api/convenios/[id]`

Atualiza um convênio existente.

---

## Deletar Convênio

### DELETE `/api/convenios/[id]`

Remove um convênio do banco de dados.

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
