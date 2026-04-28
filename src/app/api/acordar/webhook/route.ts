import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const EXTERNAL_API_BASE = 'https://prefeitura.tefe.am.gov.br/api/transparencia'
const DEFAULT_ORG = 'cgm'

interface ExternalAttachment {
  name: string
  url: string
  size: number
  mimeType: string
}

interface ExternalData {
  id: string
  organization_id?: string
  attachments?: ExternalAttachment[]
  [key: string]: unknown
}

interface ImportResults {
  created: number
  updated: number
  errors: number
  attachments: number
  deleted: number
}

interface EntityWebhookResult {
  success: true
  entity: string
  org: string
  message?: string
  totalRecords?: number
  imported: ImportResults
}

interface EntityWebhookFailure {
  success: false
  entity: string
  org: string
  error: string
}

type WebhookSyncResult = EntityWebhookResult | EntityWebhookFailure

interface SyncJob {
  id: string
  org: string
  entity?: string
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  finishedAt?: string
  message: string
  results?: WebhookSyncResult[]
  result?: EntityWebhookResult
  error?: string
}

interface SyncJobState {
  running: boolean
  currentJob: SyncJob | null
  lastJob: SyncJob | null
}

const syncStateKey = Symbol.for('portal-transparencia.acordar-sync-state')

function getSyncJobState(): SyncJobState {
  const globalState = globalThis as typeof globalThis & { [syncStateKey]?: SyncJobState }

  if (!globalState[syncStateKey]) {
    globalState[syncStateKey] = {
      running: false,
      currentJob: null,
      lastJob: null,
    }
  }

  return globalState[syncStateKey]
}

interface PrismaWebhookModel {
  findFirst(args: { where: { idExternalRef: string } }): Promise<{ id: string } | null>
  update(args: { where: { id: string }, data: Record<string, unknown> }): Promise<{ id: string }>
  create(args: { data: Record<string, unknown> }): Promise<{ id: string }>
  deleteMany(args: { where: { idExternalRef: { notIn?: string[], not?: null } } }): Promise<{ count: number }>
  findMany(args: { where: { idExternalRef: { notIn?: string[], not?: null } }, select: { id: true } }): Promise<Array<{ id: string }>>
}

const entityFieldMapping: Record<string, Record<string, string>> = {
  procurements: {
    id: 'idExternalRef',
    procurement_number: 'numero',
    procurement_year: 'ano',
    modality: 'modalidade',
    object: 'objeto',
    status: 'status',
    estimated_value: 'valorEstimado',
    opening_date: 'dataAbertura',
    org_unit: 'orgaoNome',
    process_number: 'numeroProcesso',
    legal_basis: 'fundamentoLegal',
    authority: 'autoridade',
    regulation: 'regulamento',
    notice_number: 'numeroEdital',
    admin_process_number: 'numeroProcAdministrativo',
    reference_year: 'anoReferencia',
    reference_process: 'referenciaProcesso',
    is_reissue: 'reeditacao',
    transferegov_agreement: 'convenioTransfergov',
    send_transferegov: 'enviarTransfergov',
    agreement_year: 'anoConvenio',
    object_type: 'tipoObjeto',
    budget_source: 'fonteOrcamentaria',
    observation: 'observacao',
    contract_type: 'tipoContrato',
    contract_validity_months: 'validadeMeses',
    payment_term: 'prazoPagamento',
    created_at: 'createdAt',
  },
  expenses: {
    id: 'idExternalRef',
    commitment_number: 'numeroEmpenho',
    creditor_name: 'credorNome',
    cpf_cnpj: 'credorCpfCnpj',
    object: 'objeto',
    value: 'valorEmpenhado',
    fiscal_year: 'exercicio',
    budget_element: 'elementoDespesa',
    org_unit: 'orgaoNome',
    commitment_date: 'dataEmpenho',
    created_at: 'createdAt',
  },
  revenues: {
    id: 'idExternalRef',
    accounting_id: 'codigoNatureza',
    revenue_nature: 'naturezaReceita',
    predicted_value: 'valorPrevisto',
    collected_value: 'valorArrecadado',
    fiscal_year: 'exercicio',
    source_destination: 'fonteRecursoNome',
    created_at: 'createdAt',
  },
  contracts: {
    id: 'idExternalRef',
    contract_number: 'numero',
    contract_year: 'ano',
    contractor_name: 'contratadoNome',
    contractor_cnpj: 'contratadoCnpj',
    object: 'objeto',
    status: 'status',
    initial_value: 'valorInicial',
    start_date: 'dataInicioVigencia',
    end_date: 'dataFimVigencia',
    manager_name: 'gestorNome',
    created_at: 'createdAt',
  },
  server_payroll: {
    id: 'idExternalRef',
    server_name: 'nome',
    position: 'cargo',
    department: 'lotacao',
    employment_type: 'vinculo',
    base_salary: 'remuneracaoBase',
    benefits: 'gratificacoes',
    allowances: 'adicionais',
    deductions: 'outrosDescontos',
    net_salary: 'remuneracaoLiquida',
    created_at: 'createdAt',
  },
  agreements: {
    id: 'idExternalRef',
    parties: 'concedente',
    object: 'objeto',
    status: 'status',
    total_value: 'valorTotal',
    start_date: 'dataInicioVigencia',
    end_date: 'dataFimVigencia',
    goals: 'objetoResumido',
    created_at: 'createdAt',
  },
}

