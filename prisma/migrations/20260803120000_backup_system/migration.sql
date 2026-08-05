-- CreateTable
CREATE TABLE `backup_config` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `incluir_banco` BOOLEAN NOT NULL DEFAULT true,
    `incluir_midias` BOOLEAN NOT NULL DEFAULT true,
    `pular_duplicados` BOOLEAN NOT NULL DEFAULT true,
    `local_ativo` BOOLEAN NOT NULL DEFAULT false,
    `local_modo` VARCHAR(191) NOT NULL DEFAULT 'DIARIO',
    `local_intervalo_horas` INTEGER NOT NULL DEFAULT 24,
    `local_horarios` VARCHAR(191) NOT NULL DEFAULT '03:00',
    `local_dias_semana` VARCHAR(191) NOT NULL DEFAULT '1',
    `local_retencao_qtd` INTEGER NOT NULL DEFAULT 7,
    `local_retencao_dias` INTEGER NOT NULL DEFAULT 0,
    `nuvem_ativo` BOOLEAN NOT NULL DEFAULT false,
    `nuvem_modo` VARCHAR(191) NOT NULL DEFAULT 'DIARIO',
    `nuvem_intervalo_horas` INTEGER NOT NULL DEFAULT 24,
    `nuvem_horarios` VARCHAR(191) NOT NULL DEFAULT '04:00',
    `nuvem_dias_semana` VARCHAR(191) NOT NULL DEFAULT '1',
    `nuvem_retencao_qtd` INTEGER NOT NULL DEFAULT 14,
    `nuvem_retencao_dias` INTEGER NOT NULL DEFAULT 0,
    `drive_folder_id` VARCHAR(191) NULL,
    `drive_folder_nome` VARCHAR(191) NULL,
    `created_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_date` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backup_drive_contas` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `google_sub` VARCHAR(191) NULL,
    `escopo` VARCHAR(191) NULL,
    `token_cifrado` TEXT NOT NULL,
    `quota_total` VARCHAR(191) NULL,
    `quota_usada` VARCHAR(191) NULL,
    `conectado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ultimo_uso_em` DATETIME(3) NULL,
    `revogado_em` DATETIME(3) NULL,
    `ultimo_erro` TEXT NULL,
    `created_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_date` DATETIME(3) NOT NULL,

    INDEX `backup_drive_contas_revogado_em_idx`(`revogado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backup_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'LOCAL',
    `origem` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
    `escopo` VARCHAR(191) NOT NULL DEFAULT 'COMPLETO',
    `status` VARCHAR(191) NOT NULL DEFAULT 'EXECUTANDO',
    `arquivo` VARCHAR(191) NULL,
    `tamanho_bytes` BIGINT NULL,
    `sha256` VARCHAR(64) NULL,
    `content_hash` VARCHAR(64) NULL,
    `caminho_local` TEXT NULL,
    `drive_file_id` VARCHAR(191) NULL,
    `drive_folder_id` VARCHAR(191) NULL,
    `duplicado_de_id` VARCHAR(191) NULL,
    `total_tabelas` INTEGER NULL,
    `total_registros` INTEGER NULL,
    `total_arquivos` INTEGER NULL,
    `iniciado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finalizado_em` DATETIME(3) NULL,
    `duracao_ms` INTEGER NULL,
    `erro` TEXT NULL,
    `log` TEXT NULL,
    `created_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_date` DATETIME(3) NOT NULL,

    INDEX `backup_jobs_tipo_status_iniciado_em_idx`(`tipo`, `status`, `iniciado_em`),
    INDEX `backup_jobs_content_hash_idx`(`content_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

