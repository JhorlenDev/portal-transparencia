import { cache } from 'react'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface SiteConfig {
  [key: string]: string | null
}

const DEFAULT_CONFIG = [
  { chave: 'nome_site', valor: 'Portal da Transparência', tipo: 'text', descricao: 'Nome do site' },
  { chave: 'descricao', valor: 'Acesso à informação pública municipal', tipo: 'text', descricao: 'Descrição do portal' },
  { chave: 'logo_url', valor: '', tipo: 'url', descricao: 'URL do logo' },
  { chave: 'favicon_url', valor: '', tipo: 'url', descricao: 'URL do favicon' },
  { chave: 'email_contato', valor: '', tipo: 'email', descricao: 'E-mail de contato' },
  { chave: 'telefone_contato', valor: '', tipo: 'text', descricao: 'Telefone de contato' },
  { chave: 'endereco', valor: '', tipo: 'text', descricao: 'Endereço da prefeitura' },
  { chave: 'facebook', valor: '', tipo: 'url', descricao: 'Link do Facebook' },
  { chave: 'instagram', valor: '', tipo: 'url', descricao: 'Link do Instagram' },
  { chave: 'youtube', valor: '', tipo: 'url', descricao: 'Link do YouTube' },
  { chave: 'twitter', valor: '', tipo: 'url', descricao: 'Link do Twitter/X' },
  { chave: 'link_pncp', valor: 'https://pncp.gov.br', tipo: 'url', descricao: 'Link do PNCP' },
  { chave: 'link_portal_nacional', valor: '', tipo: 'url', descricao: 'Link do Portal Nacional' },
  { chave: 'link_fala_br', valor: 'https://falabr.cgu.gov.br', tipo: 'url', descricao: 'Link do Fala.BR' },
  { chave: 'link_diario_oficial', valor: '', tipo: 'url', descricao: 'Link do Diário Oficial' },
  { chave: 'texto_rodape', valor: 'Portal da Transparência Municipal', tipo: 'text', descricao: 'Texto do rodapé' },
  { chave: 'cor_primaria', valor: '#059669', tipo: 'color', descricao: 'Cor primária (hex)' },
  { chave: 'cor_secundaria', valor: '#047857', tipo: 'color', descricao: 'Cor secundária (hex)' },
]

let criacaoConfigPadrao: Promise<void> | null = null

/**
 * Num banco vazio varias paginas chegam aqui juntas. No mesmo processo elas compartilham uma
 * unica insercao; entre processos, chave unica (P2002) ou deadlock do MySQL (P2034) significam
 * que outra requisicao ja criou as configuracoes padrao.
 */
function criarConfigPadrao(): Promise<void> {
  criacaoConfigPadrao ??= prisma.configuracaoSite
    .createMany({ data: DEFAULT_CONFIG, skipDuplicates: true })
    .then(() => undefined)
    .catch((erro) => {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(erro.code)) return
      throw erro
    })
    .finally(() => {
      criacaoConfigPadrao = null
    })
  return criacaoConfigPadrao
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const configs = await prisma.configuracaoSite.findMany({
    orderBy: { ordem: 'asc' }
  })

  const configMap: SiteConfig = {}
  for (const c of configs) {
    configMap[c.chave] = c.valor
  }

  if (configs.length === 0) {
    await criarConfigPadrao()
    return DEFAULT_CONFIG.reduce((acc, c) => ({ ...acc, [c.chave]: c.valor }), {} as SiteConfig)
  }

  return configMap
}

export async function getSiteConfigValue(key: string): Promise<string | null> {
  const config = await prisma.configuracaoSite.findUnique({
    where: { chave: key }
  })
  return config?.valor || null
}

export async function setSiteConfigValue(key: string, value: string, tipo = 'text'): Promise<void> {
  await prisma.configuracaoSite.upsert({
    where: { chave: key },
    update: { valor: value, updatedAt: new Date() },
    create: { chave: key, valor: value, tipo: tipo }
  })
}

export async function getAllConfigs() {
  return prisma.configuracaoSite.findMany({
    orderBy: { ordem: 'asc' }
  })
}

export async function saveConfig(chave: string, valor: string, tipo?: string, descricao?: string) {
  return prisma.configuracaoSite.upsert({
    where: { chave },
    update: { valor, tipo: tipo || undefined, descricao: descricao || undefined, updatedAt: new Date() },
    create: { chave, valor, tipo, descricao }
  })
}

/**
 * A Fiorilli grava a receita em arvore (totalizadores + linhas analiticas de nivel 10) e repete
 * as transferencias da Uniao/Estado em listagens proprias. Para nao somar o mesmo valor mais de
 * uma vez, as consultas usam so as linhas analiticas da receita orcamentaria, a menos que um
 * tipo especifico seja pedido.
 */
const RECEITAS_SEM_DUPLICIDADE: Prisma.ReceitaWhereInput = {
  OR: [{ fonte: { not: 'fiorilli' } }, { tipoReceita: 'orcamentaria', nivel: 10 }],
}

/**
 * Com um tipo pedido, so as linhas mais detalhadas daquele tipo: Uniao e Estado tambem vem em
 * arvore (niveis 3, 4 e 7), sem o nivel 10 da orcamentaria, e cada nivel repete o total.
 */
async function filtroTipoReceita(tipo?: string): Promise<Prisma.ReceitaWhereInput> {
  if (!tipo) return RECEITAS_SEM_DUPLICIDADE
  const { _max } = await prisma.receita.aggregate({ where: { fonte: 'fiorilli', tipoReceita: tipo }, _max: { nivel: true } })
  return { fonte: 'fiorilli', tipoReceita: tipo, nivel: _max.nivel ?? undefined }
}