const prismaModelMap: Record<string, string> = {
  procurements: 'licitacao',
  expenses: 'despesa',
  revenues: 'receita',
  contracts: 'contrato',
  server_payroll: 'servidor',
  agreements: 'convenio',
}

const entityAttachmentType: Record<string, string> = {
  procurements: 'licitacao',
  expenses: 'despesa',
  revenues: 'receita',
  contracts: 'contrato',
  server_payroll: 'servidor',
  agreements: 'convenio',
}

const entitiesWithPayload = new Set(['procurements', 'expenses', 'revenues', 'contracts', 'server_payroll'])

const validEntities = Object.keys(entityFieldMapping)

function getPrismaModel(entity: string): PrismaWebhookModel | null {
  const modelName = prismaModelMap[entity]
  return modelName ? prisma[modelName as keyof typeof prisma] as unknown as PrismaWebhookModel : null
}

function sanitizeFilename(filename: string): string {
  const decodedFilename = (() => {
    try {
      return decodeURIComponent(filename)
    } catch {
      return filename
    }
  })()

  return decodedFilename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, '_')
    .replace(/\s+/g, '_')
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalizedValue = value.trim()
  if (!normalizedValue) {
    return null
  }

  const lastCommaIndex = normalizedValue.lastIndexOf(',')
  const lastDotIndex = normalizedValue.lastIndexOf('.')

  let sanitizedValue = normalizedValue
  if (lastCommaIndex > lastDotIndex) {
    sanitizedValue = normalizedValue.replace(/\./g, '').replace(',', '.')
  } else if (lastDotIndex > lastCommaIndex) {
    sanitizedValue = normalizedValue.replace(/,/g, '')
  }

  const parsed = Number.parseFloat(sanitizedValue)
  return Number.isFinite(parsed) ? parsed : null
}

function parseYear(value: unknown, fallback = new Date().getFullYear()): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value)
  }

  if (typeof value === 'string') {
    const match = value.match(/\d{4}/)
    if (match) {
      return Number.parseInt(match[0], 10)
    }
  }

  return fallback
}

function parseMonth(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined

  const match = value.match(/\d{4}\D+(\d{1,2})/)
  if (!match) return undefined

  const month = Number.parseInt(match[1], 10)
  return month >= 1 && month <= 12 ? month : undefined
}

function getDateYear(value: unknown): number {
  if (typeof value === 'string' || value instanceof Date) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return date.getFullYear()
    }
  }

  return new Date().getFullYear()
}

