# API de Órgãos

Base URL: `http://localhost:3000/api/orgaos`

## Autenticação

Todos os endpoints desta API requerem autenticação Bearer Token.

**Header:**
```
Authorization: Bearer <SEU_TOKEN>
```

---

## Listar Todos os Órgãos

### GET `/api/orgaos`

Retorna lista de todos os órgãos cadastrados.

**Parâmetros de Query:**
- Nenhum

**Exemplo de Requisição:**
```bash
curl -X GET http://localhost:3000/api/orgaos \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta (200):**
```json
[
  {
    "id": "clx123abc",
    "nome": "Prefeitura Municipal",
    "sigla": "PM",
    "cnpj": null,
    "ativo": true,
    "createdAt": "2026-03-30T20:00:00.000Z",
    "updatedAt": "2026-03-30T20:00:00.000Z"
  },
  {
    "id": "clx456def",
    "nome": "Secretaria Municipal de Educação",
    "sigla": "SME",
    "cnpj": "12.345.678/0001-90",
    "ativo": true,
    "createdAt": "2026-03-30T20:00:00.000Z",
    "updatedAt": "2026-03-30T20:00:00.000Z"
  }
]
```

---

## Obter Órgão por ID

### GET `/api/orgaos/[id]`

Retorna um órgão específico pelo ID.

**Parâmetros de URL:**
- `id` (string): ID do órgão

**Exemplo de Requisição:**
```bash
curl -X GET http://localhost:3000/api/orgaos/clx123abc \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta (200):**
```json
{
  "id": "clx123abc",
  "nome": "Prefeitura Municipal",
  "sigla": "PM",
  "cnpj": null,
  "ativo": true,
  "createdAt": "2026-03-30T20:00:00.000Z",
  "updatedAt": "2026-03-30T20:00:00.000Z"
}
```

**Resposta (404):**
```json
{
  "error": "Órgão não encontrado"
}
```

---

## Criar Órgão

### POST `/api/orgaos`

Cria um novo órgão.

**Body (JSON):**
```json
{
  "nome": "Secretaria Municipal de Educação",
  "sigla": "SME",
  "cnpj": "12.345.678/0001-90",
  "ativo": true
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|------------|
| nome | string | Sim | Nome completo do órgão |
| sigla | string | Não | Sigla do órgão |
| cnpj | string | Não | CNPJ do órgão |
| ativo | boolean | Não | Status ativo (padrão: true) |

**Exemplo de Requisição:**
```bash
curl -X POST http://localhost:3000/api/orgaos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"nome": "Secretaria Municipal de Educação", "sigla": "SME", "cnpj": "12.345.678/0001-90"}'
```

**Resposta (201):**
```json
{
  "message": "Órgão criado com sucesso",
  "id": "clx789ghi",
  "data": {
    "id": "clx789ghi",
    "nome": "Secretaria Municipal de Educação",
    "sigla": "SME",
    "cnpj": "12.345.678/0001-90",
    "ativo": true,
    "createdAt": "2026-03-30T20:30:00.000Z",
    "updatedAt": "2026-03-30T20:30:00.000Z"
  }
}
```

---

## Atualizar Órgão

### PUT `/api/orgaos/[id]`

Atualiza um órgão existente. Todos os campos serão atualizados.

**Parâmetros de URL:**
- `id` (string): ID do órgão

**Body (JSON):**
```json
{
  "nome": "Secretaria Municipal de Educação Atualizada",
  "sigla": "SME",
  "cnpj": "12.345.678/0001-90",
  "ativo": true
}
```

**Exemplo de Requisição:**
```bash
curl -X PUT http://localhost:3000/api/orgaos/clx789ghi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"nome": "Secretaria Municipal de Educação Atualizada"}'
```

**Resposta (200):**
```json
{
  "id": "clx789ghi",
  "nome": "Secretaria Municipal de Educação Atualizada",
  "sigla": "SME",
  "cnpj": "12.345.678/0001-90",
  "ativo": true,
  "createdAt": "2026-03-30T20:30:00.000Z",
  "updatedAt": "2026-03-30T21:00:00.000Z"
}
```

---

## Deletar Órgão

### DELETE `/api/orgaos/[id]`

Remove um órgão do banco de dados.

**Parâmetros de URL:**
- `id` (string): ID do órgão

**Exemplo de Requisição:**
```bash
curl -X DELETE http://localhost:3000/api/orgaos/clx789ghi \
  -H "Authorization: Bearer <TOKEN>"
```

**Resposta (200):**
```json
{
  "message": "Órgão deletado com sucesso"
}
```

**Resposta (404):**
```json
{
  "error": "Órgão não encontrado"
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
