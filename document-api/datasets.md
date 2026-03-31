# API de Datasets

Base URL: `http://localhost:3000/api/datasets`

## Autenticação

Todos os endpoints desta API requerem autenticação Bearer Token.

**Header:**
```
Authorization: Bearer <SEU_TOKEN>
```

---

## Listar Todos os Datasets

### GET `/api/datasets`

Retorna lista de todos os datasets cadastrados.

**Parâmetros de Query:**
- `categoria` (opcional): Filtrar por categoria
- `ativo` (opcional): Filtrar por status ativo (true/false)

**Categorias disponíveis:** despesas, receitas, licitacoes, contratos, servidores, convenios

---

## Obter Dataset por ID

### GET `/api/datasets/[id]`

Retorna um dataset específico pelo ID.

---

## Criar Dataset

### POST `/api/datasets`

Cria um novo dataset.

**Body (JSON):**
```json
{
  "nome": "Despesas Públicas",
  "slug": "despesas",
  "descricao": "Empenhos, liquidações e pagamentos realizados pelo município",
  "categoria": "despesas",
  "periodicidade": "diaria",
  "ultimaAtualizacao": "2026-03-30",
  "formatosDisponiveis": "csv,json",
  "totalRegistros": 15420,
  "dicionarioDados": "{\"campos\": []}",
  "ativo": true
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|------------|
| nome | string | Sim | Nome do dataset |
| slug | string | Sim | Slug único (URL amigável) |
| descricao | string | Sim | Descrição do dataset |
| categoria | string | Sim | Categoria |
| periodicidade | string | Não | Periodicidade de atualização |
| ultimaAtualizacao | date | Não | Data da última atualização |
| formatosDisponiveis | string | Não | Formatos disponíveis (csv,json,xlsx) |
| totalRegistros | integer | Não | Total de registros |
| dicionarioDados | string | Não | Dicionário de dados (JSON) |
| ativo | boolean | Não | Status ativo |

---

## Atualizar Dataset

### PUT `/api/datasets/[id]`

Atualiza um dataset existente.

---

## Deletar Dataset

### DELETE `/api/datasets/[id]`

Remove um dataset do banco de dados.

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