function normalizeForEntity(entity: string, externalData: ExternalData, mappedData: Record<string, unknown>) {
  switch (entity) {
    case 'revenues': {
      mappedData.codigoNatureza ||= String(externalData.accounting_id || externalData.id)
      mappedData.naturezaReceita ||= String(externalData.revenue_nature || 'Receita não informada')
      mappedData.categoriaEconomica ||= String(externalData.source_destination || externalData.org_unit || 'Receitas Correntes')
      mappedData.valorPrevisto = parseNumericValue(mappedData.valorPrevisto) ?? 0
      mappedData.valorArrecadado = parseNumericValue(mappedData.valorArrecadado) ?? 0
      mappedData.exercicio = parseYear(mappedData.exercicio || externalData.fiscal_year)
      break
    }

    case 'agreements': {
      const startDate = mappedData.dataInicioVigencia instanceof Date
        ? mappedData.dataInicioVigencia
        : new Date(String(externalData.start_date || externalData.created_at || new Date().toISOString()))

      mappedData.numero ||= String(externalData.agreement_number || externalData.number || externalData.id).slice(0, 36)
      mappedData.ano ||= getDateYear(startDate)
      mappedData.tipo ||= 'Convênio'
      mappedData.objeto ||= 'Objeto não informado'
      mappedData.status ||= 'vigente'
      mappedData.concedente ||= String(externalData.parties || 'Concedente não informado')
      mappedData.dataInicioVigencia = Number.isNaN(startDate.getTime()) ? new Date() : startDate
      mappedData.valorTotal = parseNumericValue(mappedData.valorTotal) ?? 0
      break
    }

    case 'server_payroll': {
      const grossSalary =
        (parseNumericValue(externalData.base_salary) || 0) +
        (parseNumericValue(externalData.benefits) || 0) +
        (parseNumericValue(externalData.allowances) || 0)

      mappedData.nome ||= String(externalData.server_name || 'Servidor não informado')
      mappedData.matricula ||= String(externalData.registration || externalData.employee_id || externalData.id)
      mappedData.cargo ||= String(externalData.position || 'Cargo não informado')
      mappedData.vinculo ||= String(externalData.employment_type || 'efetivo')
      mappedData.anoReferencia ||= parseYear(externalData.reference_period)
      mappedData.mesReferencia ||= parseMonth(externalData.reference_period)
      mappedData.remuneracaoBruta = parseNumericValue(mappedData.remuneracaoBruta) ?? grossSalary
      mappedData.remuneracaoLiquida = parseNumericValue(mappedData.remuneracaoLiquida) ?? 0
      break
    }

    case 'contracts': {
      mappedData.numero ||= String(externalData.contract_number || externalData.id).slice(0, 36)
      mappedData.ano ||= parseYear(externalData.contract_year || externalData.start_date)
      mappedData.objeto ||= 'Objeto não informado'
      mappedData.status ||= 'vigente'
      mappedData.valorInicial = parseNumericValue(mappedData.valorInicial) ?? 0
      mappedData.contratadoNome ||= String(externalData.contractor_name || 'Contratado não informado')
      mappedData.contratadoCnpj ||= String(externalData.contractor_cnpj || '')
      mappedData.dataInicioVigencia ||= new Date()
      break
    }

    case 'procurements': {
      mappedData.numero ||= String(externalData.procurement_number || externalData.id).slice(0, 36)
      mappedData.ano ||= parseYear(externalData.procurement_year || externalData.opening_date)
      mappedData.modalidade ||= String(externalData.modality || 'Não informada')
      mappedData.objeto ||= 'Objeto não informado'
      mappedData.status ||= 'planejamento'
      break
    }

    case 'expenses': {
      mappedData.numeroEmpenho ||= String(externalData.commitment_number || externalData.id).slice(0, 36)
      mappedData.exercicio ||= parseYear(externalData.fiscal_year || externalData.commitment_date)
      mappedData.valorEmpenhado = parseNumericValue(mappedData.valorEmpenhado) ?? 0
      break
    }
  }

  return mappedData
}

async function downloadAttachment(url: string, filename: string, entityId: string): Promise<string | null> {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'anexos', entityId)
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true })
    }

    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Failed to download attachment: ${response.status}`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const sanitizedFilename = sanitizeFilename(filename)
    const uniqueFilename = `${Date.now()}-${sanitizedFilename}`
    const filePath = path.join(uploadsDir, uniqueFilename)
    fs.writeFileSync(filePath, buffer)

    return `/uploads/anexos/${entityId}/${uniqueFilename}`
  } catch (error) {
    console.error(`Error downloading attachment:`, error)
    return null
  }
}

async function saveAttachments(
  attachments: ExternalAttachment[],
  entityId: string,
  entityType: string,
  existingRecordId: string
): Promise<number> {
  let savedCount = 0

  const existingAttachments = await prisma.anexo.findMany({
    where: {
      entidadeId: existingRecordId,
      entidadeTipo: entityType,
    },
  })

  for (const att of existingAttachments) {
    const filePath = path.join(process.cwd(), 'public', att.urlArquivo.replace(/^\//, ''))
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    await prisma.anexo.delete({ where: { id: att.id } })
  }

  for (const att of attachments) {
    const localUrl = process.env.VERCEL ? att.url : await downloadAttachment(att.url, att.name, entityId)
    if (localUrl) {
      const sanitizedNomeArquivo = sanitizeFilename(att.name)
      await prisma.anexo.create({
        data: {
          nomeArquivo: sanitizedNomeArquivo,
          urlArquivo: localUrl,
          tamanho: att.size,
          tipoMime: att.mimeType,
          entidadeTipo: entityType,
          entidadeId: existingRecordId,
        },
      })
      savedCount++
    }
  }

  return savedCount
}

async function fetchExternalData(entity: string, org: string): Promise<ExternalData[]> {
  const url = `${EXTERNAL_API_BASE}/${entity}?org=${org}&limit=500`
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.TRANSPARENCIA_CREDENCIAL || ''}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`External API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.data || []
}

