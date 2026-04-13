import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

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
    accounting_id: 'accountingId',
    revenue_nature: 'naturezaReceita',
    predicted_value: 'valorPrevisto',
    collected_value: 'valorArrecadado',
    fiscal_year: 'exercicio',
    org_unit: 'orgaoNome',
    source_destination: 'fonteRecurso',
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
    reference_period: 'referenciaPeriod',
    created_at: 'createdAt',
  },
  agreements: {
    id: 'idExternalRef',
    parties: 'partes',
    object: 'objeto',
    status: 'status',
    total_value: 'valorTotal',
    start_date: 'dataInicioVigencia',
    end_date: 'dataFimVigencia',
    goals: 'objetivos',
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
    const localUrl = await downloadAttachment(att.url, att.name, entityId)
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

    if (externalKey.includes('_date') || externalKey === 'start_date' || externalKey === 'end_date' || externalKey === 'commitment_date' || externalKey === 'opening_date') {
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

async function importData(entity: string, data: ExternalData[]) {
  const modelName = prismaModelMap[entity]
  if (!modelName) {
    throw new Error(`Unknown model for entity: ${entity}`)
  }

  const prismaModel = (prisma as any)[modelName]
  if (!prismaModel) {
    throw new Error(`Prisma model not found: ${modelName}`)
  }

  const entityType = entityAttachmentType[entity]
  const importResults = { created: 0, updated: 0, errors: 0, attachments: 0, deleted: 0 }

  const externalIds = data.map(item => item.id)

  for (const item of data) {
    try {
      const mappedData = mapExternalToPrisma(entity, item)
      const externalId = item.id
      const attachments = item.attachments as ExternalAttachment[] | undefined
      
      const { attachments: _att, ...cleanPayload } = item
      mappedData.payload = cleanPayload

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
    const deletedRecords = await prismaModel.deleteMany({
      where: {
        idExternalRef: { notIn: externalIds }
      }
    })
    importResults.deleted = deletedRecords.count

    if (deletedRecords.count > 0) {
      const deletedRecordsList = await prismaModel.findMany({
        where: { idExternalRef: { notIn: externalIds } },
        select: { id: true }
      })
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity')
    const org = searchParams.get('org') || DEFAULT_ORG

    if (!entity) {
      return NextResponse.json(
        { error: 'Parâmetro "entity" é obrigatório' },
        { status: 400 }
      )
    }

    const validEntities = Object.keys(entityFieldMapping)
    if (!validEntities.includes(entity)) {
      return NextResponse.json(
        { error: `Entidade inválida. Entidades disponíveis: ${validEntities.join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`Fetching ${entity} from external API with org=${org}`)

    const externalData = await fetchExternalData(entity, org)

    if (!externalData || externalData.length === 0) {
      const prismaModel = (prisma as any)[prismaModelMap[entity]]
      if (prismaModel) {
        const deletedAll = await prismaModel.deleteMany({
          where: { idExternalRef: { not: null } }
        })
        return NextResponse.json({
          success: true,
          entity,
          org,
          message: 'Nenhum dado encontrado - todos os registros foram removidos',
          imported: { created: 0, updated: 0, errors: 0, attachments: 0, deleted: deletedAll.count },
        })
      }
      return NextResponse.json({
        success: true,
        entity,
        org,
        message: 'Nenhum dado encontrado para importação',
        imported: { created: 0, updated: 0, errors: 0, attachments: 0, deleted: 0 },
      })
    }

    const importResults = await importData(entity, externalData)

    return NextResponse.json({
      success: true,
      entity,
      org,
      totalRecords: externalData.length,
      imported: importResults,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: `Erro ao processar webhook: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
