# API de Servidores

Base URL: `http://localhost:3000/api/servidores`

## Autenticação

Todos os endpoints desta API requerem autenticação Bearer Token.

**Header:**
```
Authorization: Bearer <SEU_TOKEN>
```

---

## Listar Todos os Servidores

### GET `/api/servidores`

Retorna lista de todos os servidores cadastrados.

**Parâmetros de Query:**
- `anoReferencia` (opcional): Filtrar por ano de referência
- `mesReferencia` (opcional): Filtrar por mês de referência
- `orgaoNome` (opcional): Filtrar por órgão
- `vinculo` (opcional): Filtrar por vínculo (efetivo/comissionado/contratado/temporario)

---

## Obter Servidor por ID

### GET `/api/servidores/[id]`

Retorna um servidor específico pelo ID.

---

## Criar Servidor

### POST `/api/servidores`

Cria um novo servidor.

**Body (JSON):**
```json
{
  "nome": "Maria da Silva Santos",
  "matricula": "1001",
  "cargo": "Professor",
  "funcao": "Docência 1º ao 5º ano",
  "orgaoNome": "Secretaria Municipal de Educação",
  "lotacao": "Escola Municipal João XXIII",
  "vinculo": "efetivo",
  "cargaHoraria": 40,
  "dataAdmissao": "2015-03-01",
  "anoReferencia": 2026,
  "mesReferencia": 3,
  "remuneracaoBase": 4500,
  "gratificacoes": 500,
  "adicionais": 300,
  "indenizacoes": 200,
  "remuneracaoBruta": 5500,
  "impostoRenda": 450,
  "previdencia": 605,
  "outrosDescontos": 100,
  "remuneracaoLiquida": 4345
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|------------|
| nome | string | Sim | Nome completo |
| matricula | string | Sim | Matrícula |
| cargo | string | Sim | Cargo |
| funcao | string | Não | Função |
| orgaoNome | string | Não | Nome do órgão |
| lotacao | string | Não | Local de lotação |
| vinculo | string | Não | Tipo de vínculo |
| cargaHoraria | integer | Não | Carga horária semanal |
| dataAdmissao | date | Não | Data de admissão |
| anoReferencia | integer | Não | Ano de referência |
| mesReferencia | integer | Não | Mês de referência |
| remuneracaoBase | float | Não | Remuneração base |
| gratificacoes | float | Não | Gratificações |
| adicionais | float | Não | Adicionais |
| indenizacoes | float | Não | Indenizações |
| remuneracaoBruta | float | Não | Remuneração bruta |
| impostoRenda | float | Não | Imposto de renda |
| previdencia | float | Não | Contribuição previdenciária |
| outrosDescontos | float | Não | Outros descontos |
| remuneracaoLiquida | float | Não | Remuneração líquida |

---

## Atualizar Servidor

### PUT `/api/servidores/[id]`

Atualiza um servidor existente.

---

## Deletar Servidor

### DELETE `/api/servidores/[id]`

Remove um servidor do banco de dados.

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
