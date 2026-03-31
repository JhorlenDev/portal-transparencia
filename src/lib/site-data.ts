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
    create: { chave: key, valor, tipo }
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
