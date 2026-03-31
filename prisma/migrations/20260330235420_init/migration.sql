-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_datasets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "periodicidade" TEXT NOT NULL,
    "ultima_atualizacao" DATETIME NOT NULL,
    "formatos_disponiveis" TEXT,
    "total_registros" INTEGER,
    "dicionario_dados" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_datasets" ("ativo", "categoria", "createdAt", "descricao", "dicionario_dados", "formatos_disponiveis", "id", "nome", "periodicidade", "slug", "total_registros", "ultima_atualizacao", "updatedAt") SELECT "ativo", "categoria", "createdAt", "descricao", "dicionario_dados", "formatos_disponiveis", "id", "nome", "periodicidade", "slug", "total_registros", "ultima_atualizacao", "updatedAt" FROM "datasets";
DROP TABLE "datasets";
ALTER TABLE "new_datasets" RENAME TO "datasets";
CREATE UNIQUE INDEX "datasets_slug_key" ON "datasets"("slug");
CREATE TABLE "new_solicitacoes_sic" (
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
    "historico" TEXT,
    "created_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" DATETIME NOT NULL
);
INSERT INTO "new_solicitacoes_sic" ("ano", "assunto", "canal_entrada", "created_date", "data_prazo", "data_registro", "data_resposta", "descricao", "historico", "id", "orgao_destinatario_id", "orgao_destinatario_nome", "protocolo", "resposta", "solicitante_email", "solicitante_nome", "solicitante_telefone", "solicitante_tipo", "status", "tipo", "updated_date") SELECT "ano", "assunto", "canal_entrada", "created_date", "data_prazo", "data_registro", "data_resposta", "descricao", "historico", "id", "orgao_destinatario_id", "orgao_destinatario_nome", "protocolo", "resposta", "solicitante_email", "solicitante_nome", "solicitante_telefone", "solicitante_tipo", "status", "tipo", "updated_date" FROM "solicitacoes_sic";
DROP TABLE "solicitacoes_sic";
ALTER TABLE "new_solicitacoes_sic" RENAME TO "solicitacoes_sic";
CREATE UNIQUE INDEX "solicitacoes_sic_protocolo_key" ON "solicitacoes_sic"("protocolo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
