import { prisma } from '@/lib/prisma'

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

export async function getSiteConfig(): Promise<SiteConfig> {
  const configs = await prisma.configuracaoSite.findMany({
    orderBy: { ordem: 'asc' }
  })

  const configMap: SiteConfig = {}
  for (const c of configs) {
    configMap[c.chave] = c.valor
  }

  if (configs.length === 0) {
    for (const defaultConfig of DEFAULT_CONFIG) {
      await prisma.configuracaoSite.create({ data: defaultConfig })
    }
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

export interface SiteStats {
  totalReceitas: number
  totalDespesas: number
  totalLicitacoes: number
  totalContratos: number
}

export async function getSiteStats(): Promise<SiteStats> {
  const currentYear = new Date().getFullYear()

  const [receitas, despesas, licitacoes, contratos] = await Promise.all([
    prisma.receita.aggregate({
      _sum: { valorArrecadado: true },
      where: { exercicio: currentYear }
    }),
    prisma.despesa.aggregate({
      _sum: { valorPago: true },
      where: { exercicio: currentYear }
    }),
    prisma.licitacao.count({
      where: { ano: currentYear }
    }),
    prisma.contrato.count({
      where: { status: 'vigente' }
    })
  ])

  return {
    totalReceitas: receitas._sum.valorArrecadado || 0,
    totalDespesas: despesas._sum.valorPago || 0,
    totalLicitacoes: licitacoes,
    totalContratos: contratos
  }
}

export async function getLatestDespesas(limit = 5) {
  return prisma.despesa.findMany({
    orderBy: { dataEmpenho: 'desc' },
    take: limit,
    include: { orgao: false }
  })
}

export async function getLatestLicitacoes(limit = 5) {
  return prisma.licitacao.findMany({
    orderBy: { dataAbertura: 'desc' },
    take: limit
  })
}

export async function getLatestContratos(limit = 5) {
  return prisma.contrato.findMany({
    where: { status: 'vigente' },
    orderBy: { dataInicioVigencia: 'desc' },
    take: limit
  })
}

// Receitas
export async function getReceitas(exercicio?: number) {
  const year = exercicio || new Date().getFullYear()
  return prisma.receita.findMany({
    where: { exercicio: year },
    orderBy: { exercicio: 'desc' }
  })
}

export async function getReceitasStats(exercicio?: number) {
  const year = exercicio || new Date().getFullYear()
  const receitas = await prisma.receita.aggregate({
    _sum: { valorPrevisto: true, valorArrecadado: true },
    where: { exercicio: year }
  })
  const previsto = receitas._sum.valorPrevisto || 0
  const arrecadado = receitas._sum.valorArrecadado || 0
  const realizacao = previsto > 0 ? (arrecadado / previsto) * 100 : 0
  return { previsto, arrecadado, realizacao }
}

// Despesas
export async function getDespesas(exercicio?: number) {
  const year = exercicio || new Date().getFullYear()
  return prisma.despesa.findMany({
    where: { exercicio: year },
    orderBy: { dataEmpenho: 'desc' }
  })
}

export async function getDespesasStats(exercicio?: number) {
  const year = exercicio || new Date().getFullYear()
  const despesas = await prisma.despesa.aggregate({
    _sum: { valorEmpenhado: true, valorLiquidado: true, valorPago: true },
    where: { exercicio: year }
  })
  return {
    empenhado: despesas._sum.valorEmpenhado || 0,
    liquidado: despesas._sum.valorLiquidado || 0,
    pago: despesas._sum.valorPago || 0
  }
}

// Licitações
export async function getLicitacoes(ano?: number, status?: string) {
  const year = ano || new Date().getFullYear()
  const where: any = { ano: year }
  if (status) where.status = status
  return prisma.licitacao.findMany({
    where,
    orderBy: { dataAbertura: 'desc' }
  })
}

export async function getLicitacoesStats(ano?: number) {
  const year = ano || new Date().getFullYear()
  const total = await prisma.licitacao.count({ where: { ano: year } })
  const porStatus = await prisma.licitacao.groupBy({
    by: ['status'],
    where: { ano: year },
    _count: true
  })
  return { total, porStatus }
}

// Contratos
export async function getContratos(ano?: number, status?: string) {
  const year = ano || new Date().getFullYear()
  const where: any = { ano: year }
  if (status) where.status = status
  return prisma.contrato.findMany({
    where,
    orderBy: { dataInicioVigencia: 'desc' }
  })
}

export async function getContratosStats() {
  const total = await prisma.contrato.count()
  const vigentes = await prisma.contrato.count({ where: { status: 'vigente' } })
  const encerrados = await prisma.contrato.count({ where: { status: 'encerrado' } })
  const valorTotal = await prisma.contrato.aggregate({
    _sum: { valorInicial: true }
  })
  return { total, vigentes, encerrados, valorTotal: valorTotal._sum.valorInicial || 0 }
}

// Servidores
export async function getServidores(anoReferencia?: number) {
  const year = anoReferencia || new Date().getFullYear()
  return prisma.servidor.findMany({
    where: { anoReferencia: year },
    orderBy: { nome: 'asc' }
  })
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
export async function getConvenios(ano?: number, status?: string) {
  const year = ano || new Date().getFullYear()
  const where: any = { ano: year }
  if (status) where.status = status
  return prisma.convenio.findMany({
    where,
    orderBy: { dataInicioVigencia: 'desc' }
  })
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
