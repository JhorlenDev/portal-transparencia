-- CreateTable
CREATE TABLE "Orgao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,
    "cnpj" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "receitas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exercicio" INTEGER NOT NULL,
    "mes" INTEGER,
    "codigo_natureza" TEXT NOT NULL,
    "natureza_receita" TEXT NOT NULL,
    "categoria_economica" TEXT NOT NULL,
    "fonte_recurso" TEXT,
    "fonte_recurso_nome" TEXT,
    "valor_previsto" REAL NOT NULL,
    "valor_arrecadado" REAL NOT NULL,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exercicio" INTEGER NOT NULL,
    "numero_empenho" TEXT NOT NULL,
    "data_empenho" DATETIME,
    "tipo_movimento" TEXT NOT NULL,
    "credor_nome" TEXT,
    "credor_cpf_cnpj" TEXT,
    "objeto" TEXT,
    "historico" TEXT,
    "orgao_id" TEXT,
    "orgao_nome" TEXT,
    "elemento_despesa" TEXT,
    "elemento_despesa_nome" TEXT,
    "valor_empenhado" REAL,
    "valor_liquidado" REAL,
    "valor_pago" REAL,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "despesas_orgao_id_fkey" FOREIGN KEY ("orgao_id") REFERENCES "Orgao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "licitacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "modalidade" TEXT NOT NULL,
    "criterio_julgamento" TEXT,
    "objeto" TEXT NOT NULL,
    "objeto_resumido" TEXT,
    "status" TEXT NOT NULL DEFAULT 'planejamento',
    "data_abertura" DATETIME,
    "valor_estimado" REAL,
    "numero_processo" TEXT,
    "orgao_id" TEXT,
    "orgao_nome" TEXT,
    "justificativa" TEXT,
    "link_pncp" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "licitacoes_orgao_id_fkey" FOREIGN KEY ("orgao_id") REFERENCES "Orgao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "tipo_contrato" TEXT,
    "objeto" TEXT NOT NULL,
    "objeto_resumido" TEXT,
    "status" TEXT NOT NULL DEFAULT 'vigente',
    "data_inicio_vigencia" DATETIME NOT NULL,
    "data_fim_vigencia" DATETIME,
    "valor_inicial" REAL NOT NULL,
    "valor_atual" REAL,
    "valor_pago" REAL,
    "contratado_nome" TEXT NOT NULL,
    "contratado_cnpj" TEXT NOT NULL,
    "orgao_id" TEXT,
    "orgao_nome" TEXT,
    "licitacao_id" TEXT,
    "licitacao_numero" TEXT,
    "gestor_nome" TEXT,
    "gestor_cargo" TEXT,
    "fiscal_nome" TEXT,
    "fiscal_cargo" TEXT,
    "link_pncp" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "contratos_orgao_id_fkey" FOREIGN KEY ("orgao_id") REFERENCES "Orgao" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "contratos_licitacao_id_fkey" FOREIGN KEY ("licitacao_id") REFERENCES "licitacoes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "servidores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "funcao" TEXT,
    "orgao_id" TEXT,
    "orgao_nome" TEXT,
    "lotacao" TEXT,
    "vinculo" TEXT NOT NULL DEFAULT 'efetivo',
    "carga_horaria" INTEGER,
    "data_admissao" DATETIME,
    "ano_referencia" INTEGER,
    "mes_referencia" INTEGER,
    "remuneracao_base" REAL,
    "gratificacoes" REAL DEFAULT 0,
    "adicionais" REAL DEFAULT 0,
    "indenizacoes" REAL DEFAULT 0,
    "remuneracao_bruta" REAL,
    "imposto_renda" REAL,
    "previdencia" REAL DEFAULT 0,
    "outros_descontos" REAL,
    "remuneracao_liquida" REAL,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL,
    CONSTRAINT "servidores_orgao_id_fkey" FOREIGN KEY ("orgao_id") REFERENCES "Orgao" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "convenios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "objeto_resumido" TEXT,
    "status" TEXT NOT NULL DEFAULT 'em_execucao',
    "concedente" TEXT NOT NULL,
    "concedente_cnpj" TEXT,
    "convenente" TEXT,
    "data_inicio_vigencia" DATETIME NOT NULL,
    "data_fim_vigencia" DATETIME,
    "valor_total" REAL NOT NULL,
    "valor_repasse" REAL,
    "valor_contrapartida" REAL,
    "valor_executado" REAL,
    "numero_processo" TEXT,
    "link_plataforma" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "solicitacoes_sic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "protocolo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'acesso_informacao',
    "canal_entrada" TEXT NOT NULL,
    "solicitante_nome" TEXT NOT NULL,
    "solicitante_email" TEXT NOT NULL,
    "solicitante_telefone" TEXT,
    "solicitante_tipo" TEXT,
    "orgao_destinatario_id" TEXT,
    "orgao_destinatario_nome" TEXT,
    "assunto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data_registro" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_prazo" DATETIME,
    "data_resposta" DATETIME,
    "resposta" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "historico" JSONB,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "datasets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "periodicidade" TEXT NOT NULL,
    "ultima_atualizacao" DATETIME NOT NULL,
    "formatos_disponiveis" TEXT,
    "total_registros" INTEGER,
    "dicionario_dados" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "solicitacoes_sic_protocolo_key" ON "solicitacoes_sic"("protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "datasets_slug_key" ON "datasets"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_chave_key" ON "configuracoes"("chave");