/**
 * Despesas e receitas podem vir de duas integracoes. Num exercicio que tem dados da Fiorilli
 * (o sistema contabil oficial), so eles aparecem, para nao somar o mesmo gasto duas vezes.
 * Os da API da Prefeitura continuam no banco e voltam a aparecer se a Fiorilli deixar de
 * cobrir o exercicio; exercicios sem Fiorilli seguem como antes.
 */
async function anosComFiorilli(modelo: 'despesa' | 'receita' | 'licitacao' | 'contrato'): Promise<number[]> {
  const where = { fonte: 'fiorilli' }
  switch (modelo) {
    case 'despesa':
      return (await prisma.despesa.groupBy({ by: ['exercicio'], where })).map((g) => g.exercicio)
    case 'receita':
      return (await prisma.receita.groupBy({ by: ['exercicio'], where })).map((g) => g.exercicio)
    case 'licitacao':
      return (await prisma.licitacao.groupBy({ by: ['ano'], where })).map((g) => g.ano)
    case 'contrato':
      return (await prisma.contrato.groupBy({ by: ['ano'], where })).map((g) => g.ano)
  }
}

function prioridadeFiorilli(anos: number[], campo: 'exercicio' | 'ano' = 'exercicio') {
  return anos.length === 0 ? {} : { OR: [{ fonte: 'fiorilli' }, { [campo]: { notIn: anos } }] }
}

export async function despesasVisiveis(): Promise<Prisma.DespesaWhereInput> {
  return prioridadeFiorilli(await anosComFiorilli('despesa'))
}

/** Prioridade da Fiorilli + so linhas analiticas da receita orcamentaria (ou o `tipo` pedido). */
export async function receitasVisiveis(tipo?: string): Promise<Prisma.ReceitaWhereInput> {
  const [anos, porTipo] = await Promise.all([anosComFiorilli('receita'), filtroTipoReceita(tipo)])
  return { AND: [prioridadeFiorilli(anos), porTipo] }
}

/** Mesma regra por `ano`: num ano com licitacoes da Fiorilli, as da Prefeitura saem das consultas. */
export async function licitacoesVisiveis(): Promise<Prisma.LicitacaoWhereInput> {
  return prioridadeFiorilli(await anosComFiorilli('licitacao'), 'ano')
}

export async function contratosVisiveis(): Promise<Prisma.ContratoWhereInput> {
  return prioridadeFiorilli(await anosComFiorilli('contrato'), 'ano')
}

export type DirecaoOrdem = 'asc' | 'desc'

function ordenacao<C extends string>(
  campos: readonly C[],
  campo: string | undefined,
  ordem: string | undefined
): { [K in C]?: DirecaoOrdem } | null {
  if (!campo || !campos.includes(campo as C)) return null
  return { [campo]: ordem === 'asc' ? 'asc' : 'desc' } as { [K in C]?: DirecaoOrdem }
}

/** Tipos de receita da Fiorilli disponiveis no exercicio (vazio quando so ha dados da Prefeitura). */
export async function getReceitasTipos(exercicio: number): Promise<string[]> {
  const tipos = await prisma.receita.groupBy({
    by: ['tipoReceita'],
    where: { exercicio, fonte: 'fiorilli', tipoReceita: { not: null } },
  })
  const ordem = ['orcamentaria', 'uniao', 'estado']
  return tipos.map((t) => t.tipoReceita!).sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b))
}

/** Orgaos com despesa no exercicio, para o filtro da pagina. */
export async function getDespesasOrgaos(exercicio: number): Promise<string[]> {
  const orgaos = await prisma.despesa.groupBy({
    by: ['orgaoNome'],
    where: { exercicio, orgaoNome: { not: null }, AND: [await despesasVisiveis()] },
    orderBy: { orgaoNome: 'asc' },
  })
  return orgaos.map((o) => o.orgaoNome!)
}

export async function getDiariasOrgaos(exercicio: number): Promise<string[]> {
  const orgaos = await prisma.diaria.groupBy({
    by: ['orgaoNome'],
    where: { exercicio, orgaoNome: { not: null } },
    orderBy: { orgaoNome: 'asc' },
  })
  return orgaos.map((o) => o.orgaoNome!)
}

export interface SiteStats {
  totalReceitas: number
  totalDespesas: number
  totalLicitacoes: number
  totalContratos: number
}

export interface PaginationInput {
  page?: number
  pageSize?: number
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export function getPagination(input?: PaginationInput) {
  const page = Math.max(1, Math.floor(input?.page || 1))
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(input?.pageSize || DEFAULT_PAGE_SIZE)))

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}

export function parsePaginationParams(params: { page?: string; limit?: string }): PaginationInput {
  return {
    page: params.page ? Number(params.page) : undefined,
    pageSize: params.limit ? Number(params.limit) : undefined,
  }
}

function buildPaginatedResult<T>(data: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}

export async function getSiteStats(): Promise<SiteStats> {
  const currentYear = new Date().getFullYear()

  const [receitasWhere, despesasWhere, licitacoesWhere, contratosWhere] = await Promise.all([
    receitasVisiveis(), despesasVisiveis(), licitacoesVisiveis(), contratosVisiveis(),
  ])

  const [receitas, despesas, licitacoes, contratos] = await Promise.all([
    prisma.receita.aggregate({
      _sum: { valorArrecadado: true },
      where: { exercicio: currentYear, AND: [receitasWhere] }
    }),
    prisma.despesa.aggregate({
      _sum: { valorEmpenhado: true },
      where: { exercicio: currentYear, AND: [despesasWhere] }
    }),
    prisma.licitacao.count({
      where: { ano: currentYear, AND: [licitacoesWhere] }
    }),
    prisma.contrato.count({
      where: { status: 'vigente', AND: [contratosWhere] }
    })
  ])

  return {
    totalReceitas: receitas._sum.valorArrecadado || 0,
    totalDespesas: despesas._sum.valorEmpenhado || 0,
    totalLicitacoes: licitacoes,
    totalContratos: contratos
  }
}

