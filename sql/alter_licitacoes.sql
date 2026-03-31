-- Script de alteração da tabela licitações para suportar novos campos
-- Execute este script no MariaDB Cloud

-- Adicionar novos campos à tabela licitacoes
ALTER TABLE licitacoes 
    ADD COLUMN autoridade VARCHAR(255) AFTER id,
    ADD COLUMN regulamento VARCHAR(255) AFTER autoridade,
    ADD COLUMN numero_edital VARCHAR(50) AFTER regulamento,
    ADD COLUMN numero_proc_administrativo VARCHAR(100) AFTER numero_edital,
    ADD COLUMN fundamento_legal TEXT AFTER numero_proc_administrativo,
    ADD COLUMN ano_referencia INT(4) AFTER fundamento_legal,
    ADD COLUMN referencia_processo VARCHAR(100) AFTER ano_referencia,
    ADD COLUMN reeditacao TINYINT(1) DEFAULT 0 AFTER referencia_processo,
    ADD COLUMN convenio_transfergov VARCHAR(255) AFTER reeditacao,
    ADD COLUMN ano_convenio INT(4) AFTER convenio_transfergov,
    ADD COLUMN enviar_transfergov TINYINT(1) DEFAULT 0 AFTER ano_convenio,
    ADD COLUMN tipo_objeto VARCHAR(100) AFTER enviar_transfergov,
    ADD COLUMN fonte_orcamentaria VARCHAR(255) AFTER tipo_objeto,
    ADD COLUMN observacao VARCHAR(255) AFTER fonte_orcamentaria,
    ADD COLUMN tipo_contrato VARCHAR(100) AFTER observacao,
    ADD COLUMN validade_meses INT(3) AFTER tipo_contrato,
    ADD COLUMN prazo_pagamento VARCHAR(50) AFTER validade_meses;

-- Criar índices para campos frequentemente utilizados em filtros
CREATE INDEX idx_licitacoes_modalidade ON licitacoes(modalidade);
CREATE INDEX idx_licitacoes_ano ON licitacoes(ano);
CREATE INDEX idx_licitacoes_status ON licitacoes(status);
CREATE INDEX idx_licitacoes_orgao_id ON licitacoes(orgao_id);

-- Verificar estrutura final
-- SHOW COLUMNS FROM licitacoes;