function mapExternalToPrisma(entity: string, externalData: ExternalData): Record<string, unknown> {
  const mapping = entityFieldMapping[entity]
  if (!mapping) {
    throw new Error(`Unknown entity: ${entity}`)
  }

  const result: Record<string, unknown> = {}

  for (const [externalKey, prismaKey] of Object.entries(mapping)) {
    if (externalKey === 'id') {
      result[prismaKey] = externalData.id
      continue
    }

    const value = externalData[externalKey]
    if (value === undefined || value === null) continue
    
    const stringValue = String(value).trim()
    if (stringValue === '') continue

    if (externalKey.includes('_date') || externalKey === 'created_at' || externalKey === 'start_date' || externalKey === 'end_date' || externalKey === 'commitment_date' || externalKey === 'opening_date') {
      const dateObj = new Date(stringValue)
      if (!isNaN(dateObj.getTime())) {
        result[prismaKey] = dateObj
      }
    } else if (externalKey === 'estimated_value' || externalKey === 'value' || externalKey === 'predicted_value' || externalKey === 'collected_value' || externalKey === 'initial_value' || externalKey === 'total_value' || externalKey === 'base_salary' || externalKey === 'benefits' || externalKey === 'allowances' || externalKey === 'deductions' || externalKey === 'net_salary') {
      const num = parseNumericValue(value)
      if (num !== null) {
        result[prismaKey] = num
      }
    } else if (externalKey === 'is_reissue' || externalKey === 'send_transferegov') {
      result[prismaKey] = Boolean(value)
    } else if (externalKey === 'contract_validity_months' || externalKey === 'fiscal_year' || externalKey === 'reference_year' || externalKey === 'procurement_year' || externalKey === 'contract_year') {
      const num = parseInt(stringValue, 10)
      if (!isNaN(num)) {
        result[prismaKey] = num
      }
    } else {
      result[prismaKey] = value
    }
  }

  return result
}

async function importData(entity: string, data: ExternalData[]): Promise<ImportResults> {
  const prismaModel = getPrismaModel(entity)
  if (!prismaModel) {
    throw new Error(`Unknown model for entity: ${entity}`)
  }

  const entityType = entityAttachmentType[entity]
  const importResults = { created: 0, updated: 0, errors: 0, attachments: 0, deleted: 0 }

  const externalIds = data.map(item => item.id)

  for (const item of data) {
    try {
      const mappedData = normalizeForEntity(entity, item, mapExternalToPrisma(entity, item))
      const externalId = item.id
      const attachments = item.attachments as ExternalAttachment[] | undefined
      
      const cleanPayload: Record<string, unknown> = { ...item }
      delete cleanPayload.attachments
      if (entitiesWithPayload.has(entity)) {
        mappedData.payload = cleanPayload
      }

      const existing = await prismaModel.findFirst({
        where: { idExternalRef: externalId },
      })

      let recordId: string

      if (existing) {
        await prismaModel.update({
          where: { id: existing.id },
          data: mappedData,
        })
        recordId = existing.id
        importResults.updated++
      } else {
        const created = await prismaModel.create({
          data: mappedData,
        })
        recordId = created.id
        importResults.created++
      }

      if (attachments && attachments.length > 0) {
        const savedAttachments = await saveAttachments(attachments, externalId, entityType, recordId)
        importResults.attachments += savedAttachments
      }
    } catch (error) {
      console.error(`Error importing item ${item.id}:`, error)
      importResults.errors++
    }
  }

  if (externalIds.length > 0) {
    const deletedRecordsList = await prismaModel.findMany({
      where: {
        idExternalRef: { notIn: externalIds }
      },
      select: { id: true }
    })

    const deletedRecords = await prismaModel.deleteMany({
      where: {
        idExternalRef: { notIn: externalIds }
      }
    })
    importResults.deleted = deletedRecords.count

    if (deletedRecordsList.length > 0) {
      const deletedIds = deletedRecordsList.map((r: { id: string }) => r.id)
      
      await prisma.anexo.deleteMany({
        where: {
          entidadeId: { in: deletedIds },
          entidadeTipo: entityType
        }
      })
    }
  }

  return importResults
}