export async function getLatestDespesas(limit = 5) {
  return prisma.despesa.findMany({
    where: await despesasVisiveis(),
    orderBy: { dataEmpenho: 'desc' },
    take: limit,
    include: { orgao: false }
  })
}

export async function getLatestReceitas(limit = 5) {
  return prisma.receita.findMany({
    where: await receitasVisiveis(),
    take: limit,
    orderBy: { createdAt: 'desc' }
  })
}

export async function getLatestLicitacoes(limit = 5) {
  return prisma.licitacao.findMany({
    where: await licitacoesVisiveis(),
    orderBy: { dataAbertura: 'desc' },
    take: limit
  })
}

export async function getLatestContratos(limit = 5) {
  return prisma.contrato.findMany({
    where: { status: 'vigente', AND: [await contratosVisiveis()] },
    orderBy: { dataInicioVigencia: 'desc' },
    take: limit
  })
}

// Receitas
export interface ReceitasFilters {
  exercicio?: number
  categoria?: string
  search?: string
  /** orcamentaria | uniao | estado (so dados da Fiorilli). */
  tipo?: string
  ordenar?: string
  ordem?: string
}

export const RECEITAS_CAMPOS_ORDENACAO = ['codigoNatureza', 'naturezaReceita', 'valorPrevisto', 'valorArrecadado'] as const

export async function filtrosReceita(filters?: ReceitasFilters): Promise<Prisma.ReceitaWhereInput> {
  const year = filters?.exercicio || new Date().getFullYear()
  const where: Prisma.ReceitaWhereInput = { exercicio: year, AND: [await receitasVisiveis(filters?.tipo)] }

  if (filters?.categoria) {
    where.categoriaEconomica = filters.categoria
  }

  if (filters?.search) {
    where.OR = [
      { naturezaReceita: { contains: filters.search } },
      { codigoNatureza: { contains: filters.search } }
    ]
  }

  return where
}

export async function getReceitas(filters?: ReceitasFilters) {
  return getEntityWithAnexos('receita', prisma.receita.findMany({
    where: await filtrosReceita(filters),
    orderBy: { exercicio: 'desc' }
  }))
}

