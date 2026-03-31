# API de Receitas

Base URL: `http://localhost:3000/api/receitas`

## Autenticação

Todos os endpoints desta API requerem autenticação Bearer Token.

**Header:**
```
Authorization: Bearer <SEU_TOKEN>
```

---

## Listar Todas as Receitas

### GET `/api/receitas`

Retorna lista de todas as receitas cadastradas.

**Parâmetros de Query:**
- `exercicio` (opcional): Filtrar por ano de exercício
- `categoriaEconomica` (opcional): Filtrar por categoria (corrente/capital)

**Exemplo de Requisição:**
```bash
curl -X GET "http://localhost:3000/api/receitas?exercicio=2026" \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta (200):**
```json
[
  {
    "id": "rec123abc",
    "exercicio": 2026,
    "mes": null,
    "codigoNatureza": "1000.00.00",
    "naturezaReceita": "Imposto sobre a Renda e Proventos de Qualquer Natureza",
    "categoriaEconomica": "corrente",
    "fonteRecurso": "001",
    "fonteRecursoNome": "Tesouro",
    "valorPrevisto": 5000000,
    "valorArrecadado": 1500000,
    "createdAt": "2026-03-30T20:00:00.000Z",
    "updatedAt": "2026-03-30T20:00:00.000Z"
  }
]
```

---

## Obter Receita por ID

### GET `/api/receitas/[id]`

Retorna uma receita específica pelo ID.

**Parâmetros de URL:**
- `id` (string): ID da receita

**Exemplo de Requisição:**
```bash
curl -X GET http://localhost:3000/api/receitas/rec123abc \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta (200):**
```json
{
  "id": "rec123abc",
  "exercicio": 2026,
  "mes": null,
  "codigoNatureza": "1000.00.00",
  "naturezaReceita": "Imposto sobre a Renda e Proventos de Qualquer Natureza",
  "categoriaEconomica": "corrente",
  "fonteRecurso": "001",
  "fonteRecursoNome": "Tesouro",
  "valorPrevisto": 5000000,
  "valorArrecadado": 1500000,
  "createdAt": "2026-03-30T20:00:00.000Z",
  "updatedAt": "2026-03-30T20:00:00.000Z"
}
```

**Resposta (404):**
```json
{
  "error": "Receita não encontrada"
}
```

---

## Criar Receita

### POST `/api/receitas`

Cria uma nova receita.

**Body (JSON):**
```json
{
  "exercicio": 2026,
  "mes": 1,
  "codigoNatureza": "1000.00.00",
  "naturezaReceita": "Imposto sobre a Renda",
  "categoriaEconomica": "corrente",
  "fonteRecurso": "001",
  "fonteRecursoNome": "Tesouro",
  "valorPrevisto": 5000000,
  "valorArrecadado": 1500000
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|------------|
| exercicio | integer | Sim | Ano do exercício |
| mes | integer | Não | Mês de referência (1-12) |
| codigoNatureza | string | Sim | Código da natureza da receita |
| naturezaReceita | string | Sim | Descrição da natureza |
| categoriaEconomica | string | Sim | "corrente" ou "capital" |
| fonteRecurso | string | Não | Código da fonte de recurso |
| fonteRecursoNome | string | Não | Nome da fonte de recurso |
| valorPrevisto | float | Sim | Valor previsto |
| valorArrecadado | float | Sim | Valor arrecadado |

**Exemplo de Requisição:**
```bash
curl -X POST http://localhost:3000/api/receitas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"exercicio": 2026, "codigoNatureza": "1000.00.00", "naturezaReceita": "Imposto sobre a Renda", "categoriaEconomica": "corrente", "valorPrevisto": 5000000, "valorArrecadado": 1500000}'
```

**Resposta (201):**
```json
{
  "id": "rec456def",
  "exercicio": 2026,
  "mes": 1,
  "codigoNatureza": "1000.00.00",
  "naturezaReceita": "Imposto sobre a Renda",
  "categoriaEconomica": "corrente",
  "fonteRecurso": "001",
  "fonteRecursoNome": "Tesouro",
  "valorPrevisto": 5000000,
  "valorArrecadado": 1500000,
  "createdAt": "2026-03-30T20:30:00.000Z",
  "updatedAt": "2026-03-30T20:30:00.000Z"
}
```

---

## Atualizar Receita

### PUT `/api/receitas/[id]`

Atualiza uma receita existente.

**Parâmetros de URL:**
- `id` (string): ID da receita

**Body (JSON):**
```json
{
  "valorArrecadado": 2000000,
  "mes": 2
}
```

**Exemplo de Requisição:**
```bash
curl -X PUT http://localhost:3000/api/receitas/rec456def \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"valorArrecadado": 2000000}'
```

**Resposta (200):**
```json
{
  "id": "rec456def",
  "exercicio": 2026,
  "mes": 2,
  "codigoNatureza": "1000.00.00",
  "naturezaReceita": "Imposto sobre a Renda",
  "categoriaEconomica": "corrente",
  "fonteRecurso": "001",
  "fonteRecursoNome": "Tesouro",
  "valorPrevisto": 5000000,
  "valorArrecadado": 2000000,
  "createdAt": "2026-03-30T20:30:00.000Z",
  "updatedAt": "2026-03-30T21:00:00.000Z"
}
```

---

## Deletar Receita

### DELETE `/api/receitas/[id]`

Remove uma receita do banco de dados.

**Parâmetros de URL:**
- `id` (string): ID da receita

**Exemplo de Requisição:**
```bash
curl -X DELETE http://localhost:3000/api/receitas/rec456def \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta (200):**
```json
{
  "message": "Receita deletada com sucesso"
}
```

**Resposta (404):**
```json
{
  "error": "Receita não encontrada"
}
```

---

## Códigos de Status

| Código | Descrição |
|--------|-----------|
| 200    | Sucesso |
| 201    | Criado com sucesso |
| 400    | Erro na requisição (dados inválidos) |
| 401    | Não autorizado (token inválido ou ausente) |
| 403    | Proibido (IP não permitido) |
| 404    | Recurso não encontrado |
| 500    | Erro interno do servidor |
