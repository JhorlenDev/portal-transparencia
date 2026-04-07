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
    organization_id: 'organizationId',
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
    organization_id: 'organizationId',
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
    organization_id: 'organizationId',
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
    organization_id: 'organizationId',
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
    organization_id: 'organizationId',
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
    organization_id: 'organizationId',
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

    const uniqueFilename = `${Date.now()}-${filename}`
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
      await prisma.anexo.create({
        data: {
          nomeArquivo: att.name,
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

  console.log(`Mapping entity: ${entity}, external data keys:`, Object.keys(externalData))

  for (const [externalKey, prismaKey] of Object.entries(mapping)) {
    if (externalKey === 'id') {
      result[prismaKey] = externalData.id
      continue
    }

    const value = externalData[externalKey]
    console.log(`  ${externalKey} -> ${prismaKey}:`, value, typeof value)
    
    if (value === undefined || value === null) continue

    if (externalKey.includes('_date') || externalKey === 'start_date' || externalKey === 'end_date' || externalKey === 'commitment_date' || externalKey === 'opening_date') {
      result[prismaKey] = new Date(value as string)
    } else if (externalKey === 'estimated_value' || externalKey === 'value' || externalKey === 'predicted_value' || externalKey === 'collected_value' || externalKey === 'initial_value' || externalKey === 'total_value' || externalKey === 'base_salary' || externalKey === 'benefits' || externalKey === 'allowances' || externalKey === 'deductions' || externalKey === 'net_salary') {
      result[prismaKey] = parseFloat(value as string)
    } else if (externalKey === 'is_reissue' || externalKey === 'send_transferegov') {
      result[prismaKey] = Boolean(value)
    } else if (externalKey === 'contract_validity_months' || externalKey === 'fiscal_year' || externalKey === 'reference_year' || externalKey === 'procurement_year' || externalKey === 'contract_year') {
      result[prismaKey] = parseInt(value as string, 10)
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
  const importResults = { created: 0, updated: 0, errors: 0, attachments: 0 }

  for (const item of data) {
    try {
      const mappedData = mapExternalToPrisma(entity, item)
      const externalId = item.id
      const attachments = item.attachments as ExternalAttachment[] | undefined

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
      console.error(`Stack: ${error instanceof Error ? error.stack : 'No stack'}`)
      importResults.errors++
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
      return NextResponse.json({
        success: true,
        entity,
        org,
        message: 'Nenhum dado encontrado para importação',
        imported: { created: 0, updated: 0, errors: 0, attachments: 0 },
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