export async function getReceitasPage(filters?: ReceitasFilters, paginationInput?: PaginationInput) {
  const where = await filtrosReceita(filters)
  const pagination = getPagination(paginationInput)
  const ordem = ordenacao(RECEITAS_CAMPOS_ORDENACAO, filters?.ordenar, filters?.ordem)

  const [receitas, total] = await Promise.all([
    getEntityWithAnexos('receita', prisma.receita.findMany({
      where,
      orderBy: ordem ? [ordem, { id: 'asc' }] : [{ exercicio: 'desc' }, { createdAt: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
    })),
    prisma.receita.count({ where }),
  ])

  return buildPaginatedResult(receitas, total, pagination.page, pagination.pageSize)
}

export async function getReceitasStats(exercicio?: number, tipo?: string) {
  const year = exercicio || new Date().getFullYear()
  const receitas = await prisma.receita.aggregate({
    _sum: { valorPrevisto: true, valorArrecadado: true },
    where: { exercicio: year, AND: [await receitasVisiveis(tipo)] }
  })
  const previsto = receitas._sum.valorPrevisto || 0
  const arrecadado = receitas._sum.valorArrecadado || 0
  const realizacao = previsto > 0 ? (arrecadado / previsto) * 100 : 0
  return { previsto, arrecadado, realizacao }
}

// Despesas
export interface DespesasFilters {
  exercicio?: number
  categoria?: string
  search?: string
  status?: string
  orgao?: string
  /** Nome ou CPF/CNPJ do credor. */
  credor?: string
  fonteRecurso?: string
  ordenar?: string
  ordem?: string
}

export const DESPESAS_CAMPOS_ORDENACAO = ['dataEmpenho', 'valorEmpenhado', 'valorLiquidado', 'valorPago', 'credorNome', 'numeroEmpenho'] as const

export async function filtrosDespesa(filters?: DespesasFilters): Promise<Prisma.DespesaWhereInput> {
  const year = filters?.exercicio || new Date().getFullYear()
  const where: Prisma.DespesaWhereInput = { exercicio: year }
  const AND: Prisma.DespesaWhereInput[] = [await despesasVisiveis()]

  if (filters?.categoria) {
    where.elementoDespesaNome = filters.categoria
  }

  if (filters?.orgao) {
    where.orgaoNome = filters.orgao
  }

  if (filters?.fonteRecurso) {
    where.fonteRecurso = filters.fonteRecurso
  }

  if (filters?.credor) {
    AND.push({ OR: [{ credorNome: { contains: filters.credor } }, { credorCpfCnpj: { contains: filters.credor } }] })
  }

  if (filters?.search) {
    AND.push({
      OR: [
        { objeto: { contains: filters.search } },
        { credorNome: { contains: filters.search } },
        { numeroEmpenho: { contains: filters.search } }
      ]
    })
  }

  where.AND = AND
  return where
}

export async function getDespesas(filters?: DespesasFilters) {
  const where = await filtrosDespesa(filters)

  return getEntityWithAnexos('despesa', prisma.despesa.findMany({
    where,
    orderBy: { dataEmpenho: 'desc' }
  }))
}

export async function getDespesasPage(filters?: DespesasFilters, paginationInput?: PaginationInput) {
  const where = await filtrosDespesa(filters)
  const pagination = getPagination(paginationInput)
  const ordem = ordenacao(DESPESAS_CAMPOS_ORDENACAO, filters?.ordenar, filters?.ordem) ?? { dataEmpenho: 'desc' }

  const [despesas, total] = await Promise.all([
    getEntityWithAnexos('despesa', prisma.despesa.findMany({
      where,
      orderBy: [ordem, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    })),
    prisma.despesa.count({ where }),
  ])

  return buildPaginatedResult(despesas, total, pagination.page, pagination.pageSize)
}

// Detalhes. `cache` evita consultar duas vezes na mesma requisicao (metadados e pagina).

function anexosDe(entidadeTipo: string, entidadeId: string) {
  return prisma.anexo.findMany({
    where: { entidadeTipo, entidadeId },
    select: { id: true, nomeArquivo: true, tamanho: true, tipoMime: true },
    orderBy: { nomeArquivo: 'asc' },
  })
}

/**
 * Empenhos da Fiorilli de um processo licitatorio: o empenho guarda o numero do processo
 * (NUMLICIT, ex. "000060/25") no mesmo formato do numeroProcesso da licitacao.
 */
function empenhosDoProcesso(numeroProcesso: string | null) {
  if (!numeroProcesso) return Promise.resolve([])
  return prisma.despesa.findMany({
    where: { fonte: 'fiorilli', numeroLicitacao: numeroProcesso },
    select: {
      id: true, numeroEmpenho: true, exercicio: true, dataEmpenho: true, tipoMovimento: true,
      credorNome: true, valorEmpenhado: true, valorLiquidado: true, valorPago: true,
    },
    orderBy: [{ dataEmpenho: 'asc' }, { id: 'asc' }],
    take: 200,
  })
}

export const getDespesaDetalhe = cache(async (id: string) => {
  const despesa = await prisma.despesa.findUnique({ where: { id } })
  if (!despesa) return null
  const [anexos, licitacao] = await Promise.all([
    anexosDe('despesa', id),
    despesa.fonte === 'fiorilli' && despesa.numeroLicitacao
      ? prisma.licitacao.findFirst({ where: { fonte: 'fiorilli', numeroProcesso: despesa.numeroLicitacao }, select: { id: true } })
      : null,
  ])
  return { ...despesa, anexos, licitacaoId: licitacao?.id ?? null }
})

export const getLicitacaoDetalhe = cache(async (id: string) => {
  const licitacao = await prisma.licitacao.findUnique({
    where: { id },
    include: {
      contratos: {
        select: {
          id: true, numero: true, ano: true, contratadoNome: true, contratadoCnpj: true, status: true, objeto: true,
          valorInicial: true, valorAtual: true, dataInicioVigencia: true, dataFimVigencia: true,
        },
        orderBy: [{ dataInicioVigencia: 'asc' }, { id: 'asc' }],
      },
    },
  })
  if (!licitacao) return null
  const [anexos, empenhos] = await Promise.all([
    anexosDe('licitacao', id),
    licitacao.fonte === 'fiorilli' ? empenhosDoProcesso(licitacao.numeroProcesso) : [],
  ])
  return { ...licitacao, anexos, empenhos }
})

export const getContratoDetalhe = cache(async (id: string) => {
  const contrato = await prisma.contrato.findUnique({
    where: { id },
    include: { licitacao: { select: { id: true, numero: true, ano: true, numeroProcesso: true, modalidade: true, objeto: true } } },
  })
  if (!contrato) return null
  const [anexos, empenhos] = await Promise.all([
    anexosDe('contrato', id),
    contrato.fonte === 'fiorilli' ? empenhosDoProcesso(contrato.licitacaoNumero) : [],
  ])
  return { ...contrato, anexos, empenhos }
})

export const getDiariaDetalhe = cache(async (id: string) => {
  const diaria = await prisma.diaria.findUnique({ where: { id } })
  if (!diaria) return null
  // A chave do empenho e a mesma da carga de despesas: EMPRESA-exercicio-PKEMP.
  const payload = (diaria.payload ?? {}) as Record<string, string | null>
  const empenho = payload.PKEMP
    ? await prisma.despesa.findUnique({
        where: { fonte_idExternalRef: { fonte: 'fiorilli', idExternalRef: `${payload.EMPRESA ?? '1'}-${diaria.exercicio}-${payload.PKEMP}` } },
        select: { id: true, numeroEmpenho: true, exercicio: true, valorEmpenhado: true, valorPago: true, elementoDespesaNome: true },
      })
    : null
  return { ...diaria, empenho }
})

interface AttachmentData {
  id: string
  nomeArquivo: string
  urlArquivo: string
  tamanho: number | null
  tipoMime: string | null
}

async function getEntityWithAnexos<T extends { id: string }>(
  entity: 'contrato' | 'convenio' | 'licitacao' | 'receita' | 'servidor' | 'despesa',
  prismaQuery: Promise<T[]>
): Promise<Array<T & { anexos: AttachmentData[] }>> {
  const items = await prismaQuery
  const ids = items.map((item) => item.id)

  if (ids.length === 0) {
    return []
  }

  const anexos = await prisma.anexo.findMany({
    where: {
      entidadeTipo: entity,
      entidadeId: { in: ids }
    },
    select: {
      id: true,
      nomeArquivo: true,
      urlArquivo: true,
      tamanho: true,
      tipoMime: true,
      entidadeId: true,
    }
  })

  const anexosByEntity = new Map<string, AttachmentData[]>()
  for (const anexo of anexos) {
    const current = anexosByEntity.get(anexo.entidadeId) || []
    current.push({
      id: anexo.id,
      nomeArquivo: anexo.nomeArquivo,
      urlArquivo: anexo.urlArquivo,
      tamanho: anexo.tamanho,
      tipoMime: anexo.tipoMime,
    })
    anexosByEntity.set(anexo.entidadeId, current)
  }

  return items.map((item) => ({ ...item, anexos: anexosByEntity.get(item.id) || [] }))
}

/** Totais do exercicio; com `filters`, os mesmos filtros da listagem (orgao, credor, busca). */
export async function getDespesasStats(exercicio?: number, filters?: Omit<DespesasFilters, 'exercicio'>) {
  const year = exercicio || new Date().getFullYear()
  const despesas = await prisma.despesa.aggregate({
    _sum: { valorEmpenhado: true, valorLiquidado: true, valorPago: true },
    where: await filtrosDespesa({ ...filters, exercicio: year })
  })
  return {
    empenhado: despesas._sum.valorEmpenhado || 0,
    liquidado: despesas._sum.valorLiquidado || 0,
    pago: despesas._sum.valorPago || 0
  }
}

// Licitações
export interface LicitacoesFilters {
  ano?: number
  status?: string
  search?: string
  modalidade?: string
  ordenar?: string
  ordem?: string
}

export const LICITACOES_CAMPOS_ORDENACAO = ['dataAbertura', 'valorEstimado', 'numero', 'modalidade'] as const

export async function filtrosLicitacao(filters?: LicitacoesFilters): Promise<Prisma.LicitacaoWhereInput> {
  const year = filters?.ano || new Date().getFullYear()
  const where: Prisma.LicitacaoWhereInput = { ano: year, AND: [await licitacoesVisiveis()] }

  if (filters?.status) {
    where.status = filters.status
  }

  if (filters?.modalidade) {
    where.modalidade = filters.modalidade
  }

  if (filters?.search) {
    where.OR = [
      { objeto: { contains: filters.search } },
      { numero: { contains: filters.search } },
      { numeroProcesso: { contains: filters.search } }
    ]
  }

  return where
}

export async function getLicitacoes(filters?: LicitacoesFilters) {
  return getEntityWithAnexos('licitacao', prisma.licitacao.findMany({
    where: await filtrosLicitacao(filters),
    orderBy: { dataAbertura: 'desc' }
  }))
}

export async function getLicitacoesPage(filters?: LicitacoesFilters, paginationInput?: PaginationInput) {
  const where = await filtrosLicitacao(filters)
  const pagination = getPagination(paginationInput)
  const ordem = ordenacao(LICITACOES_CAMPOS_ORDENACAO, filters?.ordenar, filters?.ordem) ?? { dataAbertura: 'desc' }

  const [licitacoes, total] = await Promise.all([
    getEntityWithAnexos('licitacao', prisma.licitacao.findMany({
      where,
      orderBy: [ordem, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    })),
    prisma.licitacao.count({ where }),
  ])

  return buildPaginatedResult(licitacoes, total, pagination.page, pagination.pageSize)
}

export async function getLicitacoesStats(ano?: number) {
  const year = ano || new Date().getFullYear()
  const where: Prisma.LicitacaoWhereInput = { ano: year, AND: [await licitacoesVisiveis()] }
  const total = await prisma.licitacao.count({ where })
  const porStatus = await prisma.licitacao.groupBy({
    by: ['status'],
    where,
    _count: true
  })
  return { total, porStatus }
}

// Contratos
export interface ContratosFilters {
  ano?: number
  status?: string
  search?: string
  tipo?: string
  /** Nome ou CNPJ do contratado. */
  fornecedor?: string
  modalidade?: string
  ordenar?: string
  ordem?: string
}

export const CONTRATOS_CAMPOS_ORDENACAO = ['dataInicioVigencia', 'dataFimVigencia', 'valorInicial', 'valorAtual', 'contratadoNome', 'numero'] as const

export async function filtrosContrato(filters?: ContratosFilters): Promise<Prisma.ContratoWhereInput> {
  const year = filters?.ano || new Date().getFullYear()
  const where: Prisma.ContratoWhereInput = { ano: year }
  const AND: Prisma.ContratoWhereInput[] = [await contratosVisiveis()]

  if (filters?.status) {
    where.status = filters.status
  }

  if (filters?.tipo) {
    where.tipoContrato = filters.tipo
  }

  if (filters?.modalidade) {
    where.modalidade = filters.modalidade
  }

  if (filters?.fornecedor) {
    AND.push({ OR: [{ contratadoNome: { contains: filters.fornecedor } }, { contratadoCnpj: { contains: filters.fornecedor } }] })
  }

  if (filters?.search) {
    AND.push({
      OR: [
        { objeto: { contains: filters.search } },
        { contratadoNome: { contains: filters.search } },
        { numero: { contains: filters.search } }
      ]
    })
  }

  where.AND = AND
  return where
}

export async function getContratos(filters?: ContratosFilters) {
  return getEntityWithAnexos('contrato', prisma.contrato.findMany({
    where: await filtrosContrato(filters),
    orderBy: { dataInicioVigencia: 'desc' }
  }))
}

export async function getContratosPage(filters?: ContratosFilters, paginationInput?: PaginationInput) {
  const where = await filtrosContrato(filters)
  const pagination = getPagination(paginationInput)
  const ordem = ordenacao(CONTRATOS_CAMPOS_ORDENACAO, filters?.ordenar, filters?.ordem) ?? { dataInicioVigencia: 'desc' }

  const [contratos, total] = await Promise.all([
    getEntityWithAnexos('contrato', prisma.contrato.findMany({
      where,
      include: { licitacao: { select: { id: true, numero: true, ano: true, numeroProcesso: true, modalidade: true } } },
      orderBy: [ordem, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    })),
    prisma.contrato.count({ where }),
  ])

  return buildPaginatedResult(contratos, total, pagination.page, pagination.pageSize)
}

export async function getContratosStats(ano?: number) {
  const visiveis: Prisma.ContratoWhereInput = ano
    ? { ano, AND: [await contratosVisiveis()] }
    : await contratosVisiveis()
  const total = await prisma.contrato.count({ where: visiveis })
  const vigentes = await prisma.contrato.count({ where: { status: 'vigente', AND: [visiveis] } })
  const encerrados = await prisma.contrato.count({ where: { status: 'encerrado', AND: [visiveis] } })
  const valorTotal = await prisma.contrato.aggregate({
    _sum: { valorInicial: true },
    where: visiveis
  })
  return { total, vigentes, encerrados, valorTotal: valorTotal._sum.valorInicial || 0 }
}

/** O registro cru da API fica no banco para auditoria, mas nao vai nas respostas paginadas. */
function semPayload<T extends { payload: unknown }>(linhas: T[]): Array<Omit<T, 'payload'>> {
  return linhas.map((linha) => {
    const resto: Partial<T> = { ...linha }
    delete resto.payload
    return resto as Omit<T, 'payload'>
  })
}

// Diárias (somente Fiorilli)
export interface DiariasFilters {
  exercicio?: number
  orgao?: string
  /** Nome ou cargo do favorecido. */
  favorecido?: string
  search?: string
  ordenar?: string
  ordem?: string
}

export const DIARIAS_CAMPOS_ORDENACAO = ['data', 'valor', 'favorecido', 'quantidade'] as const

export function filtrosDiaria(filters?: DiariasFilters): Prisma.DiariaWhereInput {
  const where: Prisma.DiariaWhereInput = { exercicio: filters?.exercicio || new Date().getFullYear() }
  const AND: Prisma.DiariaWhereInput[] = []

  if (filters?.orgao) where.orgaoNome = filters.orgao
  if (filters?.favorecido) {
    AND.push({ OR: [{ favorecido: { contains: filters.favorecido } }, { cargo: { contains: filters.favorecido } }] })
  }
  if (filters?.search) {
    AND.push({ OR: [{ descricao: { contains: filters.search } }, { favorecido: { contains: filters.search } }] })
  }

  if (AND.length > 0) where.AND = AND
  return where
}

export async function getDiariasPage(filters?: DiariasFilters, paginationInput?: PaginationInput) {
  const where = filtrosDiaria(filters)
  const pagination = getPagination(paginationInput)
  const ordem = ordenacao(DIARIAS_CAMPOS_ORDENACAO, filters?.ordenar, filters?.ordem) ?? { data: 'desc' }

  const [diarias, total, soma] = await Promise.all([
    prisma.diaria.findMany({
      where,
      orderBy: [ordem, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }).then(semPayload),
    prisma.diaria.count({ where }),
    prisma.diaria.aggregate({ where, _sum: { valor: true, quantidade: true }, _count: { quantidade: true } }),
  ])

  return {
    ...buildPaginatedResult(diarias, total, pagination.page, pagination.pageSize),
    // A API nem sempre informa a quantidade: comQuantidade diz em quantos pagamentos ela veio.
    totais: { valor: soma._sum.valor || 0, quantidade: soma._sum.quantidade || 0, comQuantidade: soma._count.quantidade },
  }
}

// Transferências entre entidades do município (somente Fiorilli)
export interface TransferenciasFilters {
  exercicio?: number
  mes?: number
  /** Nome ou CNPJ da entidade pagadora ou recebedora. */
  entidade?: string
  ordenar?: string
  ordem?: string
}

export const TRANSFERENCIAS_CAMPOS_ORDENACAO = ['data', 'valorRepasse', 'entidadePagadora', 'entidadeRecebedora'] as const

export function filtrosTransferencia(filters?: TransferenciasFilters): Prisma.TransferenciaWhereInput {
  const where: Prisma.TransferenciaWhereInput = { exercicio: filters?.exercicio || new Date().getFullYear() }

  if (filters?.mes) where.mes = filters.mes
  if (filters?.entidade) {
    where.OR = [
      { entidadePagadora: { contains: filters.entidade } },
      { entidadeRecebedora: { contains: filters.entidade } },
      { cnpjPagadora: { contains: filters.entidade } },
      { cnpjRecebedora: { contains: filters.entidade } },
    ]
  }

  return where
}

/** Total recebido por entidade no periodo filtrado, do maior para o menor. */
export async function getTransferenciasPorRecebedora(filters?: TransferenciasFilters) {
  const grupos = await prisma.transferencia.groupBy({
    by: ['entidadeRecebedora'],
    where: filtrosTransferencia(filters),
    _sum: { valorRepasse: true },
    _count: true,
    orderBy: { _sum: { valorRepasse: 'desc' } },
  })
  return grupos.map((g) => ({ entidade: g.entidadeRecebedora, valor: g._sum.valorRepasse || 0, lancamentos: g._count }))
}

export async function getTransferenciasPage(filters?: TransferenciasFilters, paginationInput?: PaginationInput) {
  const where = filtrosTransferencia(filters)
  const pagination = getPagination(paginationInput)
  const ordem = ordenacao(TRANSFERENCIAS_CAMPOS_ORDENACAO, filters?.ordenar, filters?.ordem) ?? { data: 'desc' }

  const [transferencias, total, soma] = await Promise.all([
    prisma.transferencia.findMany({
      where,
      orderBy: [ordem, { id: 'asc' }],
      skip: pagination.skip,
      take: pagination.take,
    }).then(semPayload),
    prisma.transferencia.count({ where }),
    prisma.transferencia.aggregate({ where, _sum: { valorRepasse: true, valorDevolucao: true } }),
  ])

  return {
    ...buildPaginatedResult(transferencias, total, pagination.page, pagination.pageSize),
    totais: { repasse: soma._sum.valorRepasse || 0, devolucao: soma._sum.valorDevolucao || 0 },
  }
}

// Servidores
export interface ServidoresFilters {
  anoReferencia?: number
  vinculo?: string
  search?: string
  lotacao?: string
}

export async function getServidores(filters?: ServidoresFilters) {
  const year = filters?.anoReferencia || new Date().getFullYear()
  const where: Prisma.ServidorWhereInput = { anoReferencia: year }
  
  if (filters?.vinculo) {
    where.vinculo = filters.vinculo
  }
  
  if (filters?.lotacao) {
    where.lotacao = filters.lotacao
  }
  
  if (filters?.search) {
    where.OR = [
      { nome: { contains: filters.search } },
      { matricula: { contains: filters.search } },
      { cargo: { contains: filters.search } }
    ]
  }
  
  return getEntityWithAnexos('servidor', prisma.servidor.findMany({
    where,
    orderBy: { nome: 'asc' }
  }))
}

export async function getServidoresPage(filters?: ServidoresFilters, paginationInput?: PaginationInput) {
  const year = filters?.anoReferencia || new Date().getFullYear()
  const where: Prisma.ServidorWhereInput = { anoReferencia: year }
  const pagination = getPagination(paginationInput)

  if (filters?.vinculo) {
    where.vinculo = filters.vinculo
  }

  if (filters?.lotacao) {
    where.lotacao = filters.lotacao
  }

  if (filters?.search) {
    where.OR = [
      { nome: { contains: filters.search } },
      { matricula: { contains: filters.search } },
      { cargo: { contains: filters.search } }
    ]
  }

  const [servidores, total] = await Promise.all([
    getEntityWithAnexos('servidor', prisma.servidor.findMany({
      where,
      orderBy: { nome: 'asc' },
      skip: pagination.skip,
      take: pagination.take,
    })),
    prisma.servidor.count({ where }),
  ])

  return buildPaginatedResult(servidores, total, pagination.page, pagination.pageSize)
}

export async function getGlobalSearch(query: string) {
  if (!query) return { despesas: [], receitas: [], licitacoes: [], contratos: [], servidores: [] }

  const [despesasWhere, receitasWhere, licitacoesWhere, contratosWhere] = await Promise.all([
    despesasVisiveis(), receitasVisiveis(), licitacoesVisiveis(), contratosVisiveis(),
  ])

  const [despesas, receitas, licitacoes, contratos, servidores] = await Promise.all([
    prisma.despesa.findMany({
      where: { OR: [{ credorNome: { contains: query } }, { credorCpfCnpj: { contains: query } }, { objeto: { contains: query } }, { numeroEmpenho: { contains: query } }], AND: [despesasWhere] },
      take: 5
    }),
    prisma.receita.findMany({
      where: { OR: [{ naturezaReceita: { contains: query } }, { categoriaEconomica: { contains: query } }, { fonteRecursoNome: { contains: query } }], AND: [receitasWhere] },
      take: 5
    }),
    prisma.licitacao.findMany({
      where: { OR: [{ objeto: { contains: query } }, { numero: { contains: query } }, { modalidade: { contains: query } }], AND: [licitacoesWhere] },
      take: 5
    }),
    prisma.contrato.findMany({
      where: { OR: [{ objeto: { contains: query } }, { contratadoNome: { contains: query } }, { numero: { contains: query } }, { contratadoCnpj: { contains: query } }], AND: [contratosWhere] },
      take: 5
    }),
    prisma.servidor.findMany({
      where: { OR: [{ nome: { contains: query } }, { matricula: { contains: query } }, { cargo: { contains: query } }, { lotacao: { contains: query } }] },
      take: 5
    })
  ])

  return { despesas, receitas, licitacoes, contratos, servidores }
}

export async function getServidoresStats(anoReferencia?: number) {
  const year = anoReferencia || new Date().getFullYear()
  const total = await prisma.servidor.count({ where: { anoReferencia: year } })
  const totalRemuneracao = await prisma.servidor.aggregate({
    _sum: { remuneracaoBruta: true },
    where: { anoReferencia: year }
  })
  return { total, totalRemuneracao: totalRemuneracao._sum.remuneracaoBruta || 0 }
}

// Convênios
export interface ConveniosFilters {
  ano?: number
  status?: string
  search?: string
  tipo?: string
}

export async function getConvenios(filters?: ConveniosFilters) {
  const year = filters?.ano || new Date().getFullYear()
  const where: Prisma.ConvenioWhereInput = { ano: year }
  
  if (filters?.status) {
    where.status = filters.status
  }
  
  if (filters?.tipo) {
    where.tipo = filters.tipo
  }
  
  if (filters?.search) {
    where.OR = [
      { objeto: { contains: filters.search } },
      { concedente: { contains: filters.search } },
      { numero: { contains: filters.search } }
    ]
  }
  
  return getEntityWithAnexos('convenio', prisma.convenio.findMany({
    where,
    orderBy: { dataInicioVigencia: 'desc' }
  }))
}

export async function getConveniosPage(filters?: ConveniosFilters, paginationInput?: PaginationInput) {
  const year = filters?.ano || new Date().getFullYear()
  const where: Prisma.ConvenioWhereInput = { ano: year }
  const pagination = getPagination(paginationInput)

  if (filters?.status) {
    where.status = filters.status
  }

  if (filters?.tipo) {
    where.tipo = filters.tipo
  }

  if (filters?.search) {
    where.OR = [
      { objeto: { contains: filters.search } },
      { concedente: { contains: filters.search } },
      { numero: { contains: filters.search } }
    ]
  }

  const [convenios, total] = await Promise.all([
    getEntityWithAnexos('convenio', prisma.convenio.findMany({
      where,
      orderBy: { dataInicioVigencia: 'desc' },
      skip: pagination.skip,
      take: pagination.take,
    })),
    prisma.convenio.count({ where }),
  ])

  return buildPaginatedResult(convenios, total, pagination.page, pagination.pageSize)
}

export async function getConveniosStats(ano?: number) {
  const year = ano || new Date().getFullYear()
  const total = await prisma.convenio.count({ where: { ano: year } })
  const valorTotal = await prisma.convenio.aggregate({
    _sum: { valorTotal: true },
    where: { ano: year }
  })
  return { total, valorTotal: valorTotal._sum.valorTotal || 0 }
}

// Datasets
export async function getDatasets() {
  return prisma.dataset.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' }
  })
}

// Dynamic filter options - anos disponíveis com dados
export async function getAvailableYears(table: 'receitas' | 'despesas' | 'licitacoes' | 'contratos' | 'servidores' | 'convenios') {
  const currentYear = new Date().getFullYear()
  
  switch (table) {
    case 'receitas':
      const receitasYears = await prisma.receita.groupBy({
        by: ['exercicio'],
        orderBy: { exercicio: 'desc' },
        take: 10
      })
      return receitasYears.map(r => r.exercicio)
    
    case 'despesas':
      const despesasYears = await prisma.despesa.groupBy({
        by: ['exercicio'],
        orderBy: { exercicio: 'desc' },
        take: 10
      })
      return despesasYears.map(d => d.exercicio)
    
    case 'licitacoes':
      const licitacoesYears = await prisma.licitacao.groupBy({
        by: ['ano'],
        orderBy: { ano: 'desc' },
        take: 10
      })
      return licitacoesYears.map(l => l.ano)
    
    case 'contratos':
      const contratosYears = await prisma.contrato.groupBy({
        by: ['ano'],
        orderBy: { ano: 'desc' },
        take: 10
      })
      return contratosYears.map(c => c.ano)
    
    case 'servidores':
      const servidoresYears = await prisma.servidor.groupBy({
        by: ['anoReferencia'],
        orderBy: { anoReferencia: 'desc' },
        take: 10
      })
      return servidoresYears.map(s => s.anoReferencia)
    
    case 'convenios':
      const conveniosYears = await prisma.convenio.groupBy({
        by: ['ano'],
        orderBy: { ano: 'desc' },
        take: 10
      })
      return conveniosYears.map(c => c.ano)
    
    default:
      return [currentYear]
  }
}

// Dynamic filter options - categorias/status/modalidades disponíveis
export async function getDynamicOptions(
  table: 'receitas' | 'despesas' | 'licitacoes' | 'contratos' | 'servidores' | 'convenios',
  type: 'categoria' | 'status' | 'modalidade' | 'tipo' | 'vinculo',
  ano?: number
) {
  const currentYear = new Date().getFullYear()
  const year = ano || currentYear
  
  switch (table) {
    case 'receitas': {
      if (type === 'categoria') {
        const cats = await prisma.receita.groupBy({
          by: ['categoriaEconomica'],
          where: { exercicio: year },
          orderBy: { categoriaEconomica: 'asc' }
        })
        return cats.filter(c => c.categoriaEconomica).map(c => ({ value: c.categoriaEconomica!, label: c.categoriaEconomica! }))
      }
      break
    }
    
    case 'despesas': {
      // Despesas don't have categoria in schema - return empty
      return []
    }
    
    case 'licitacoes': {
      if (type === 'modalidade') {
        const mods = await prisma.licitacao.groupBy({
          by: ['modalidade'],
          where: { ano: year },
          orderBy: { modalidade: 'asc' }
        })
        return mods.filter(m => m.modalidade).map(m => ({ value: m.modalidade!, label: m.modalidade! }))
      }
      if (type === 'status') {
        const stats = await prisma.licitacao.groupBy({
          by: ['status'],
          where: { ano: year },
          orderBy: { status: 'asc' }
        })
        return stats.filter(s => s.status).map(s => ({ value: s.status!, label: s.status!.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))
      }
      break
    }
    
    case 'contratos': {
      if (type === 'tipo') {
        const tipos = await prisma.contrato.groupBy({
          by: ['tipoContrato'],
          where: { ano: year },
          orderBy: { tipoContrato: 'asc' }
        })
        return tipos.filter(t => t.tipoContrato).map(t => ({ value: t.tipoContrato!, label: t.tipoContrato! }))
      }
      if (type === 'status') {
        const stats = await prisma.contrato.groupBy({
          by: ['status'],
          where: { ano: year },
          orderBy: { status: 'asc' }
        })
        return stats.filter(s => s.status).map(s => ({ value: s.status!, label: s.status!.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))
      }
      break
    }
    
    case 'servidores': {
      if (type === 'vinculo') {
        const vinculos = await prisma.servidor.groupBy({
          by: ['vinculo'],
          where: { anoReferencia: year },
          orderBy: { vinculo: 'asc' }
        })
        return vinculos.filter(v => v.vinculo).map(v => ({ value: v.vinculo!, label: v.vinculo!.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))
      }
      break
    }
    
    case 'convenios': {
      if (type === 'tipo') {
        const tipos = await prisma.convenio.groupBy({
          by: ['tipo'],
          where: { ano: year },
          orderBy: { tipo: 'asc' }
        })
        return tipos.filter(t => t.tipo).map(t => ({ value: t.tipo!, label: t.tipo! }))
      }
      if (type === 'status') {
        const stats = await prisma.convenio.groupBy({
          by: ['status'],
          where: { ano: year },
          orderBy: { status: 'asc' }
        })
        return stats.filter(s => s.status).map(s => ({ value: s.status!, label: s.status!.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }))
      }
      break
    }
  }
  
  return []
}
