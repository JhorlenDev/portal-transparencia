-- Integracao com a API Fiorilli SCPI convivendo com a API da Prefeitura ("acordar").
--
-- Todo registro existente fica com fonte = 'acordar'. O indice unico (fonte, id_external_ref)
-- falha se ja houver id_external_ref repetido numa mesma tabela; nesse caso o deploy para
-- antes de subir a versao nova. Para conferir antes:
--   SELECT id_external_ref, COUNT(*) FROM despesas
--   WHERE id_external_ref IS NOT NULL GROUP BY id_external_ref HAVING COUNT(*) > 1;

-- AlterTable
ALTER TABLE `receitas` ADD COLUMN `fonte` VARCHAR(20) NOT NULL DEFAULT 'acordar',
    ADD COLUMN `nivel` INTEGER NULL,
    ADD COLUMN `tipo_receita` VARCHAR(30) NULL,
    ADD COLUMN `valor_arrecadado_periodo` DOUBLE NULL,
    ADD COLUMN `valor_previsto_atualizado` DOUBLE NULL;

-- AlterTable
ALTER TABLE `despesas` ADD COLUMN `acao` VARCHAR(191) NULL,
    ADD COLUMN `fonte` VARCHAR(20) NOT NULL DEFAULT 'acordar',
    ADD COLUMN `fonte_recurso` VARCHAR(191) NULL,
    ADD COLUMN `fonte_recurso_nome` VARCHAR(191) NULL,
    ADD COLUMN `funcao` VARCHAR(191) NULL,
    ADD COLUMN `modalidade_licitacao` VARCHAR(191) NULL,
    ADD COLUMN `numero_licitacao` VARCHAR(191) NULL,
    ADD COLUMN `programa` VARCHAR(191) NULL,
    ADD COLUMN `subfuncao` VARCHAR(191) NULL,
    ADD COLUMN `tipo_empenho` VARCHAR(10) NULL,
    ADD COLUMN `unidade_codigo` VARCHAR(191) NULL,
    ADD COLUMN `unidade_nome` VARCHAR(191) NULL,
    ADD COLUMN `valor_anulado` DOUBLE NULL;

-- AlterTable
ALTER TABLE `licitacoes` ADD COLUMN `data_encerramento` DATETIME(3) NULL,
    ADD COLUMN `fonte` VARCHAR(20) NOT NULL DEFAULT 'acordar',
    ADD COLUMN `registro_preco` BOOLEAN NULL;

-- AlterTable
ALTER TABLE `contratos` ADD COLUMN `data_assinatura` DATETIME(3) NULL,
    ADD COLUMN `data_publicacao` DATETIME(3) NULL,
    ADD COLUMN `fonte` VARCHAR(20) NOT NULL DEFAULT 'acordar',
    ADD COLUMN `modalidade` VARCHAR(191) NULL,
    ADD COLUMN `valor_aditado` DOUBLE NULL,
    ADD COLUMN `valor_empenhado` DOUBLE NULL,
    ADD COLUMN `valor_liquidado` DOUBLE NULL;

-- AlterTable
ALTER TABLE `servidores` ADD COLUMN `fonte` VARCHAR(20) NOT NULL DEFAULT 'acordar';

-- AlterTable
ALTER TABLE `convenios` ADD COLUMN `fonte` VARCHAR(20) NOT NULL DEFAULT 'acordar';

