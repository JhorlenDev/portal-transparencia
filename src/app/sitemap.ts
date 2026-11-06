import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://transparencia.tefe.am.gov.br'

  const routes = [
    '',
    '/despesas',
    '/receitas',
    '/licitacoes',
    '/contratos',
    '/servidores',
    '/convenios',
    '/diarias',
    '/transferencias',
    '/esic',
    '/dados-abertos',
    '/acessibilidade',
    '/privacidade',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }))
}