async function processEntityWebhook(entity: string, org: string): Promise<EntityWebhookResult> {
  console.log(`Fetching ${entity} from external API with org=${org}`)

  const externalData = await fetchExternalData(entity, org)

  if (!externalData || externalData.length === 0) {
    const prismaModel = getPrismaModel(entity)
    if (prismaModel) {
      const deletedAll = await prismaModel.deleteMany({
        where: { idExternalRef: { not: null } }
      })
      return {
        success: true,
        entity,
        org,
        message: 'Nenhum dado encontrado - todos os registros foram removidos',
        imported: { created: 0, updated: 0, errors: 0, attachments: 0, deleted: deletedAll.count },
      }
    }
    return {
      success: true,
      entity,
      org,
      message: 'Nenhum dado encontrado para importação',
      imported: { created: 0, updated: 0, errors: 0, attachments: 0, deleted: 0 },
    }
  }

  const importResults = await importData(entity, externalData)

  return {
    success: true,
    entity,
    org,
    totalRecords: externalData.length,
    imported: importResults,
  }
}

async function processAllEntityWebhooks(org: string): Promise<Array<EntityWebhookResult | EntityWebhookFailure>> {
  console.log(`Starting webhook sync for all entities with org=${org}`)

  const results: Array<EntityWebhookResult | EntityWebhookFailure> = []

  for (const entity of validEntities) {
    try {
      results.push(await processEntityWebhook(entity, org))
    } catch (error) {
      console.error(`Webhook error for ${entity}:`, error)
      results.push({
        success: false,
        entity,
        org,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const failedCount = results.filter((result) => result.success === false).length
  console.log(`Finished webhook sync for all entities with ${failedCount} error(s)`)

  return results
}

function getPublicJob(job: SyncJob | null) {
  if (!job) return null

  return {
    id: job.id,
    org: job.org,
    entity: job.entity,
    status: job.status,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    message: job.message,
    results: job.results,
    result: job.result,
    error: job.error,
  }
}

function startBackgroundSync(org: string, entity?: string) {
  const state = getSyncJobState()

  if (state.running && state.currentJob) {
    return {
      accepted: false,
      job: state.currentJob,
    }
  }

  const job: SyncJob = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    org,
    entity,
    status: 'running',
    startedAt: new Date().toISOString(),
    message: entity
      ? `Importação de ${entity} em execução em segundo plano`
      : 'Importação de todas as entidades em execução em segundo plano',
  }

  state.running = true
  state.currentJob = job
  state.lastJob = job

  void (async () => {
    try {
      if (entity) {
        job.result = await processEntityWebhook(entity, org)
        job.message = `Importação de ${entity} concluída`
      } else {
        job.results = await processAllEntityWebhooks(org)
        const failedCount = job.results.filter((result) => result.success === false).length
        job.message = failedCount === 0
          ? 'Importação de todas as entidades concluída'
          : `Importação concluída com ${failedCount} erro(s)`
      }

      job.status = 'completed'
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'
      job.message = 'Importação em segundo plano falhou'
      console.error('Background webhook sync failed:', error)
    } finally {
      job.finishedAt = new Date().toISOString()
      state.running = false
      state.currentJob = null
      state.lastJob = job
    }
  })()

  return {
    accepted: true,
    job,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity')?.trim()
    const org = searchParams.get('org') || DEFAULT_ORG
    const wait = searchParams.get('wait') === '1'
    const status = searchParams.get('status') === '1'

    if (status) {
      const state = getSyncJobState()

      return NextResponse.json({
        success: true,
        running: state.running,
        currentJob: getPublicJob(state.currentJob),
        lastJob: getPublicJob(state.lastJob),
      })
    }

    if (entity && !validEntities.includes(entity)) {
      return NextResponse.json(
        { error: `Entidade inválida. Entidades disponíveis: ${validEntities.join(', ')}` },
        { status: 400 }
      )
    }

    if (!wait) {
      const { accepted, job } = startBackgroundSync(org, entity || undefined)

      return NextResponse.json({
        success: true,
        org,
        entity: entity || undefined,
        scheduled: accepted,
        alreadyRunning: !accepted,
        job: getPublicJob(job),
        statusUrl: '/api/acordar/webhook?status=1',
        message: accepted
          ? 'Importação agendada para execução em segundo plano'
          : 'Já existe uma importação em execução em segundo plano',
      })
    }

    if (!entity) {
      const results = await processAllEntityWebhooks(org)
      const failedCount = results.filter((result) => result.success === false).length

      return NextResponse.json(
        {
          success: failedCount === 0,
          org,
          entities: validEntities,
          results,
          message: failedCount === 0
            ? 'Importação de todas as entidades concluída'
            : `Importação concluída com ${failedCount} erro(s)`,
        }
      )
    }

    const result = await processEntityWebhook(entity, org)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: `Erro ao processar webhook: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
