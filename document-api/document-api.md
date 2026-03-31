# Documentação da API - Transparência 360

## Visão Geral

A API do Transparência 360 fornece endpoints para acesso aos dados de transparência pública municipal. Todos os dados são armazenados no MariaDB Cloud.

**Base URL:** `http://localhost:3000/api`

---

## Autenticação

Todos os endpoints desta API requerem autenticação **Bearer Token**.

### Header Obrigatório

```
Authorization: Bearer <SEU_TOKEN>
```

### Tokens Válidos

- Token de desenvolvimento: `dev-api-key-2026`
- Token configurado em `NEXTAUTH_SECRET` (variável de ambiente)

### Exemplo de Requisição Autenticada

```bash
curl -X GET "http://localhost:3000/api/licitacoes" \
  -H "Authorization: Bearer dev-api-key-2026"
```

### Códigos de Erro de Autenticação

| Código | Descrição |
|--------|-----------|
| 401 | Authorization header não fornecido |
| 401 | Token inválido ou expirado |

---

## Endpoints Disponíveis

| Módulo | Documentação Específica |
|--------|------------------------|
| Órgãos | [orgaos.md](./orgaos.md) |
| Receitas | [receitas.md](./receitas.md) |
| Despesas | [despesas.md](./despesas.md) |
| Licitações | [licitacoes.md](./licitacoes.md) |
| Contratos | [contratos.md](./contratos.md) |
| Servidores | [servidores.md](./servidores.md) |
| Convênios | [convenios.md](./convenios.md) |
| Datasets | [datasets.md](./datasets.md) |

---

## Estrutura dos Endpoints

Cada módulo segue o padrão REST:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/{recurso}` | Listar todos os registros |
| GET | `/api/{recurso}/[id]` | Obter registro por ID |
| POST | `/api/{recurso}` | Criar novo registro |
| PUT | `/api/{recurso}/[id]` | Atualizar registro |
| DELETE | `/api/{recurso}/[id]` | Excluir registro |

---

## Parâmetros de Query Comuns

- **GET** aceita parâmetros de filtragem específicos de cada módulo
- **POST** e **PUT** aceitam JSON no body da requisição

---

## Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Erro na requisição |
| 401 | Não autorizado (token inválido ou ausente) |
| 403 | Acesso proibido |
| 404 | Recurso não encontrado |
| 500 | Erro interno do servidor |

---

## Segurança

### Implementada
- ✅ Autenticação Bearer Token em todos os endpoints
- ✅ Validação de token em todas as requisições (GET, POST, PUT, DELETE)

### Não Implementada (需要在服务端/config)
- ❌ Rate Limiting (limite de requisições)
- ❌ Restrição por IP/Domínio (configuração do provedor de hospedagem)
- ❌ HTTPS forçado (configuração do servidor)
- ❌ CORS (Cross-Origin Resource Sharing) - 目前 permite todas origens

### Recomendações de Segurança

1. **Token**: Em produção, use um token forte (gere com `openssl rand -base64 32`)
2. **HTTPS**: Configure SSL/TLS no servidor
3. **Rate Limiting**: Implemente com Next.js middleware ou provedor de API
4. **CORS**: Configure origens permitidas no `next.config.js`

---

## Banco de Dados

**Provedor:** MariaDB Cloud

**Configuração (.env):**
```
DATABASE_URL="mysql://user:pass@host:3306/database"
MARIADB_CLOUD_IP="177.136.234.91"
MARIADB_CLOUD_PORT="3306"
```

**Tabelas:**
- `orgaos` - Órgãos públicos
- `receitas` - Receitas municipais
- `despesas` - Despesas/empenhos
- `licitacoes` - Licitações
- `contratos` - Contratos administrativos
- `servidores` - Servidores públicos
- `convenios` - Convênios
- `datasets` - Catálogo de dados abertos

---

## Versão

**Atualizado em:** 30/03/2026
