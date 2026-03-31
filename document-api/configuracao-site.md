# API de Configuração do Site

Base URL: `http://localhost:3000/api/configuracao-site`

## Modelo WordPress Options

Cada configuração é um **registro separado** na tabela (chave/valor), igual ao `wp_options` do WordPress. Isso permite adicionar novas configurações sem alterar a estrutura do banco.

---

## Autenticação

**GET** - Público (sem token)
**POST/PUT** - Requer Bearer Token

**Header:**
```
Authorization: Bearer <SEU_TOKEN>
```

---

## Obter Todas as Configurações

### GET `/api/configuracao-site`

Retorna todas as configurações como objeto chave-valor.

**Exemplo de Requisição:**
```bash
curl -X GET "http://localhost:3000/api/configuracao-site"
```

**Exemplo de Resposta:**
```json
{
  "nome_site": "Portal da Transparência",
  "descricao": "Acesso à informação pública municipal",
  "logo_url": "https://exemplo.com/logo.png",
  "email_contato": "contato@prefeitura.gov.br",
  "telefone_contato": "(11) 1234-5678",
  "endereco": "Rua Example, 123 - Centro",
  "facebook": "https://facebook.com/prefeitura",
  "instagram": "https://instagram.com/prefeitura",
  "youtube": "https://youtube.com/prefeitura",
  "link_pncp": "https://pncp.gov.br",
  "link_fala_br": "https://falabr.cgu.gov.br",
  "link_diario_oficial": "",
  "texto_rodape": "Portal da Transparência Municipal",
  "cor_primaria": "#059669",
  "cor_secundaria": "#047857"
}
```

---

## Salvar Configurações

### POST `/api/configuracao-site`

Salva uma ou múltiplas configurações.

**Exemplo de Requisição:**
```bash
curl -X POST "http://localhost:3000/api/configuracao-site" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "nome_site": "Portal da Transparência",
    "descricao": "Acesso à informação pública municipal",
    "logo_url": "https://exemplo.com/logo.png",
    "email_contato": "contato@prefeitura.gov.br",
    "telefone_contato": "(11) 1234-5678"
  }'
```

**Resposta:**
```json
{
  "message": "Configurações salvas com sucesso"
}
```

---

## Campos Padrão

| Chave | Tipo | Descrição |
|-------|------|------------|
| nome_site | text | Nome do site |
| descricao | text | Descrição do portal |
| logo_url | url | URL do logo |
| favicon_url | url | URL do favicon |
| email_contato | email | E-mail de contato |
| telefone_contato | text | Telefone de contato |
| endereco | text | Endereço da prefeitura |
| facebook | url | Link do Facebook |
| instagram | url | Link do Instagram |
| youtube | url | Link do YouTube |
| twitter | url | Link do Twitter/X |
| link_pncp | url | Link do PNCP |
| link_portal_nacional | url | Link do Portal Nacional |
| link_fala_br | url | Link do Fala.BR |
| link_diario_oficial | url | Link do Diário Oficial |
| texto_rodape | text | Texto do rodapé |
| cor_primaria | color | Cor primária (hex) |
| cor_secundaria | color | Cor secundária (hex) |

---

## Adicionar Nova Configuração

Para adicionar uma nova configuração, basta enviar uma nova chave no POST:

```bash
curl -X POST "http://localhost:3000/api/configuracao-site" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "nova_config": "valor da nova configuração"
  }'
```

---

## Estrutura da Tabela (Banco de Dados)

```sql
CREATE TABLE configuracao_site (
    id VARCHAR(36) PRIMARY KEY,
    chave VARCHAR(255) NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    tipo VARCHAR(50),
    descricao VARCHAR(255),
    ordem INT,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL
);
```

---

## Diferença do Modelo Anterior

**Antes (colunas fixas):**
```
id | nome_site | descricao | logo_url | email_contato | ...
```

**Agora (como WP Options - registros):**
```
id | chave         | valor                     | tipo  | descricao
1  | nome_site     | Portal da Transparência   | text  | Nome do site
2  | descricao     | Acesso à informação...    | text  | Descrição
3  | logo_url      | https://...               | url   | URL do logo
...
```

**Vantagens:**
- ✅ Adicionar novas configs sem migrar banco
- ✅ Estrutura flexível
- ✅ Sem limite de configurações
- ✅ Igual WordPress Options