-- CreateTable
CREATE TABLE `diarias` (
    `id` VARCHAR(191) NOT NULL,
    `id_external_ref` VARCHAR(191) NOT NULL,
    `fonte` VARCHAR(20) NOT NULL DEFAULT 'fiorilli',
    `payload` JSON NULL,
    `exercicio` INTEGER NOT NULL,
    `data` DATETIME(3) NULL,
    `favorecido` VARCHAR(191) NOT NULL,
    `cargo` VARCHAR(191) NULL,
    `cpf` VARCHAR(191) NULL,
    `orgao_codigo` VARCHAR(191) NULL,
    `orgao_nome` VARCHAR(191) NULL,
    `unidade_nome` VARCHAR(191) NULL,
    `descricao` TEXT NULL,
    `elemento_despesa` VARCHAR(191) NULL,
    `numero_empenho` VARCHAR(191) NULL,
    `quantidade` DOUBLE NULL,
    `valor` DOUBLE NOT NULL,
    `valor_anulado` DOUBLE NULL,
    `created_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_date` DATETIME(3) NOT NULL,

    INDEX `diarias_exercicio_data_idx`(`exercicio`, `data`),
    UNIQUE INDEX `diarias_fonte_id_external_ref_key`(`fonte`, `id_external_ref`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transferencias` (
    `id` VARCHAR(191) NOT NULL,
    `id_external_ref` VARCHAR(191) NOT NULL,
    `fonte` VARCHAR(20) NOT NULL DEFAULT 'fiorilli',
    `payload` JSON NULL,
    `exercicio` INTEGER NOT NULL,
    `mes` INTEGER NULL,
    `data` DATETIME(3) NULL,
    `entidade_pagadora` VARCHAR(191) NOT NULL,
    `cnpj_pagadora` VARCHAR(191) NULL,
    `entidade_recebedora` VARCHAR(191) NOT NULL,
    `cnpj_recebedora` VARCHAR(191) NULL,
    `valor_repasse` DOUBLE NOT NULL,
    `valor_devolucao` DOUBLE NULL,
    `valor_previsto` DOUBLE NULL,
    `created_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_date` DATETIME(3) NOT NULL,

    INDEX `transferencias_exercicio_mes_idx`(`exercicio`, `mes`),
    UNIQUE INDEX `transferencias_fonte_id_external_ref_key`(`fonte`, `id_external_ref`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sincronizacao_logs` (
    `id` VARCHAR(191) NOT NULL,
    `fonte` VARCHAR(20) NOT NULL,
    `modulo` VARCHAR(191) NOT NULL,
    `listagem` VARCHAR(191) NULL,
    `exercicio` INTEGER NULL,
    `periodo` VARCHAR(191) NULL,
    `origem` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
    `status` VARCHAR(191) NOT NULL DEFAULT 'EXECUTANDO',
    `recebidos` INTEGER NOT NULL DEFAULT 0,
    `inseridos` INTEGER NOT NULL DEFAULT 0,
    `atualizados` INTEGER NOT NULL DEFAULT 0,
    `removidos` INTEGER NOT NULL DEFAULT 0,
    `erros` INTEGER NOT NULL DEFAULT 0,
    `mensagem_erro` TEXT NULL,
    `iniciado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finalizado_em` DATETIME(3) NULL,
    `duracao_ms` INTEGER NULL,
    `created_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_date` DATETIME(3) NOT NULL,

    INDEX `sincronizacao_logs_fonte_modulo_iniciado_em_idx`(`fonte`, `modulo`, `iniciado_em`),
    INDEX `sincronizacao_logs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `receitas_fonte_exercicio_idx` ON `receitas`(`fonte`, `exercicio`);

-- CreateIndex
CREATE UNIQUE INDEX `receitas_fonte_id_external_ref_key` ON `receitas`(`fonte`, `id_external_ref`);

-- CreateIndex
CREATE INDEX `despesas_fonte_exercicio_idx` ON `despesas`(`fonte`, `exercicio`);

-- CreateIndex
CREATE INDEX `despesas_exercicio_data_empenho_idx` ON `despesas`(`exercicio`, `data_empenho`);

-- CreateIndex
CREATE UNIQUE INDEX `despesas_fonte_id_external_ref_key` ON `despesas`(`fonte`, `id_external_ref`);

-- CreateIndex
CREATE INDEX `licitacoes_fonte_ano_idx` ON `licitacoes`(`fonte`, `ano`);

-- CreateIndex
CREATE UNIQUE INDEX `licitacoes_fonte_id_external_ref_key` ON `licitacoes`(`fonte`, `id_external_ref`);

-- CreateIndex
CREATE INDEX `contratos_fonte_ano_idx` ON `contratos`(`fonte`, `ano`);

-- CreateIndex
CREATE UNIQUE INDEX `contratos_fonte_id_external_ref_key` ON `contratos`(`fonte`, `id_external_ref`);

-- CreateIndex
CREATE UNIQUE INDEX `servidores_fonte_id_external_ref_key` ON `servidores`(`fonte`, `id_external_ref`);

-- CreateIndex
CREATE UNIQUE INDEX `convenios_fonte_id_external_ref_key` ON `convenios`(`fonte`, `id_external_ref`);

