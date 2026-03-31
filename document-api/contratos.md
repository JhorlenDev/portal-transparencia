# API de Contratos

Base URL: `http://localhost:3000/api/contratos`

## Autenticação

Todos os endpoints desta API requerem autenticação Bearer Token.

**Header:**
```
Authorization: Bearer <SEU_TOKEN>
```

---

## Listar Todos os Contratos

### GET `/api/contratos`

Retorna lista de todos os contratos cadastrados.

**Parâmetros de Query:**
- `ano` (opcional): Filtrar por ano
- `status` (opcional): Filtrar por status
- `orgaoNome` (opcional): Filtrar por órgão

**Status disponíveis:** vigente, encerrado, rescindido

**Tipos de contrato:** servico, fornecimento, obra, permissao, concessao

---

## Obter Contrato por ID

### GET `/api/contratos/[id]`

Retorna um contrato específico pelo ID.

---

## Criar Contrato

### POST `/api/contratos`

Cria um novo contrato.

**Body (JSON):**
```json
{
  "numero": "001",
  "ano": 2026,
  "tipoContrato": "servico",
  "objeto": "Prestação de serviços de limpeza",
  "objetoResumido": "Limpeza predial",
  "status": "vigente",
  "dataInicioVigencia": "2026-01-01",
  "dataFimVigencia": "2026-12-31",
  "valorInicial": 180000,
  "valorAtual": 180000,
  "valorPago": 0,
  "contratadoNome": "Limpeza Total Ltda",
  "contratadoCnpj": "12.345.678/0001-90",
  "orgaoNome": "Prefeitura Municipal",
  "licitacaoId": null,
  "licitacaoNumero": "001/2026",
  "gestorNome": "João Silva",
  "gestorCargo": "Secretário",
  "fiscalNome": "Maria Santos",
  "fiscalCargo": "Fiscal de Contrato",
  "linkPncp": "https://pncp.gov.br/..."
}
```

**Campos:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|--------------|------------|
| numero | string | Sim | Número do contrato |
| ano | integer | Sim | Ano |
| tipoContrato | string | Sim | Tipo do contrato |
| objeto | string | Sim | Objeto completo |
| objetoResumido | string | Não | Objeto resumido |
| status | string | Não | Status (padrão: vigente) |
| dataInicioVigencia | date | Sim | Data de início |
| dataFimVigencia | date | Não | Data de fim |
| valorInicial | float | Sim | Valor inicial |
| valorAtual | float | Não | Valor atual |
| valorPago | float | Não | Valor pago |
| contratadoNome | string | Sim | Nome do contratado |
| contratadoCnpj | string | Sim | CNPJ do contratado |
| orgaoNome | string | Não | Nome do órgão |
| licitacaoId | string | Não | ID da licitação |
| licitacaoNumero | string | Não | Número da licitação |
| gestorNome | string | Não | Nome do gestor |
| gestorCargo | string | Não | Cargo do gestor |
| fiscalNome | string | Não | Nome do fiscal |
| fiscalCargo | string | Não | Cargo do fiscal |
| linkPncp | string | Não | Link no PNCP |

---

## Atualizar Contrato

### PUT `/api/contratos/[id]`

Atualiza um contrato existente.

---

## Deletar Contrato

### DELETE `/api/contratos/[id]`

Remove um contrato do banco de dados.

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
