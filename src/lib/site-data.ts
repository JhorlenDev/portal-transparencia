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
export interface ReceitasFilters {
  exercicio?: number
  categoria?: string
  search?: string
}

export async function getReceitas(filters?: ReceitasFilters) {
  const year = filters?.exercicio || new Date().getFullYear()
  const where: any = { exercicio: year }
  
  if (filters?.categoria) {
    where.categoriaEconomica = filters.categoria
  }
  
  if (filters?.search) {
    where.OR = [
      { naturezaReceita: { contains: filters.search } },
      { codigoNatureza: { contains: filters.search } }
    ]
  }
  
  return prisma.receita.findMany({
    where,
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
export interface DespesasFilters {
  exercicio?: number
  categoria?: string
  search?: string
  status?: string
}

export async function getDespesas(filters?: DespesasFilters) {
  const year = filters?.exercicio || new Date().getFullYear()
  const where: any = { exercicio: year }
  
  if (filters?.categoria) {
    where.categoriaDespesa = filters.categoria
  }
  
  if (filters?.search) {
    where.OR = [
      { objeto: { contains: filters.search } },
      { credorNome: { contains: filters.search } },
      { numeroEmpenho: { contains: filters.search } }
    ]
  }
  
  return prisma.despesa.findMany({
    where,
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
export interface LicitacoesFilters {
  ano?: number
  status?: string
  search?: string
  modalidade?: string
}

export async function getLicitacoes(filters?: LicitacoesFilters) {
  const year = filters?.ano || new Date().getFullYear()
  const where: any = { ano: year }
  
  if (filters?.status) {
    where.status = filters.status
  }
  
  if (filters?.modalidade) {
    where.modalidade = filters.modalidade
  }
  
  if (filters?.search) {
    where.OR = [
      { objeto: { contains: filters.search } },
      { numero: { contains: filters.search } }
    ]
  }
  
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
export interface ContratosFilters {
  ano?: number
  status?: string
  search?: string
  tipo?: string
}

export async function getContratos(filters?: ContratosFilters) {
  const year = filters?.ano || new Date().getFullYear()
  const where: any = { ano: year }
  
  if (filters?.status) {
    where.status = filters.status
  }
  
  if (filters?.tipo) {
    where.tipoContrato = filters.tipo
  }
  
  if (filters?.search) {
    where.OR = [
      { objeto: { contains: filters.search } },
      { contratadoNome: { contains: filters.search } },
      { numero: { contains: filters.search } }
    ]
  }
  
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
export interface ServidoresFilters {
  anoReferencia?: number
  vinculo?: string
  search?: string
  lotacao?: string
}

export async function getServidores(filters?: ServidoresFilters) {
  const year = filters?.anoReferencia || new Date().getFullYear()
  const where: any = { anoReferencia: year }
  
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
  
  return prisma.servidor.findMany({
    where,
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
export interface ConveniosFilters {
  ano?: number
  status?: string
  search?: string
  tipo?: string
}

export async function getConvenios(filters?: ConveniosFilters) {
  const year = filters?.ano || new Date().getFullYear()
  const where: any = { ano: year }
  
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
